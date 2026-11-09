import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar, { AVATAR_STYLES } from "../components/ui/Avatar";
import { Logo } from "../components/ui/Controls";
import { CheckIcon, PlusIcon } from "../components/ui/Icons";
import { MAX_PROFILES } from "../lib/tmdb";

function ProfileEditor({ profile, onClose, canDelete }) {
  const { addProfile, editProfile, removeProfile } = useAuth();
  const toast = useToast();
  const isNew = !profile;
  const [name, setName] = useState(profile?.name || "");
  const [avatar, setAvatar] = useState(
    profile?.avatar || Object.keys(AVATAR_STYLES)[Math.floor(Math.random() * Object.keys(AVATAR_STYLES).length)]
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Please enter a name.");
    setBusy(true);
    setError(null);
    try {
      if (isNew) await addProfile({ name, avatar });
      else await editProfile(profile.id, { name: name.trim(), avatar });
      toast(isNew ? `Profile “${name.trim()}” created` : "Profile updated", { tone: "success" });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeProfile(profile.id);
      toast(`Profile “${profile.name}” deleted`);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "Add profile" : "Edit profile"}
        className="w-full max-w-lg animate-modal-in rounded-xl border border-white/10 bg-surface p-6 sm:p-8"
      >
        <h2 className="brand-font text-2xl font-extrabold">{isNew ? "Add Profile" : "Edit Profile"}</h2>
        <p className="mt-1 text-sm text-white/55">
          {isNew ? "Each profile gets its own list, likes, history and recommendations." : "Change the name or avatar."}
        </p>

        <div className="mt-6 flex items-center gap-5">
          <Avatar profile={{ name: name || "?", avatar }} size="xl" className="!h-24 !w-24 !text-5xl" />
          <label className="flex-1">
            <span className="mb-1.5 block text-sm font-medium text-white/70">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Name"
              className="w-full rounded-md border border-white/15 bg-black/40 px-4 py-3 text-white focus:border-white/70 focus:outline-none"
            />
          </label>
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-medium text-white/70">Avatar</legend>
          <div className="flex flex-wrap gap-2.5">
            {Object.keys(AVATAR_STYLES).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAvatar(key)}
                aria-label={`${key} avatar`}
                aria-pressed={avatar === key}
                className={`relative rounded-md transition ${avatar === key ? "ring-2 ring-white ring-offset-2 ring-offset-surface" : "opacity-70 hover:opacity-100"}`}
              >
                <Avatar profile={{ name: name || "?", avatar: key }} size="md" />
                {avatar === key && (
                  <CheckIcon className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-white p-0.5 text-black" />
                )}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-white px-6 py-2.5 font-bold text-black transition hover:bg-white/80 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="rounded-md border border-white/30 px-6 py-2.5 font-semibold transition hover:border-white">
            Cancel
          </button>
          {!isNew && canDelete && (
            confirmDelete ? (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="ml-auto rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold transition hover:bg-red-500"
              >
                Yes, delete {profile.name}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="ml-auto text-sm font-semibold text-red-300 hover:text-red-200 hover:underline"
              >
                Delete profile
              </button>
            )
          )}
        </div>
        {confirmDelete && (
          <p className="mt-3 text-xs text-white/50">This permanently deletes the profile’s list, likes and history.</p>
        )}
      </form>
    </div>
  );
}

// "Who's watching?" picker + profile management.
function Profiles() {
  const { enabled, user, loading, profiles, activeProfile, selectProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [managing, setManaging] = useState(location.hash === "#manage");
  const [editing, setEditing] = useState(null); // profile | "new" | null

  useEffect(() => {
    document.title = "Who’s watching? · CineStream";
  }, []);

  if (!enabled) return <Navigate to="/" replace />;
  if (!loading && !user) return <Navigate to="/login" state={{ from: "/profiles" }} replace />;

  const choose = (profile) => {
    if (managing) return setEditing(profile);
    selectProfile(profile.id);
    navigate(location.state?.from || "/", { replace: true });
  };

  return (
    <div className="relative min-h-screen">
      <div className="flex h-16 items-center gutter md:h-[70px]">
        <Link to="/" aria-label="CineStream home" className="text-xl md:text-2xl">
          <Logo />
        </Link>
      </div>

      <div className="flex flex-col items-center px-4 pb-20 pt-[8vh] text-center">
        <h1 className="brand-font animate-fade-in text-3xl font-extrabold sm:text-5xl">
          {managing ? "Manage Profiles" : "Who’s watching?"}
        </h1>

        {loading ? (
          <div className="mt-12 flex gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 w-28 rounded-lg skeleton sm:h-36 sm:w-36" />
            ))}
          </div>
        ) : (
          <ul className="mt-10 flex max-w-4xl flex-wrap justify-center gap-5 sm:mt-12 sm:gap-8">
            {profiles.map((profile, i) => (
              <li key={profile.id} className="animate-pop-in [--from-scale:0.85]" style={{ animationDelay: `${i * 60}ms` }}>
                <button type="button" onClick={() => choose(profile)} className="group flex w-28 flex-col items-center gap-3 sm:w-36">
                  <span className="relative">
                    <Avatar
                      profile={profile}
                      size="xl"
                      className={`ring-white transition duration-200 group-hover:ring-4 group-focus-visible:ring-4 ${
                        managing ? "opacity-60" : ""
                      } ${activeProfile?.id === profile.id && !managing ? "ring-2" : ""}`}
                    />
                    {managing && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-white/60 transition group-hover:text-white">{profile.name}</span>
                </button>
              </li>
            ))}
            {profiles.length < MAX_PROFILES && (
              <li>
                <button type="button" onClick={() => setEditing("new")} className="group flex w-28 flex-col items-center gap-3 sm:w-36">
                  <span className="flex h-28 w-28 items-center justify-center rounded-lg border-2 border-white/15 text-white/40 transition group-hover:border-white group-hover:bg-white/5 group-hover:text-white sm:h-36 sm:w-36">
                    <PlusIcon className="h-14 w-14" />
                  </span>
                  <span className="text-white/60 transition group-hover:text-white">Add Profile</span>
                </button>
              </li>
            )}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setManaging((m) => !m)}
          className={`mt-14 px-6 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${
            managing ? "bg-white text-black hover:bg-white/80" : "border border-white/40 text-white/60 hover:border-white hover:text-white"
          }`}
        >
          {managing ? "Done" : "Manage Profiles"}
        </button>
      </div>

      {editing && (
        <ProfileEditor
          profile={editing === "new" ? null : editing}
          canDelete={profiles.length > 1}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default Profiles;
