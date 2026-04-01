import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { getDetailsByType, getTVEpisodes, getTVSeasons } from "../lib/tmdb";
import { getEmbedUrl } from "../lib/vidsrc";

function WatchScreen({ route }) {
  const { id, mediaType = "movie", title: routeTitle } = route.params;

  const [details, setDetails] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const detailData = await getDetailsByType(id, mediaType);
        setDetails(detailData);

        if (mediaType === "tv") {
          const seasonList = await getTVSeasons(id);
          setSeasons(seasonList);

          if (seasonList.length > 0) {
            const firstSeason = seasonList[0].season_number;
            setSelectedSeason(firstSeason);
            setSelectedEpisode(1);
            const eps = await getTVEpisodes(id, firstSeason);
            setEpisodes(eps);
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load watch data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, mediaType]);

  const onSelectSeason = async (seasonNumber) => {
    try {
      setSelectedSeason(seasonNumber);
      setSelectedEpisode(1);
      const eps = await getTVEpisodes(id, seasonNumber);
      setEpisodes(eps);
    } catch (err) {
      setError(err.message || "Failed to load episodes");
    }
  };

  const embedUrl = useMemo(
    () => getEmbedUrl(id, mediaType, selectedSeason, selectedEpisode),
    [id, mediaType, selectedSeason, selectedEpisode]
  );

  const title = details?.title || details?.name || routeTitle || "Watch";

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.secondary}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.playerWrap}>
        <WebView
          source={{ uri: embedUrl }}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          style={styles.webview}
        />
      </View>

      {mediaType === "tv" && seasons.length > 0 && (
        <View style={styles.selectorBlock}>
          <Text style={styles.selectorHeading}>Seasons</Text>
          <View style={styles.chipsWrap}>
            {seasons.map((season) => (
              <Pressable
                key={season.id}
                onPress={() => onSelectSeason(season.season_number)}
                style={[
                  styles.chip,
                  selectedSeason === season.season_number && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedSeason === season.season_number && styles.chipTextActive,
                  ]}
                >
                  S{season.season_number}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.selectorHeading}>Episodes</Text>
          <View style={styles.chipsWrap}>
            {episodes.map((episode) => (
              <Pressable
                key={episode.id}
                onPress={() => setSelectedEpisode(episode.episode_number)}
                style={[
                  styles.chip,
                  selectedEpisode === episode.episode_number && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedEpisode === episode.episode_number && styles.chipTextActive,
                  ]}
                >
                  E{episode.episode_number}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
  playerWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#141414",
    height: 230,
  },
  webview: {
    backgroundColor: "#141414",
  },
  selectorBlock: {
    marginTop: 18,
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 12,
  },
  selectorHeading: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 6,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: "#dc2626",
  },
  chipText: {
    color: "#d1d5db",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  secondary: {
    color: "#9ca3af",
  },
  error: {
    color: "#f87171",
    textAlign: "center",
  },
});

export default WatchScreen;
