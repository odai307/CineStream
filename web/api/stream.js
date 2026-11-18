// Vercel Serverless Function (and Vite dev middleware) that resolves direct HLS
// video streams and segment lists by TMDB ID for both native playback and real video downloads.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const parseMasterVariants = (m3u8Text, baseOrigin = "https://vidsrc.buzz") => {
  const lines = m3u8Text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const variants = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXT-X-STREAM-INF:")) {
      const info = lines[i];
      const nextUrl = lines[i + 1];
      if (!nextUrl || nextUrl.startsWith("#")) continue;
      const resMatch = info.match(/RESOLUTION=\d+x(\d+)/i);
      const bwMatch = info.match(/BANDWIDTH=(\d+)/i);
      const height = resMatch ? Number(resMatch[1]) : 720;
      const bandwidth = bwMatch ? Number(bwMatch[1]) : 0;
      variants.push({
        height,
        label: `${height}p`,
        bandwidth,
        url: new URL(nextUrl, baseOrigin).href,
      });
      i += 1;
    }
  }
  return variants.sort((a, b) => b.height - a.height || b.bandwidth - a.bandwidth);
};

const parseMediaPlaylist = (m3u8Text, baseUrl = "https://vidsrc.buzz") => {
  const lines = m3u8Text.split(/\r?\n/);
  const segments = [];
  const normalizedLines = [];
  let totalDuration = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      const dur = parseFloat(line.slice(8).split(",")[0]);
      if (Number.isFinite(dur)) totalDuration += dur;
      normalizedLines.push(line);
    } else if (line.startsWith("#")) {
      // Rewrite any relative URI="..." attributes (e.g. #EXT-X-MAP or #EXT-X-KEY)
      const rewritten = line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${new URL(uri, baseUrl).href}"`);
      normalizedLines.push(rewritten);
    } else {
      const abs = new URL(line, baseUrl).href;
      segments.push(abs);
      normalizedLines.push(abs);
    }
  }

  return {
    m3u8: normalizedLines.join("\n"),
    segments,
    duration: Math.round(totalDuration),
  };
};

export async function resolveStream({ type = "movie", id, s = 1, e = 1, server = 0, quality }) {
  const mediaType = type === "tv" ? "tv" : "movie";
  const embedPath = mediaType === "tv" ? `tv/${id}/${s}/${e}` : `movie/${id}`;
  const embedUrl = `https://vidsrc.buzz/embed/${embedPath}`;

  const pageRes = await fetch(embedUrl, {
    headers: { "User-Agent": UA, Referer: "https://www.2embed.cc/" },
  });
  if (!pageRes.ok) {
    throw new Error(`Upstream embed returned ${pageRes.status}`);
  }
  const html = await pageRes.text();
  const qMatch = html.match(/var Q\s*=\s*(\{.*?\});\s*\n/);
  if (!qMatch) {
    throw new Error("Stream metadata not found on upstream page");
  }

  const Q = JSON.parse(qMatch[1]);
  const qs = `type=${Q.type}&id=${encodeURIComponent(Q.id)}&s=${Q.s}&e=${Q.e}&t=${encodeURIComponent(Q.t)}`;

  let rawServers = Q.ssr?.servers || [];
  if (!rawServers.length) {
    const srcRes = await fetch(`https://vidsrc.buzz/pl/api.php?a=sources&${qs}`, {
      headers: { "User-Agent": UA, Referer: embedUrl },
    });
    if (srcRes.ok) {
      const srcJson = await srcRes.json().catch(() => null);
      rawServers = srcJson?.servers || [];
    }
  }

  if (!rawServers.length) {
    throw new Error("No streaming servers available for this title yet");
  }

  // Prefer English or untagged (original language) servers before foreign dubs.
  const sortedServers = [...rawServers].sort((a, b) => {
    const score = (srv) => {
      if (!srv.lang) return 1;
      if (/english/i.test(srv.lang)) return 0;
      return 2;
    };
    return score(a) - score(b);
  });

  // Fetch subtitles in parallel (best-effort).
  const subsPromise = fetch(`https://vidsrc.buzz/pl/api.php?a=subs&${qs}`, {
    headers: { "User-Agent": UA, Referer: embedUrl },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) =>
      ((d && d.subs) || []).map((sub) => ({
        label: sub.label || sub.lang || "English",
        lang: sub.lang || "en",
        url: new URL(sub.url, "https://vidsrc.buzz/pl/").href,
      }))
    )
    .catch(() => []);

  const startIdx = Math.max(0, Math.min(Number(server) || 0, sortedServers.length - 1));
  const order = [
    ...sortedServers.slice(startIdx).map((srv, idx) => ({ srv, idx: startIdx + idx })),
    ...sortedServers.slice(0, startIdx).map((srv, idx) => ({ srv, idx })),
  ];

  let lastErr = "All stream servers failed";
  for (const { srv, idx } of order) {
    try {
      const playUrl = `https://vidsrc.buzz/pl/api.php?a=play&ref=${encodeURIComponent(srv.ref)}&t=${encodeURIComponent(Q.t)}`;
      const playRes = await fetch(playUrl, {
        headers: { "User-Agent": UA, Referer: embedUrl },
      });
      if (!playRes.ok) {
        lastErr = `${srv.name} returned ${playRes.status}`;
        continue;
      }
      const playJson = await playRes.json().catch(() => null);
      if (!playJson?.url) {
        lastErr = `${srv.name} returned no stream URL`;
        continue;
      }

      const masterUrl = new URL(playJson.url, "https://vidsrc.buzz").href;
      const m3u8Res = await fetch(masterUrl, {
        headers: { "User-Agent": UA, Referer: embedUrl },
      });
      if (!m3u8Res.ok) continue;
      const m3u8Text = await m3u8Res.text();
      if (!m3u8Text.includes("#EXTM3U")) continue;

      let qualities = [{ label: "720p HD", height: 720 }];
      let mediaM3u8 = m3u8Text;
      let mediaBaseUrl = masterUrl;

      if (m3u8Text.includes("#EXT-X-STREAM-INF")) {
        const variants = parseMasterVariants(m3u8Text, "https://vidsrc.buzz");
        if (!variants.length) continue;
        qualities = variants.map((v) => ({
          label: `${v.height}p ${v.height >= 1080 ? "Full HD" : "HD"}`,
          height: v.height,
        }));
        const picked =
          (quality && variants.find((v) => String(v.height) === String(quality).replace(/\D/g, ""))) ||
          variants[0];
        mediaBaseUrl = picked.url;
        const subRes = await fetch(picked.url, {
          headers: { "User-Agent": UA, Referer: embedUrl },
        });
        if (!subRes.ok) continue;
        mediaM3u8 = await subRes.text();
      }

      const parsed = parseMediaPlaylist(mediaM3u8, mediaBaseUrl);
      if (!parsed.segments.length) continue;

      const subtitles = await subsPromise;
      return {
        title: Q.title || "",
        activeServer: idx,
        serverName: srv.name,
        servers: sortedServers.map((sItem, i) => ({
          index: i,
          name: sItem.name,
          lang: sItem.lang || "Original",
        })),
        qualities,
        duration: parsed.duration,
        m3u8: parsed.m3u8,
        segments: parsed.segments,
        subtitles,
      };
    } catch (err) {
      lastErr = err.message || String(err);
    }
  }

  throw new Error(lastErr);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const proxyTarget = url.searchParams.get("proxy");

  // Optional CORS proxy for subtitles or segments if needed
  if (proxyTarget) {
    try {
      const upstream = await fetch(proxyTarget, {
        headers: { "User-Agent": UA, Referer: "https://vidsrc.buzz/" },
      });
      res.statusCode = upstream.status;
      const ct = upstream.headers.get("content-type");
      if (ct) res.setHeader("Content-Type", ct);
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    } catch (err) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  const type = url.searchParams.get("type") || "movie";
  const id = url.searchParams.get("id");
  const s = url.searchParams.get("s") || "1";
  const e = url.searchParams.get("e") || "1";
  const server = url.searchParams.get("server") || "0";
  const quality = url.searchParams.get("quality") || "";

  if (!id) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing id parameter" }));
    return;
  }

  try {
    const data = await resolveStream({ type, id, s, e, server, quality });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err.message || "Failed to resolve stream" }));
  }
}

