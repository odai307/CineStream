import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Genre from "./pages/Genre";
import MovieInfo from "./pages/MovieInfo";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/movie/:id" element={<Watch />} />
          <Route path="/movie/:id/info" element={<MovieInfo />} />
          <Route path="/search" element={<Search />} />
          <Route path="/genre/:name" element={<Genre />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
