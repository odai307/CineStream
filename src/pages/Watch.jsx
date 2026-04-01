import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AdBanner from "../components/AdBanner";
import LoadingSpinner from "../components/LoadingSpinner";
import MovieRow from "../components/MovieRow";
import VideoPlayer from "../components/VideoPlayer";
import { getMovieDetails, getSimilarMovies } from "../lib/tmdb";
import { getEmbedUrl } from "../lib/vidsrc";

function Watch() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWatchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [details, similarMovies] = await Promise.all([
          getMovieDetails(id),
          getSimilarMovies(id),
        ]);
        setMovie(details);
        setSimilar(similarMovies);
      } catch (err) {
        setError(err.message || "Failed to load movie stream.");
      } finally {
        setLoading(false);
      }
    };

    loadWatchData();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="px-4 py-16 text-center text-red-400">{error}</p>;
  if (!movie) return <p className="px-4 py-16 text-center text-gray-400">Movie not found.</p>;

  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <AdBanner size="leaderboard" />

      <div className="mt-8">
        <VideoPlayer embedUrl={getEmbedUrl(id)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="brand-font mb-3 text-4xl font-black">{movie.title}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span>{year}</span>
            <span>{movie.runtime || "N/A"} min</span>
            <span className="rounded-md bg-yellow-500 px-2 py-1 font-bold text-black">
              {movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
            </span>
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
        <MovieRow title="Similar Movies" movies={similar} />
      </div>
    </div>
  );
}

export default Watch;
