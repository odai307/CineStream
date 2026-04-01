# CineStream Mobile (Expo)

This is the React Native mobile app workspace for CineStream.

## Prerequisites

- Node.js 18+
- Expo CLI (optional, `npx expo` also works)
- For iOS simulator: macOS + Xcode
- For Android emulator: Android Studio

## Setup

1. Install dependencies:

```bash
cd mobile
npm install
```

2. Create `.env` in `mobile/`:

```env
EXPO_PUBLIC_TMDB_KEY=your_tmdb_api_key_here
```

3. Start Expo:

```bash
npm run start
```

## Run Targets

- iOS:

```bash
npm run ios
```

- Android:

```bash
npm run android
```

- Web preview:

```bash
npm run web
```

## Current Screens

- Home (Trending + Popular movies)
- Search (movies, series, anime)
- Watch (movie playback + TV season/episode picker)

## Notes

- Playback uses external embeds and may vary by source availability.
- If TMDB key is missing/invalid, requests will fail with a clear error.
