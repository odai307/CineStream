import { useEffect, useRef, useState } from "react";

// once=true: flips to true the first time the element nears the viewport (lazy loading).
// once=false: tracks visibility continuously (pausing videos when scrolled away).
const useInView = ({ rootMargin = "300px", once = true, threshold = 0 } = {}) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, once, threshold]);

  return [ref, inView];
};

export default useInView;
