# CineStream

A streaming-style app for browsing movies and series with live data from TMDB.

- **web/**: React + Vite + Tailwind (deployed on Vercel): https://cine-stream-rose.vercel.app/
- **mobile/**: React Native + Expo (iOS / Android)
- **packages/core/**: shared, platform-agnostic logic used by both apps (TMDB client, stream sources, formatting helpers). Zero dependencies; uses `fetch`.

The UI layers are separate because the web renders HTML/CSS and React Native renders native views. Everything that isn't UI lives in `packages/core`, so an API fix only has to be made once.

## Getting started

```bash
# 1. API key (get one free at https://www.themoviedb.org/settings/api)
cp .env.example .env                 # web reads TMDB_KEY from the repo-root .env
cp mobile/.env.example mobile/.env   # mobile reads EXPO_PUBLIC_TMDB_KEY

# 2. Install both apps (each links packages/core via "file:../packages/core")
npm run install:all

# 3. Run
npm run dev       # web on http://localhost:5173
npm run mobile    # Expo dev server
```

## Web features

- Cinematic billboard that auto-plays the trailer (muted) behind the title logo, with mute/replay; pauses when scrolled away, when the tab is hidden, or when something else plays
- **Hover previews**: hover a title and the card expands to play its trailer, with Play / My List / Like / More Info
- Detail modal (shareable via `?title=<id>&type=movie|tv`) with trailer, episodes, "More Like This", cast and details
- Rows: Continue Watching, Top 10 Movies/Series, trending, genre collections, anime, K-dramas, coming soon
- Pages: Home, Series, Movies (with genre menu), New & Popular, Browse (format/genre/sort with infinite scroll), Genre, Search (live, with Top Searches), My List
- Watch page: server switcher, previous/next episode, episode list, resume from where you left off
- Press `/` anywhere to search

## Accounts (optional)

Everything works without an account. Guests' My List, likes and history are saved in the browser.
Signing in (Supabase Auth, email + password) adds:

- Up to 5 profiles per account with a "Who's watching?" picker; each profile has its own list, likes, history and recommendations
- Sync across devices; guest data is merged into the chosen profile on sign-in
- "Top Picks for You" and "Because you watched X" rows
- Account page: change/reset password, sign out, delete account

Setup: create a Supabase project, put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the publishable key) in the root `.env`,
then run [`supabase/migrations/20261109000000_profiles_and_library.sql`](supabase/migrations/20261109000000_profiles_and_library.sql) in the SQL Editor.
Row Level Security limits every user to their own data. Never put the secret/service_role key in `.env`; anything prefixed `VITE_` ships to the browser.

## Project structure

```text
CineStream/
├── packages/core/src/   tmdb.js · vidsrc.js · format.js
├── web/src/
│   ├── components/      Hero, Row, TitleCard, PreviewPopup, DetailModal, TrailerPlayer, …
│   ├── context/         LibraryContext (list/likes/history), MediaContext (mute/preview/modal)
│   ├── hooks/           useTitleDetails, useInView, useSearch
│   ├── lib/             tmdb.js (configures core), catalog.js (row fetchers), routes.js
│   └── pages/           Home, TypeHome, NewPopular, Catalog, Search, MyList, Watch, NotFound
└── mobile/src/          screens, navigation, lib/ (configures core)
```

Title data and images by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
