import { Link } from "react-router-dom";
import { getPosterUrl } from "../lib/tmdb";

function MovieCard({ movie }) {
  const synopsis = movie.overview ? movie.overview.slice(0, 100) : "No synopsis available.";

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group block w-full min-w-[180px] max-w-[220px] cursor-pointer transition-all duration-200 hover:scale-105"
    >
      <div className="relative overflow-hidden rounded-xl bg-[#141414]">
        {movie.poster_path ? (
          <img
            src={getPosterUrl(movie.poster_path)}
            alt={movie.title}
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div className="aspect-[2/3] w-full bg-[#222] flex items-center justify-center text-gray-500 text-sm px-4 text-center">
            Poster unavailable
          </div>
        )}

        <div className="absolute right-2 top-2 rounded-md bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
          {movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
        </div>

        <div className="absolute inset-0 flex flex-col justify-end bg-black/70 p-3 opacity-0 transition-all duration-200 group-hover:opacity-100">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="text-xs text-gray-200">{synopsis}</p>
        </div>
      </div>

      <h3 className="mt-3 truncate text-sm font-semibold text-white">{movie.title}</h3>
    </Link>
  );
}

export default MovieCard;
