import { useEffect } from "react";
import Hero from "./Hero";
import Row from "./Row";

// A Netflix-style page: featured billboard followed by lazily loaded rows.
// rows: [{ key, title, fetcher?, items?, variant?, to? }]
// header: optional bar pinned under the navbar on top of the billboard (e.g. genre picker).
function RowsPage({ heroFetcher, rows, header, docTitle }) {
  useEffect(() => {
    document.title = docTitle ? `${docTitle} · CineStream` : "CineStream";
  }, [docTitle]);

  return (
    <div className="relative pb-8">
      {header && <div className="absolute inset-x-0 top-16 z-30 md:top-[70px]">{header}</div>}
      {heroFetcher ? <Hero fetcher={heroFetcher} /> : <div className="h-24 md:h-28" />}
      <div className={`relative z-20 space-y-8 md:space-y-11 ${heroFetcher ? "-mt-10 md:-mt-[7vw]" : "mt-4"}`}>
        {rows.filter(Boolean).map(({ key, ...row }) => (
          <Row key={key || row.title} {...row} />
        ))}
      </div>
    </div>
  );
}

export default RowsPage;
