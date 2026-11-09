import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Logo } from "./ui/Controls";
import ProfileMenu from "./ProfileMenu";
import SearchBox from "./SearchBox";
import { ChevronDownIcon } from "./ui/Icons";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/series", label: "Series" },
  { to: "/movies", label: "Movies" },
  { to: "/new", label: "New & Popular" },
  { to: "/my-list", label: "My List" },
  { to: "/browse", label: "Browse" },
];

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
