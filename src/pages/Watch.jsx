import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import AdBanner from "../components/AdBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import MovieRow from "../components/MovieRow";
import VideoPlayer from "../components/VideoPlayer";
import { getDetailsByType, getSimilarByType, getTVSeasons, getTVEpisodes } from "../lib/tmdb";

function Watch() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mediaType = searchParams.get("type") === "tv" ? "tv" : "movie";

  const [movie, setMovie] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  useEffect(() => {
    const loadWatchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [details, similarItems] = await Promise.all([
          getDetailsByType(id, mediaType),
          getSimilarByType(id, mediaType),
        ]);
        setMovie(details);
        setSimilar(similarItems.map((item) => ({ ...item, media_type: mediaType })));

        if (mediaType === "tv") {
          const tvSeasons = await getTVSeasons(id);
          const filtered = tvSeasons.filter((s) => s.season_number > 0);
          setSeasons(filtered);
          if (filtered.length > 0) {
            setEpisodesLoading(true);
            try {
              const eps = await getTVEpisodes(id, filtered[0].season_number);
              setEpisodes(eps);
              setSelectedSeason(filtered[0].season_number);
              setSelectedEpisode(1);
            } finally {
              setEpisodesLoading(false);
            }
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };
    loadWatchData();
  }, [id, mediaType]);

  const handleSeasonChange = async (seasonNumber) => {
    try {
      setError(null);
      setEpisodesLoading(true);
      setSelectedSeason(Number(seasonNumber));
      setSelectedEpisode(1);
      const eps = await getTVEpisodes(id, seasonNumber);
      setEpisodes(eps);
    } catch (err) {
      setError(err.message || "Failed to load episodes for this season.");
    } finally {
      setEpisodesLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="px-4 py-16 text-center text-red-400">{error}</p>;
  if (!movie) return <p className="px-4 py-16 text-center text-gray-400">Not found.</p>;

  const title = movie.title || movie.name || "Untitled";
  const releaseDate = movie.release_date || movie.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "N/A";
  const runtime = mediaType === "tv"
    ? movie.episode_run_time?.[0] || "N/A"
    : movie.runtime || "N/A";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <AdBanner size="leaderboard" />

      <div className="mt-8">
        <VideoPlayer
          tmdbId={id}
          mediaType={mediaType}
          season={selectedSeason}
          episode={selectedEpisode}
        />
      </div>

      {/* Season & Episode selector — only for TV */}
      {mediaType === "tv" && seasons.length > 0 && (
        <div className="mt-6 rounded-xl bg-[#141414] p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Episodes</h2>

          {/* Season selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            {seasons.map((season) => (
              <button
                key={season.season_number}
                onClick={() => handleSeasonChange(season.season_number)}
                disabled={episodesLoading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                  selectedSeason === season.season_number
                    ? "bg-red-600 text-white"
                    : "bg-[#222] text-gray-400 hover:bg-[#333] hover:text-white"
                }`}
              >
                Season {season.season_number}
              </button>
            ))}
          </div>

          {episodesLoading && (
            <p className="mb-4 text-sm text-gray-400">Loading episodes...</p>
          )}

          {/* Episode selector */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {episodes.map((ep) => (
              <button
                key={ep.episode_number}
                onClick={() => setSelectedEpisode(ep.episode_number)}
                disabled={episodesLoading}
                className={`rounded-lg px-3 py-3 text-left text-sm transition-all cursor-pointer ${
                  selectedEpisode === ep.episode_number
                    ? "bg-red-600 text-white"
                    : "bg-[#222] text-gray-400 hover:bg-[#333] hover:text-white"
                } ${episodesLoading ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="font-semibold">E{ep.episode_number}</div>
                <div className="mt-1 truncate text-xs opacity-75">{ep.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="brand-font mb-3 text-4xl font-black">{title}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span>{year}</span>
            <span>{runtime} min</span>
            <span className="rounded-md bg-yellow-500 px-2 py-1 font-bold text-black">
              {movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
            </span>
            {mediaType === "tv" && (
              <span className="rounded-md bg-blue-600 px-2 py-1 font-bold text-white text-xs">
                TV Series
              </span>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(movie.genres || []).map((genre) => (
              <span key={genre.id} className="rounded-full bg-[#141414] px-3 py-1 text-sm text-gray-300">
                {genre.name}
              </span>
            ))}
          </div>

          <p className="leading-7 text-gray-300">{movie.overview || "No description available."}</p>
        </div>

        <div className="hidden lg:block">
          <AdBanner size="rectangle" />
        </div>
      </div>

      <div className="mt-12">
        <MovieRow title="You May Also Like" movies={similar} />
      </div>
    </div>
  );
}

export default Watch;
