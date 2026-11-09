import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PreviewPopup from "./components/PreviewPopup";
import DetailModal from "./components/DetailModal";
import Home from "./pages/Home";
import TypeHome from "./pages/TypeHome";
import NewPopular from "./pages/NewPopular";
import Catalog from "./pages/Catalog";
import Search from "./pages/Search";
import MyList from "./pages/MyList";
import Watch, { LegacyWatchRedirect } from "./pages/Watch";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Profiles from "./pages/Profiles";
import Account from "./pages/Account";
import { useAuth } from "./context/AuthContext";

// Pages that render without the navbar/footer chrome.
const BARE = ["/login", "/signup", "/profiles"];
const GATE_EXEMPT = ["/login", "/signup", "/profiles", "/account"];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Old /movie/:id/info links open the detail modal on the home page.
function LegacyInfoRedirect() {
  const { id } = useParams();
  return <Navigate to={`/?title=${id}&type=movie`} replace />;
}

function App() {
  const location = useLocation();
  const { pathname } = location;
  const { needsProfileChoice } = useAuth();
  const immersive = pathname.startsWith("/watch/") || BARE.includes(pathname);

  // Signed in with several profiles and none picked yet → "Who’s watching?" first.
  if (needsProfileChoice && !GATE_EXEMPT.includes(pathname)) {
    return <Navigate to="/profiles" state={{ from: pathname + location.search }} replace />;
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      <ScrollToTop />
      {!immersive && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<TypeHome mediaType="movie" />} />
          <Route path="/series" element={<TypeHome mediaType="tv" />} />
          <Route path="/new" element={<NewPopular />} />
          <Route path="/browse" element={<Catalog mode="browse" />} />
          <Route path="/genre/:name" element={<Catalog mode="genre" />} />
          <Route path="/search" element={<Search />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/watch/:type/:id" element={<Watch />} />
          <Route path="/login" element={<Auth mode="signin" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/account" element={<Account />} />
          <Route path="/movie/:id" element={<LegacyWatchRedirect />} />
          <Route path="/movie/:id/info" element={<LegacyInfoRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!immersive && <Footer />}
      <PreviewPopup />
      <DetailModal />
    </div>
  );
}

export default App;
