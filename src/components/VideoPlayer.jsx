function VideoPlayer({ embedUrl }) {
  return (
    <div className="w-full rounded-xl bg-[#141414] p-2">
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={embedUrl}
          title="Movie Player"
          className="h-full w-full border-0"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default VideoPlayer;
