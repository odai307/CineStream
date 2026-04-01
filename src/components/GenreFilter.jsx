function GenreFilter({ genres, activeGenre, onSelect }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {genres.map((genre) => {
        const active = activeGenre === genre.id;
        return (
          <button
            key={genre.id}
            onClick={() => onSelect(genre.id)}
            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              active
                ? "bg-red-600 text-white"
                : "bg-[#141414] text-gray-400 hover:bg-red-600 hover:text-white"
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
}

export default GenreFilter;
