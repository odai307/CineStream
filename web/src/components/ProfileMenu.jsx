import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";
import { ChevronDownIcon } from "./ui/Icons";

// Navbar account control: "Sign In" for guests, avatar menu for members.
function ProfileMenu() {
  const { enabled, user, loading, profiles, activeProfile, selectProfile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!enabled || loading) return <span className="h-8 w-8" aria-hidden />;

  if (!user) {
    return (
      <Link
        to="/login"
        className="whitespace-nowrap rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-on-brand transition hover:bg-brand-bright"
      >
        Sign In
      </Link>
    );
  }

  const others = profiles.filter((p) => p.id !== activeProfile?.id);

  const item = "flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white";

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => clearTimeout(closeTimer.current)}
      onMouseLeave={() => {
        closeTimer.current = setTimeout(() => setOpen(false), 250);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="group flex items-center gap-1.5"
      >
        <Avatar profile={activeProfile || { name: user.email, avatar: "slate" }} size="sm" />
        <ChevronDownIcon className={`hidden h-4 w-4 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-60 animate-fade-in overflow-hidden rounded-md border border-white/10 bg-ink/95 py-2 shadow-2xl backdrop-blur-md">
          {activeProfile && (
            <div className="flex items-center gap-3 border-b border-white/10 px-4 pb-3 pt-1">
              <Avatar profile={activeProfile} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{activeProfile.name}</p>
                <p className="truncate text-xs text-white/50">{user.email}</p>
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className="border-b border-white/10 py-1">
              <p className="px-4 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">Switch profile</p>
              {others.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    selectProfile(p.id);
                    setOpen(false);
                    navigate("/");
                  }}
                  className={item}
                >
                  <Avatar profile={p} size="xs" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="py-1">
            <Link to="/profiles#manage" onClick={() => setOpen(false)} className={item}>
              Manage Profiles
            </Link>
            <Link to="/account" onClick={() => setOpen(false)} className={item}>
              Account
            </Link>
          </div>
          <div className="border-t border-white/10 pt-1">
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate("/");
              }}
              className={`${item} justify-center`}
            >
              Sign out of CineStream
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
