import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "./ui/Controls";
import ProfileMenu from "./ProfileMenu";
import { ChevronDownIcon, CloseIcon, SearchIcon } from "./ui/Icons";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/series", label: "Series" },
  { to: "/movies", label: "Movies" },
  { to: "/new", label: "New & Popular" },
  { to: "/my-list", label: "My List" },
  { to: "/browse", label: "Browse" },
];

function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const onSearchPage = location.pathname === "/search";
  const [open, setOpen] = useState(onSearchPage);
  const [value, setValue] = useState(onSearchPage ? params.get("q") || "" : "");
  const inputRef = useRef(null);
  const lastPath = useRef("/");

  useEffect(() => {
    if (!onSearchPage) {
      lastPath.current = location.pathname + location.search;
      setValue("");
    } else {
      setOpen(true);
    }
  }, [onSearchPage, location.pathname, location.search]);

  // "/" focuses search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live search: results update as you type.
  const update = (next) => {
    setValue(next);
    if (next.trim()) {
      navigate(`/search?q=${encodeURIComponent(next)}`, { replace: onSearchPage });
    } else if (onSearchPage) {
      navigate("/search", { replace: true });
    }
  };

  const clear = () => {
    setValue("");
    if (onSearchPage) navigate(lastPath.current || "/");
    setOpen(false);
  };

  return (
    <div
      className={`flex items-center overflow-hidden rounded-md border transition-all duration-300 ${
        open ? "w-[min(44vw,280px)] border-white/60 bg-black/75" : "w-10 border-transparent"
      }`}
    >
      <button
        type="button"
        aria-label="Search"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center text-white"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && clear()}
        onBlur={() => !value && setOpen(false)}
        placeholder="Titles, people, genres"
        aria-label="Search titles"
        tabIndex={open ? 0 : -1}
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
      />
      {open && value && (
        <button type="button" aria-label="Clear search" onClick={clear} className="px-2 text-white/70 hover:text-white">
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen]);

  const current = LINKS.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)));

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "bg-ink/95 shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex h-16 items-center gap-4 gutter md:h-[70px] lg:gap-10">
        <Link to="/" aria-label="CineStream home" className="shrink-0 text-xl md:text-2xl">
          <Logo />
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? "font-semibold text-white" : "text-white/75 hover:text-white/95"}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Compact menu */}
        <div className="relative lg:hidden" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            className="flex items-center gap-1 text-sm font-semibold"
          >
            {current?.label || "Browse"}
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>
          {menuOpen && (
            <div className="absolute left-1/2 top-full mt-4 w-56 -translate-x-1/2 animate-fade-in overflow-hidden rounded-md border border-white/10 bg-ink/95 py-2 shadow-2xl backdrop-blur-md">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `block px-5 py-2.5 text-center text-sm transition hover:bg-white/5 ${
                      isActive ? "font-semibold text-white" : "text-white/70"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <SearchBox />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
