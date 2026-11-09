import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import RowsPage from "../components/RowsPage";
import { ChevronDownIcon } from "../components/ui/Icons";
import { useLibrary } from "../context/LibraryContext";
import { fetchers as f } from "../lib/catalog";
import { genrePath } from "../lib/routes";
import { getGenres } from "../lib/tmdb";

function GenreMenu({ mediaType, label }) {
  const [genres, setGenres] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    getGenres(mediaType).then(setGenres).catch(() => setGenres([]));
  }, [mediaType]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="flex items-center gap-6 gutter">
      <h1 className="brand-font text-2xl font-extrabold text-shadow md:text-4xl">{label}</h1>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-6 border border-white/70 bg-black/70 px-3 py-1 text-sm font-semibold transition hover:bg-white/10"
        >
          Genres <ChevronDownIcon className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-40 mt-1 grid w-[min(86vw,460px)] animate-fade-in grid-cols-2 gap-x-6 border border-white/15 bg-black/90 p-4 text-sm backdrop-blur-md sm:grid-cols-3">
            {genres.map((g) => (
              <Link key={g.id} to={genrePath(g, mediaType)} className="py-1 text-white/80 hover:text-white hover:underline">
                {g.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CONFIG = {
  movie: {
    label: "Movies",
    hero: f.trendingMoviesWeek,
    rows: [
      { title: "Trending Movies", fetcher: f.trendingMoviesWeek },
      { title: "Top 10 Movies Today", fetcher: f.trendingMoviesDay, variant: "top10" },
      { title: "In Theaters Now", fetcher: f.nowPlaying },
      { title: "Popular on CineStream", fetcher: f.popularMovies },
      { title: "Critically Acclaimed", fetcher: f.topRatedMovies },
      { title: "Action & Adventure", fetcher: f.action, to: "/genre/action?type=movie" },
      { title: "Comedies", fetcher: f.comedy, to: "/genre/comedy?type=movie" },
      { title: "Sci-Fi", fetcher: f.scifi, to: "/genre/science%20fiction?type=movie" },
      { title: "Thrillers", fetcher: f.thriller, to: "/genre/thriller?type=movie" },
      { title: "Romance", fetcher: f.romance, to: "/genre/romance?type=movie" },
      { title: "Animated Movies", fetcher: f.animationMovies, to: "/genre/animation?type=movie" },
      { title: "Family Night", fetcher: f.family, to: "/genre/family?type=movie" },
      { title: "Horror", fetcher: f.horror, to: "/genre/horror?type=movie" },
      { title: "Documentaries", fetcher: f.documentaries, to: "/genre/documentary?type=movie" },
    ],
  },
  tv: {
    label: "Series",
    hero: f.trendingTVWeek,
    rows: [
      { title: "Trending Series", fetcher: f.trendingTVWeek },
      { title: "Top 10 Series Today", fetcher: f.trendingTVDay, variant: "top10" },
      { title: "New Series", fetcher: f.newSeries },
      { title: "Popular Series", fetcher: f.popularTV },
      { title: "Binge-worthy", fetcher: f.bingeWorthy },
      { title: "Top Rated Series", fetcher: f.topRatedTV },
      { title: "Anime", fetcher: f.anime, to: "/genre/animation?type=tv" },
      { title: "Crime Series", fetcher: f.crimeTV, to: "/genre/crime?type=tv" },
      { title: "TV Dramas", fetcher: f.dramaTV, to: "/genre/drama?type=tv" },
      { title: "Sci-Fi & Fantasy", fetcher: f.scifiTV, to: "/genre/sci-fi%20%26%20fantasy?type=tv" },
      { title: "Korean Dramas", fetcher: f.kdrama },
      { title: "TV Comedies", fetcher: f.comedyTV, to: "/genre/comedy?type=tv" },
      { title: "Reality TV", fetcher: f.realityTV, to: "/genre/reality?type=tv" },
    ],
  },
};

// /movies and /series: billboard + genre picker + type-specific rows.
function TypeHome({ mediaType }) {
  const config = CONFIG[mediaType];
  const { history, myList } = useLibrary();
  const mine = (list) => list.filter((t) => t.media_type === mediaType);

  const rows = [
    mine(history).length > 0 && { key: "continue", title: "Continue Watching", items: mine(history), variant: "continue" },
    ...config.rows,
  ];
  rows.splice(4, 0, mine(myList).length > 0 && { key: "my-list", title: "My List", items: mine(myList), to: "/my-list" });

  return (
    <RowsPage
      key={mediaType}
      docTitle={config.label}
      heroFetcher={config.hero}
      header={<GenreMenu mediaType={mediaType} label={config.label} />}
      rows={rows}
    />
  );
}

export default TypeHome;
