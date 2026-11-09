// Profile avatars: a gradient tile with the profile's initial. Keys match PROFILE_AVATARS in core.
export const AVATAR_STYLES = {
  crimson: "from-[#ff3d52] to-[#8f0f22]",
  ocean: "from-[#3b82f6] to-[#1e3a8a]",
  emerald: "from-[#34d399] to-[#065f46]",
  amber: "from-[#fbbf24] to-[#b45309]",
  violet: "from-[#a78bfa] to-[#5b21b6]",
  teal: "from-[#2dd4bf] to-[#115e59]",
  rose: "from-[#fb7185] to-[#9f1239]",
  slate: "from-[#94a3b8] to-[#334155]",
};

function Avatar({ profile, size = "md", className = "" }) {
  const sizes = {
    xs: "h-7 w-7 rounded text-sm",
    sm: "h-8 w-8 rounded-md text-base",
    md: "h-12 w-12 rounded-md text-xl",
    xl: "h-28 w-28 rounded-lg text-5xl sm:h-36 sm:w-36 sm:text-6xl",
  };
  const gradient = AVATAR_STYLES[profile?.avatar] || AVATAR_STYLES.crimson;
  const initial = (profile?.name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className={`brand-font inline-flex shrink-0 select-none items-center justify-center bg-gradient-to-br font-extrabold text-white/95 shadow-inner ${gradient} ${sizes[size]} ${className}`}
    >
      {initial}
    </span>
  );
}

export default Avatar;
