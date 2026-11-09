import { useEffect, useState } from "react";
import { getFullDetails, getCertification, pickLogo, pickTrailer } from "../lib/tmdb";

// Full details (videos, logo, credits, similar…) in one cached TMDB request.
const useTitleDetails = (id, mediaType = "movie", enabled = true) => {
  const [state, setState] = useState({ details: null, loading: Boolean(enabled && id), error: null });

  useEffect(() => {
    if (!enabled || !id) return undefined;
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    getFullDetails(id, mediaType)
      .then((details) => alive && setState({ details, loading: false, error: null }))
      .catch((error) => alive && setState({ details: null, loading: false, error: error.message }));
    return () => {
      alive = false;
    };
  }, [id, mediaType, enabled]);

  const { details } = state;
  return {
    ...state,
    trailerKey: pickTrailer(details?.videos?.results)?.key || null,
    logoPath: pickLogo(details?.images)?.file_path || null,
    certification: getCertification(details),
  };
};

export default useTitleDetails;
