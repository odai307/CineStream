import RowsPage from "../components/RowsPage";
import { fetchers as f } from "../lib/catalog";

const rows = [
  { title: "New on CineStream", fetcher: f.nowPlaying },
  { title: "Top 10 Movies Today", fetcher: f.trendingMoviesDay, variant: "top10" },
  { title: "Fresh Series", fetcher: f.newSeries },
  { title: "Top 10 Series Today", fetcher: f.trendingTVDay, variant: "top10" },
  { title: "Airing Today", fetcher: f.airingToday },
  { title: "Worth the Wait: Coming Soon", fetcher: f.upcoming },
  { title: "Everyone’s Watching", fetcher: f.trendingAll },
];

function NewPopular() {
  return (
    <div>
      <div className="gutter pt-24 md:pt-28">
        <h1 className="brand-font text-3xl font-extrabold md:text-4xl">New &amp; Popular</h1>
        <p className="mt-2 text-white/60">What’s just landed, what’s blowing up, and what’s coming next.</p>
      </div>
      <div className="-mt-20 md:-mt-24">
        <RowsPage docTitle="New & Popular" rows={rows} />
      </div>
    </div>
  );
}

export default NewPopular;
