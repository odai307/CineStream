import { Link } from "react-router-dom";
import { Logo } from "./ui/Controls";

const columns = [
  [
    { to: "/", label: "Home" },
    { to: "/movies", label: "Movies" },
    { to: "/series", label: "Series" },
  ],
  [
    { to: "/new", label: "New & Popular" },
    { to: "/browse", label: "Browse All" },
    { to: "/my-list", label: "My List" },
  ],
  [
    { to: "/genre/animation?type=tv", label: "Anime & Animation" },
    { to: "/genre/documentary?type=movie", label: "Documentaries" },
    { to: "/genre/comedy?type=movie", label: "Comedies" },
  ],
];

function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.06] py-12 text-sm text-white/50 gutter">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-lg text-white/90">
          <Logo />
        </Link>
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
          {columns.map((col, i) => (
            <ul key={i} className="space-y-3">
              {col.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="transition hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <p className="mt-10 text-xs leading-relaxed text-white/40">
          Tip: press <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-sans text-[0.7rem] text-white/60">/</kbd> anywhere to search.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          Title data and images by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="mt-3 text-xs text-white/30">© {new Date().getFullYear()} CineStream</p>
      </div>
    </footer>
  );
}

export default Footer;
