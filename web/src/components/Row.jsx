import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMedia } from "../context/MediaContext";
import useInView from "../hooks/useInView";
import TitleCard, { ContinueCard } from "./TitleCard";
import { ChevronLeftIcon, ChevronRightIcon } from "./ui/Icons";

// Cards per visible "page" at each breakpoint.
const PER_PAGE = {
  landscape: "[--per:2] sm:[--per:3] md:[--per:4] lg:[--per:5] 2xl:[--per:6]",
  continue: "[--per:2] sm:[--per:3] md:[--per:4] lg:[--per:5] 2xl:[--per:6]",
  top10: "[--per:1.6] sm:[--per:2.6] md:[--per:3.5] lg:[--per:4.5] 2xl:[--per:5.5]",
};

export function RowSkeleton({ variant = "landscape" }) {
  return (
    <div className={`flex gap-2 overflow-hidden gutter ${PER_PAGE[variant]}`}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className={`shrink-0 rounded-md skeleton ${variant === "top10" ? "aspect-[1.45/1]" : "aspect-video"}`}
          style={{ width: "calc((100% - (var(--per) - 1) * 0.5rem) / var(--per))" }}
        />
      ))}
    </div>
  );
}

function Row({ title, fetcher, items: providedItems, variant = "landscape", to }) {
  const [sectionRef, inView] = useInView({ rootMargin: "600px" });
  const [fetched, setFetched] = useState(null);
  const [error, setError] = useState(null);
  const scrollerRef = useRef(null);
  const { closePreview } = useMedia();
  const [page, setPage] = useState({ index: 0, count: 1, atStart: true, atEnd: false });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!fetcher || !inView || fetched || error) return undefined;
    let alive = true;
    fetcher()
      .then((list) => alive && setFetched(list.filter((t) => t.backdrop_path || t.poster_path)))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [fetcher, inView, fetched, error, attempt]);

  const items = (providedItems || fetched || []).slice(0, variant === "top10" ? 10 : 20);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const count = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05));
    setPage({
      index: max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (count - 1)),
      count,
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft >= max - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);

  const scrollPage = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    closePreview();
    el.scrollBy({ left: direction * el.clientWidth * 0.94, behavior: "smooth" });
  };

  const loaded = Boolean(providedItems || fetched);
  if (loaded && items.length === 0) return null;

  // A failed row stays visible with a retry, so a slow connection never looks like "no results".
  if (error) {
    return (
      <section ref={sectionRef} className="gutter" aria-label={title}>
        <h2 className="brand-font mb-2 text-base font-bold text-white/95 sm:text-lg md:text-xl lg:text-[1.4rem]">{title}</h2>
        <div className="flex items-center gap-4 rounded-md border border-white/10 bg-surface px-4 py-6 text-sm text-white/60">
          Couldn’t load this row.
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAttempt((a) => a + 1);
            }}
            className="rounded-md bg-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="group/row relative" aria-label={title}>
      <div className="mb-2 flex items-end justify-between gutter md:mb-3">
        <h2 className="brand-font text-base font-bold text-white/95 sm:text-lg md:text-xl lg:text-[1.4rem]">
          {to ? (
            <Link to={to} className="group/title inline-flex items-baseline gap-2 hover:text-white">
              {title}
              <span className="inline-flex items-center text-xs font-semibold text-brand-bright opacity-0 transition-all duration-300 group-hover/title:opacity-100 -translate-x-2 group-hover/title:translate-x-0">
                Explore all <ChevronRightIcon className="h-3.5 w-3.5" />
              </span>
            </Link>
          ) : (
            title
          )}
        </h2>
        {page.count > 1 && (
          <div className="hidden gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 md:flex" aria-hidden>
            {Array.from({ length: page.count }).map((_, i) => (
              <span
                key={i}
                className={`h-0.5 w-3.5 rounded-full ${i === page.index ? "bg-white/90" : "bg-white/25"}`}
              />
            ))}
          </div>
        )}
      </div>

      {!loaded ? (
        <RowSkeleton variant={variant} />
      ) : (
        <div className="relative">
          <div
            ref={scrollerRef}
            onScroll={() => {
              measure();
              closePreview();
            }}
            className={`scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 gutter [scroll-padding-inline:max(16px,4vw)] ${PER_PAGE[variant]}`}
          >
            {items.map((item, index) => (
              <div
                key={`${item.media_type}-${item.id}`}
                className="shrink-0 snap-start"
                style={{ width: "calc((100% - (var(--per) - 1) * 0.5rem) / var(--per))" }}
              >
                {variant === "continue" ? (
                  <ContinueCard item={item} />
                ) : (
                  <TitleCard item={item} variant={variant} rank={index + 1} />
                )}
              </div>
            ))}
          </div>

          {!page.atStart && (
            <button
              type="button"
              onClick={() => scrollPage(-1)}
              aria-label={`Scroll ${title} left`}
              className="absolute inset-y-0 left-0 z-10 hidden w-[max(16px,4vw)] items-center justify-center bg-black/50 text-white opacity-0 transition hover:bg-black/70 group-hover/row:opacity-100 md:flex"
            >
              <ChevronLeftIcon className="h-8 w-8 transition-transform hover:scale-125" />
            </button>
          )}
          {!page.atEnd && (
            <button
              type="button"
              onClick={() => scrollPage(1)}
              aria-label={`Scroll ${title} right`}
              className="absolute inset-y-0 right-0 z-10 hidden w-[max(16px,4vw)] items-center justify-center bg-black/50 text-white opacity-0 transition hover:bg-black/70 group-hover/row:opacity-100 md:flex"
            >
              <ChevronRightIcon className="h-8 w-8 transition-transform hover:scale-125" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default Row;
