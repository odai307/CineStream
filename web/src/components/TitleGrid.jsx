import { useEffect } from "react";
import useInView from "../hooks/useInView";
import TitleCard from "./TitleCard";

const GRID = "grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6";

export function GridSkeleton({ count = 12 }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-video rounded-md skeleton" />
      ))}
    </div>
  );
}

// Responsive grid of landscape cards; calls onLoadMore when the end nears (infinite scroll).
function TitleGrid({ items, onLoadMore, hasMore = false, loadingMore = false }) {
  const [sentinelRef, nearEnd] = useInView({ once: false, rootMargin: "800px" });

  useEffect(() => {
    if (nearEnd && hasMore && !loadingMore) onLoadMore?.();
  }, [nearEnd, hasMore, loadingMore, onLoadMore]);

  return (
    <>
      <div className={GRID}>
        {items.map((item) => (
          <TitleCard key={`${item.media_type}-${item.id}`} item={item} />
        ))}
      </div>
      {loadingMore && (
        <div className="mt-6">
          <GridSkeleton count={6} />
        </div>
      )}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </>
  );
}

export default TitleGrid;
