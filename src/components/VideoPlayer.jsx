import { useEffect, useState } from "react";
import { getFallbackUrls } from "../lib/vidsrc";

function VideoPlayer({ tmdbId }) {
  const sources = getFallbackUrls(tmdbId);
  const [sourceIndex, setSourceIndex] = useState(0);

  const tryNext = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex(sourceIndex + 1);
    }
  };

  useEffect(() => {
    setSourceIndex(0);
  }, [tmdbId]);

  return (
    <div className="w-full rounded-xl bg-[#141414] p-2">
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          key={sourceIndex}
          src={sources[sourceIndex]}
          title="Movie Player"
          className="h-full w-full border-0"
          allowFullScreen
          allow="fullscreen *; autoplay *; encrypted-media *; picture-in-picture *; web-share *"
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          msallowfullscreen="true"
          referrerPolicy="no-referrer-when-downgrade"
          scrolling="no"
        />
      </div>

      {sourceIndex < sources.length - 1 && (
        <button
          onClick={tryNext}
          className="mt-3 w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all cursor-pointer"
        >
          Try Another Server
        </button>
      )}
    </div>
  );
}

export default VideoPlayer;
