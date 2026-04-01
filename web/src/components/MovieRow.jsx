import { useRef } from "react";
import MovieCard from "./MovieCard";

function MovieRow({ title, movies = [] }) {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({
      left: direction === "left" ? -500 : 500,
      behavior: "smooth",
    });
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="brand-font text-2xl font-extrabold text-white">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="rounded-full bg-[#141414] p-2 text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="rounded-full bg-[#141414] p-2 text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={rowRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}

export default MovieRow;
