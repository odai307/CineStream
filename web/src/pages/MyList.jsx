import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TitleGrid from "../components/TitleGrid";
import { useLibrary } from "../context/LibraryContext";
import { PlusIcon } from "../components/ui/Icons";

const FILTERS = [
  ["all", "All"],
  ["movie", "Movies"],
  ["tv", "Series"],
];

function MyList() {
  const { myList } = useLibrary();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    document.title = "My List · CineStream";
  }, []);

  const items = filter === "all" ? myList : myList.filter((t) => t.media_type === filter);

  return (
    <div className="min-h-[70vh] gutter pt-24 md:pt-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-font text-3xl font-extrabold md:text-4xl">My List</h1>
          <p className="mt-2 text-white/60">
            {myList.length} title{myList.length === 1 ? "" : "s"} saved for later
          </p>
        </div>
        {myList.length > 0 && (
          <div className="inline-flex rounded-md bg-surface-2 p-1">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded px-3.5 py-1.5 text-sm font-semibold transition ${
                  filter === value ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {myList.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30">
            <PlusIcon className="h-7 w-7 text-white/60" />
          </span>
          <p className="brand-font text-xl font-bold">Your list is empty</p>
          <p className="mt-2 text-white/60">
            Tap the + on any title to save it here. Your list is stored in this browser.
          </p>
          <Link
            to="/"
            className="mt-6 rounded-md bg-white px-6 py-2.5 font-semibold text-black transition hover:bg-white/80"
          >
            Find something to watch
          </Link>
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-white/60">No {filter === "tv" ? "series" : "movies"} in your list yet.</p>
      ) : (
        <TitleGrid items={items} />
      )}
    </div>
  );
}

export default MyList;
