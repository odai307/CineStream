function AdBanner({ size = "leaderboard" }) {
  const dimensions =
    size === "rectangle"
      ? "w-[300px] h-[250px]"
      : "w-full max-w-[728px] h-[90px]";

  return (
    <div className={`mx-auto ${dimensions} bg-[#141414] border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-400 text-sm tracking-wide`}>
      Advertisement
    </div>
  );
}

export default AdBanner;
