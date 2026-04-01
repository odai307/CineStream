import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getGenres } from "../lib/tmdb";
import SearchBar from "./SearchBar";
import LoadingSpinner from "./LoadingSpinner";

function Navbar() {
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresError, setGenresError] = useState(null);
  const [showGenres, setShowGenres] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setGenresLoading(true);
        setGenresError(null);
        const data = await getGenres();
        setGenres(data);
      } catch (err) {
        setGenresError(err.message || "Failed to load genres.");
      } finally {
        setGenresLoading(false);
      }
    };

    fetchGenres();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0a0a0f]/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="brand-font text-2xl font-black uppercase tracking-tight text-red-600">
          CineStream
        </Link>

        <div className="hidden flex-1 justify-center px-8 md:flex">
          <SearchBar />
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm text-gray-200 hover:text-red-500 transition-all duration-200">
            Home
          </Link>
          <Link to="/browse" className="text-sm text-gray-200 hover:text-red-500 transition-all duration-200">
            Browse
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowGenres((prev) => !prev)}
              className="text-sm text-gray-200 hover:text-red-500 transition-all duration-200"
            >
              Genres
            </button>

            {showGenres && (
              <div className="absolute right-0 mt-3 w-64 rounded-lg border border-gray-800 bg-[#141414] p-2 shadow-lg">
                {genresLoading && <LoadingSpinner />}
                {genresError && <p className="px-2 py-3 text-sm text-red-400">{genresError}</p>}
                {!genresLoading && !genresError && (
                  <div className="max-h-72 overflow-y-auto scrollbar-hide">
                    {genres.map((genre) => (
                      <Link
                        key={genre.id}
                        to={`/genre/${encodeURIComponent(genre.name.toLowerCase())}`}
                        onClick={() => setShowGenres(false)}
                        className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
                      >
                        {genre.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden rounded-md bg-[#141414] p-2 text-white"
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#111118] px-4 py-4 md:hidden">
          <div className="mb-4">
            <SearchBar className="max-w-none" />
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 hover:bg-[#141414]">
              Home
            </Link>
            <Link to="/browse" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 hover:bg-[#141414]">
              Browse
            </Link>
            {genresLoading && <LoadingSpinner />}
            {genresError && <p className="px-3 py-2 text-sm text-red-400">{genresError}</p>}
            {!genresLoading && !genresError && (
              <div className="max-h-56 overflow-y-auto scrollbar-hide">
                {genres.map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/genre/${encodeURIComponent(genre.name.toLowerCase())}`}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
