import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <p className="brand-font text-[7rem] font-extrabold leading-none text-white/10 md:text-[10rem]">404</p>
      <h1 className="brand-font -mt-6 text-3xl font-extrabold md:text-4xl">Lost your way?</h1>
      <p className="mt-3 max-w-md text-white/60">
        Sorry, we can’t find that page. You’ll find lots to explore on the home page.
      </p>
      <Link to="/" className="mt-8 rounded-md bg-white px-6 py-2.5 font-semibold text-black transition hover:bg-white/80">
        CineStream Home
      </Link>
    </div>
  );
}

export default NotFound;
