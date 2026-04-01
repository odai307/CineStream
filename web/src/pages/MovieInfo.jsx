import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import MovieRow from "../components/MovieRow";
import { getBackdropUrl, getMovieCredits, getMovieDetails, getMovieVideos, getPosterUrl, getSimilarMovies } from "../lib/tmdb";

function MovieInfo() {
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [credits, setCredits] = useState(null);
  const [videos, setVideos] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const [movieData, creditsData, videosData, similarData] = await Promise.all([
          getMovieDetails(id),
          getMovieCredits(id),
          getMovieVideos(id),
          getSimilarMovies(id),
        ]);
        setMovie(movieData);
        setCredits(creditsData);
        setVideos(videosData);
        setSimilar(similarData);
      } catch (err) {
        setError(err.message || "Failed to load movie info.");
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="px-4 py-16 text-center text-red-400">{error}</p>;
  if (!movie) return <p className="px-4 py-16 text-center text-gray-400">Movie not found.</p>;

  const trailer = videos.find((video) => video.type === "Trailer" && video.site === "YouTube");
  const director = credits?.crew?.find((person) => person.job === "Director");
  const topCast = credits?.cast?.slice(0, 6) || [];
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";

  return (
    <div className="pb-16">
      <section className="relative min-h-[420px] overflow-hidden">
        {movie.backdrop_path ? (
          <img
            src={getBackdropUrl(movie.backdrop_path)}
            alt={movie.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[#141414]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/65 to-black/50" />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-10 pt-28 sm:px-6 lg:flex-row lg:px-8">
          <div className="w-56 shrink-0 overflow-hidden rounded-xl bg-[#141414]">
            {movie.poster_path ? (
              <img src={getPosterUrl(movie.poster_path)} alt={movie.title} className="w-full" />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center text-gray-500">No Poster</div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="brand-font text-4xl font-black sm:text-5xl">{movie.title}</h1>
            {movie.tagline && <p className="mt-2 text-lg text-gray-300">{movie.tagline}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
              <span>{year}</span>
              <span>{movie.runtime || "N/A"} min</span>
              <span className="rounded-md bg-yellow-500 px-2 py-1 font-bold text-black">
                {movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(movie.genres || []).map((genre) => (
                <span key={genre.id} className="rounded-full bg-[#141414]/90 px-3 py-1 text-sm text-gray-200">
                  {genre.name}
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-3xl leading-7 text-gray-300">{movie.overview || "No description available."}</p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <p className="text-sm text-gray-200">
                Director: <span className="font-semibold">{director?.name || "Unknown"}</span>
              </p>
              <Link
                to={`/movie/${movie.id}`}
                className="rounded-md bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 transition-all duration-200"
              >
                Watch Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="brand-font mb-4 text-2xl font-extrabold">Top Cast</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {topCast.map((person) => (
            <div key={person.id} className="rounded-lg bg-[#141414] p-3 text-center">
              {person.profile_path ? (
                <img
                  src={getPosterUrl(person.profile_path)}
                  alt={person.name}
                  className="mx-auto mb-2 h-28 w-20 rounded-md object-cover"
                />
              ) : (
                <div className="mx-auto mb-2 h-28 w-20 rounded-md bg-[#222]" />
              )}
              <p className="text-sm font-semibold text-white">{person.name}</p>
              <p className="text-xs text-gray-400">{person.character}</p>
            </div>
          ))}
        </div>
      </section>

      {trailer && (
        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="brand-font mb-4 text-2xl font-extrabold">Official Trailer</h2>
          <div className="aspect-video overflow-hidden rounded-xl bg-[#141414] p-2">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}`}
              title="Official Trailer"
              className="h-full w-full rounded-lg border-0"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <MovieRow title="Similar Movies" movies={similar} />
      </section>
    </div>
  );
}

export default MovieInfo;
