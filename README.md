# CineStream

CineStream is a movie streaming-style web app built with React + Vite using live movie data from TMDB.

## Live Demo

https://cine-stream-rose.vercel.app/

## Tech Stack

- React (Vite)
- React Router v6
- Tailwind CSS
- Axios
- JavaScript (no TypeScript)

## Features

- Home page with hero banner and movie rows (Trending, Top Rated, New Releases, Popular)
- Browse page with genre filtering, sorting, and load more
- Watch page with embedded player and similar movies
- Movie info page with cast, director, trailer, and watch CTA
- Search page with URL-based query and debounced search
- Genre page with genre hero strip, sorting, and pagination
- Reusable ad placeholders for future AdSense integration

## Project Structure

```text
cinestream/
├── public/
├── src/
│   ├── pages/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env
├── .gitignore
├── README.md
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create/update your environment file:

```env
VITE_TMDB_KEY=your_tmdb_api_key_here
```

3. Start development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Important Note

A valid TMDB API key is required. If you see `401 Unauthorized`, your `VITE_TMDB_KEY` is missing or invalid.

## Routes

- `/` Home
- `/browse` Browse
- `/movie/:id` Watch
- `/movie/:id/info` Movie Info
- `/search?q=batman` Search
- `/genre/:name` Genre

## License

Personal/educational use unless you add your own license.
