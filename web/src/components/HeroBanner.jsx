import { Link } from "react-router-dom";
import { getBackdropUrl } from "../lib/tmdb";

function HeroBanner({ movie }) {
  if (!movie) return null;

  const genres = movie.genre_names || [];
  const shortOverview = movie.overview ? `${movie.overview.slice(0, 150)}${movie.overview.length > 150 ? "..." : ""}` : "No summary available.";

  return (
    <section className="relative h-[70vh] min-h-[460px] w-full overflow-hidden">
      {movie.backdrop_path ? (
        <img
          src={getBackdropUrl(movie.backdrop_path)}
          alt={movie.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[#141414]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-black/50" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
        <h1 className="brand-font mb-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">{movie.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-yellow-500 px-3 py-1 font-semibold text-black">
            {movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
          </span>
          {genres.slice(0, 4).map((genre) => (
            <span key={genre} className="rounded-full bg-[#141414]/80 px-3 py-1 text-gray-200">
              {genre}
            </span>
          ))}
        </div>

        <p className="mb-6 max-w-2xl text-gray-300">{shortOverview}</p>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/movie/${movie.id}`}
            className="rounded-md bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-500 transition-all duration-200"
          >
            Watch Now
          </Link>
          <Link
            to={`/movie/${movie.id}/info`}
            className="rounded-md bg-gray-700 px-6 py-3 text-sm font-bold text-white hover:bg-gray-600 transition-all duration-200"
          >
            More Info
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HeroBanner;
