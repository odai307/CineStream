import { useEffect, useState } from "react";
import { useLibrary } from "../context/LibraryContext";
import { buildPersonalRows } from "../lib/tmdb";

// "Top Picks for You" + "Because you watched X", from this profile's (or guest's) activity.
// Recomputed only when the seed titles change, not on every library update.
const usePersonalRows = () => {
  const { history, myList, syncing } = useLibrary();
  const [rows, setRows] = useState([]);

  const seedKey = [
    ...history.slice(0, 2).map((h) => `${h.media_type}-${h.id}`),
    `list:${myList.length}`,
    `hist:${history.length}`,
  ].join("|");

  useEffect(() => {
    if (syncing || (history.length === 0 && myList.length === 0)) {
      setRows([]);
      return undefined;
    }
    let alive = true;
    buildPersonalRows({ history, myList })
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey, syncing]);

  return rows;
};

export default usePersonalRows;
