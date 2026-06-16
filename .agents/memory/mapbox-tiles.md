---
name: Mapbox tile setup
description: How Mapbox is integrated for both native and web, and why the Replit preview shows blank for the GL map.
---

## Rule
- **Web**: Full Mapbox GL JS SDK (`mapboxgl.Map`) with vector styles. Falls back to Leaflet + Mapbox raster tiles if GL fails.
- **Native**: Mapbox raster tile URLs via react-native-maps `UrlTile`. Works in Expo Go without a native build.
- Do NOT use `@rnmapbox/maps` in this project.

**Why:**
- `@rnmapbox/maps` pulls in `@turf/*` which causes a Metro file watcher ENOENT crash on temp files; also requires a native dev build incompatible with Expo Go.
- The full Mapbox GL JS SDK works in real browsers but the Replit preview uses a headless Chromium with no GPU/WebGL rendering — map shows white in the Replit preview screenshot tool. This is expected. On any real browser it renders correctly.
- `mapboxgl.supported()` returns `true` even in the headless env (the WebGL context is created), but tile rendering fails silently (no crash). The `onFallback` prop handles actual hard failures (constructor throw + 'error' event).

**How to apply:**
- Token: `EXPO_PUBLIC_MAPBOX_TOKEN=$MAPBOX_ACCESS_TOKEN` in the `dev` script in `package.json`.
- Native `MapLayer.tsx`: `mapboxUrl(style)` helper builds raster tile URL. Styles: streets-v12, dark-v11, satellite-streets-v12.
- Web `index.web.tsx`: `MapboxMap` component (GL SDK), `LeafletMap` component (raster fallback). `useGL` state in `MapScreen` switches between them.
- Mapbox GL CSS injected via DOM `<link>` tag in a `useEffect` (Metro cannot process CSS imports).
