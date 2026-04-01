function VideoPlayer({ embedUrl }) {
  return (
    <div className="w-full rounded-xl bg-[#141414] p-2">
      <div className="aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={embedUrl}
          title="Movie Player"
          className="h-full w-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        />
      </div>
    </div>
  );
}

export default VideoPlayer;