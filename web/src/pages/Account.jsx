import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar from "../components/ui/Avatar";

function Section({ title, children, tone }) {
  return (
    <section className={`rounded-xl border p-6 ${tone === "danger" ? "border-red-500/25 bg-red-500/[0.04]" : "border-white/10 bg-surface"}`}>
      <h2 className={`brand-font mb-4 text-lg font-bold ${tone === "danger" ? "text-red-200" : ""}`}>{title}</h2>
      {children}
    </section>
  );
}

function Account() {
  const { enabled, user, loading, profiles, activeProfile, recovering, signOut, updatePassword, deleteAccount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resetFlow = recovering || params.get("reset") === "1";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = "Account · CineStream";
  }, []);

  if (!enabled) return <Navigate to="/" replace />;
  if (loading) return <div className="min-h-screen" />;
  if (!user) return <Navigate to="/login" state={{ from: "/account" }} replace />;

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError(null);
    if (password.length < 8) return setPwError("Password must be at least 8 characters.");
    if (password !== confirm) return setPwError("Passwords don’t match.");
    setPwBusy(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      toast("Password updated", { tone: "success" });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwBusy(false);
    }
  };

  const removeAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast("Your account was deleted");
      navigate("/", { replace: true });
    } catch (err) {
      toast(err.message, { tone: "error" });
      setDeleting(false);
    }
  };

  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-20 pt-24 md:pt-28">
      <h1 className="brand-font text-3xl font-extrabold md:text-4xl">Account</h1>
      <p className="mt-2 text-white/55">Member since {memberSince}</p>

      <div className="mt-8 space-y-5">
        <Section title="Membership">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Email</dt>
              <dd className="truncate font-medium">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/55">Plan</dt>
              <dd className="font-medium">Free</dd>
            </div>
          </dl>
        </Section>

        <Section title="Profiles">
          <ul className="divide-y divide-white/10">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <Avatar profile={p} size="sm" />
                <span className="font-medium">{p.name}</span>
                {activeProfile?.id === p.id && (
                  <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/70">
                    Current
                  </span>
                )}
              </li>
            ))}
          </ul>
          <Link to="/profiles#manage" className="mt-3 inline-block text-sm font-semibold text-white/80 hover:text-white hover:underline">
            Manage profiles →
          </Link>
        </Section>

        <Section title={resetFlow ? "Set a new password" : "Change password"}>
          {resetFlow && <p className="mb-4 text-sm text-white/60">You followed a reset link. Choose a new password below.</p>}
          <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="New password (8+ characters)"
              className="rounded-md border border-white/15 bg-black/40 px-4 py-2.5 focus:border-white/70 focus:outline-none"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Confirm new password"
              className="rounded-md border border-white/15 bg-black/40 px-4 py-2.5 focus:border-white/70 focus:outline-none"
            />
            {pwError && <p className="text-sm text-red-300 sm:col-span-2">{pwError}</p>}
            <button
              type="submit"
              disabled={pwBusy || !password}
              className="justify-self-start rounded-md bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-white/80 disabled:opacity-50"
            >
              {pwBusy ? "Saving…" : "Update password"}
            </button>
          </form>
        </Section>

        <Section title="Sign out">
          <p className="mb-4 text-sm text-white/60">Signs you out on this device. Your profiles and lists stay saved.</p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate("/", { replace: true });
            }}
            className="rounded-md border border-white/30 px-5 py-2.5 text-sm font-semibold transition hover:border-white"
          >
            Sign out
          </button>
        </Section>

        <Section title="Delete account" tone="danger">
          <p className="mb-4 text-sm text-white/65">
            Permanently deletes your account, every profile, and all lists, likes and history. This can’t be undone.
          </p>
          <label className="block text-sm text-white/60">
            Type <span className="font-mono font-bold text-white">DELETE</span> to confirm
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="mt-2 block w-full max-w-xs rounded-md border border-red-500/30 bg-black/40 px-4 py-2.5 text-white focus:border-red-400 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={removeAccount}
            disabled={deleteText !== "DELETE" || deleting}
            className="mt-4 rounded-md bg-red-600 px-5 py-2.5 text-sm font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </Section>
      </div>
    </div>
  );
}

export default Account;
