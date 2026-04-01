import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SearchBar({ className = "" }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const submit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className={`relative flex w-full max-w-md items-center ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Search titles..."
        className="w-full rounded-full border border-gray-700 bg-[#141414] py-2 pl-10 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-red-600 focus:outline-none transition-all duration-200"
      />
      <button
        type="button"
        onClick={submit}
        aria-label="Search"
        className="absolute right-3 text-gray-400 hover:text-red-500 transition-all duration-200"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M10 2a8 8 0 1 1 4.906 14.32l4.387 4.387-1.414 1.414-4.387-4.387A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
        </svg>
      </button>
      <span className="absolute left-3 text-gray-500">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M10 2a8 8 0 1 1 4.906 14.32l4.387 4.387-1.414 1.414-4.387-4.387A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
        </svg>
      </span>
    </div>
  );
}

export default SearchBar;
