import RowsPage from "../components/RowsPage";
import { useLibrary } from "../context/LibraryContext";
import { fetchers as f } from "../lib/catalog";
import usePersonalRows from "../hooks/usePersonalRows";

function Home() {
  const { history, myList } = useLibrary();
  const personal = usePersonalRows();

  const rows = [
    history.length > 0 && { key: "continue", title: "Continue Watching", items: history, variant: "continue" },
    personal[0] && { ...personal[0] },
    { title: "Trending Now", fetcher: f.trendingAll },
    { title: "Top 10 Movies Today", fetcher: f.trendingMoviesDay, variant: "top10" },
    myList.length > 0 && { key: "my-list", title: "My List", items: myList, to: "/my-list" },
    { title: "New Releases", fetcher: f.nowPlaying, to: "/new" },
    personal[1] && { ...personal[1] },
    { title: "Top 10 Series Today", fetcher: f.trendingTVDay, variant: "top10" },
    personal[2] && { ...personal[2] },
    { title: "Popular Movies", fetcher: f.popularMovies, to: "/movies" },
    { title: "Binge-worthy Series", fetcher: f.bingeWorthy, to: "/series" },
    { title: "Critically Acclaimed Films", fetcher: f.topRatedMovies },
    { title: "Action & Adventure", fetcher: f.action, to: "/genre/action?type=movie" },
    { title: "Anime", fetcher: f.anime, to: "/genre/animation?type=tv" },
    { title: "Laugh-Out-Loud Comedies", fetcher: f.comedy, to: "/genre/comedy?type=movie" },
    { title: "Mind-Bending Sci-Fi", fetcher: f.scifi, to: "/genre/science%20fiction?type=movie" },
    { title: "Korean Dramas", fetcher: f.kdrama },
    { title: "Edge-of-Your-Seat Thrillers", fetcher: f.thriller, to: "/genre/thriller?type=movie" },
    { title: "Late-Night Horror", fetcher: f.horror, to: "/genre/horror?type=movie" },
    { title: "Award-Winning Documentaries", fetcher: f.documentaries, to: "/genre/documentary?type=movie" },
    { title: "Coming Soon", fetcher: f.upcoming },
  ];

  return <RowsPage heroFetcher={f.trendingAll} rows={rows} />;
}

export default Home;
