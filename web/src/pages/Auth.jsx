import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBackdropUrl, getTrending } from "../lib/tmdb";
import { Logo } from "../components/ui/Controls";

const MIN_PASSWORD = 8;

function Field({ label, type = "text", value, onChange, autoComplete, children, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/70">{label}</span>
      <span className="relative block">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-md border border-white/15 bg-black/50 px-4 py-3 text-white placeholder:text-white/30 transition focus:border-white/70 focus:bg-black/70 focus:outline-none"
          {...props}
        />
        {children}
      </span>
    </label>
  );
}

// /login and /signup (mode), plus "forgot password".
function Auth({ mode: initialMode }) {
  const { enabled, user, signIn, signUp, sendPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(initialMode); // signin | signup | reset
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [backdrop, setBackdrop] = useState(null);

  const from = location.state?.from || "/";

  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    setError(null);
    setNotice(null);
    document.title = `${mode === "signup" ? "Create account" : mode === "reset" ? "Reset password" : "Sign in"} · CineStream`;
  }, [mode]);

  useEffect(() => {
    getTrending("all")
      .then((list) => {
        const pick = list.filter((t) => t.backdrop_path).slice(0, 8);
        setBackdrop(pick[Math.floor(Math.random() * pick.length)]?.backdrop_path || null);
      })
      .catch(() => {});
  }, []);

  if (!enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="max-w-md text-white/70">
          Accounts aren’t configured. Add <code className="text-white">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-white">VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>.
        </p>
      </div>
    );
  }

  if (user && !busy) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode !== "reset" && password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn({ email, password });
        navigate(from, { replace: true });
      } else if (mode === "signup") {
        const { needsConfirmation } = await signUp({ name: name || email.split("@")[0], email, password });
        if (needsConfirmation) {
          setNotice("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        } else {
          navigate(from, { replace: true });
        }
      } else {
        await sendPasswordReset(email);
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    signin: "Sign In",
    signup: "Create your account",
    reset: "Reset your password",
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {backdrop && (
        <img
          src={getBackdropUrl(backdrop)}
          alt=""
          className="absolute inset-0 h-full w-full animate-fade-in object-cover opacity-50"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/60 to-ink" />

      <div className="relative z-10 flex h-16 items-center gutter md:h-[70px]">
        <Link to="/" aria-label="CineStream home" className="text-xl md:text-2xl">
          <Logo />
        </Link>
      </div>

      <div className="relative z-10 flex justify-center px-4 pb-16 pt-6 sm:pt-12">
        <form
          onSubmit={submit}
          noValidate
          className="w-full max-w-[440px] animate-modal-in rounded-xl border border-white/10 bg-black/70 p-7 shadow-2xl backdrop-blur-xl sm:p-12"
        >
          <h1 className="brand-font mb-2 text-3xl font-extrabold">{titles[mode]}</h1>
          <p className="mb-7 text-sm text-white/60">
            {mode === "signup"
              ? "Sync your list, likes and history across devices, with up to 5 profiles."
              : mode === "reset"
              ? "Enter your account email and we’ll send you a reset link."
              : "Welcome back. Pick up right where you left off."}
          </p>

          <div className="space-y-4">
            {mode === "signup" && (
              <Field label="Your name" value={name} onChange={setName} autoComplete="name" maxLength={24} placeholder="e.g. Gabriel" />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
            {mode !== "reset" && (
              <Field
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={MIN_PASSWORD}
                placeholder={mode === "signup" ? `At least ${MIN_PASSWORD} characters` : ""}
              >
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </Field>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-100">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email || (mode !== "reset" && !password)}
            className="mt-6 w-full rounded-md bg-brand py-3 font-bold text-white transition hover:bg-brand-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign In" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>

          <div className="mt-5 flex flex-col gap-3 text-sm text-white/60">
            {mode === "signin" && (
              <>
                <button type="button" onClick={() => setMode("reset")} className="self-start hover:text-white hover:underline">
                  Forgot password?
                </button>
                <p>
                  New to CineStream?{" "}
                  <Link to="/signup" state={location.state} className="font-semibold text-white hover:underline">
                    Create an account
                  </Link>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <Link to="/login" state={location.state} className="font-semibold text-white hover:underline">
                  Sign in
                </Link>
              </p>
            )}
            {mode === "reset" && (
              <button type="button" onClick={() => setMode("signin")} className="self-start font-semibold text-white hover:underline">
                Back to sign in
              </button>
            )}
          </div>

          <div className="mt-7 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/45">
            An account is optional.{" "}
            <Link to="/" className="font-semibold text-white/80 hover:underline">
              Keep browsing as a guest
            </Link>
            . Anything you saved on this device is added to your profile when you sign in.
          </div>
        </form>
      </div>
    </div>
  );
}

export default Auth;
