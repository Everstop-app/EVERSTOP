---
name: Mapbox tile setup
description: How Mapbox is integrated for both native and web, and why mapbox-gl was rejected.
---

## Rule
Use Mapbox raster tile URLs with react-native-maps UrlTile (native) and Leaflet TileLayer (web). Do NOT use mapbox-gl JS or @rnmapbox/maps in this project.

**Why:**
- `mapbox-gl` requires WebGL which is not available in the Replit iframe preview — crashes with "Failed to initialize WebGL".
- `@rnmapbox/maps` pulls in `@turf/*` which causes a Metro file watcher ENOENT crash on temp files; also requires a native dev build (incompatible with Expo Go).
- Mapbox raster tile URLs work identically in both Leaflet and react-native-maps UrlTile, no native build needed.

**How to apply:**
- Token is exposed as `EXPO_PUBLIC_MAPBOX_TOKEN=$MAPBOX_ACCESS_TOKEN` in the `dev` script in `package.json`.
- Native: `MapLayer.tsx` — `mapboxUrl(style)` helper builds `api.mapbox.com/styles/v1/mapbox/{style}/tiles/256/{z}/{x}/{y}@2x?access_token=...`
- Web: `index.web.tsx` — same URL pattern passed to Leaflet `TileLayer url` prop.
- Styles: streets-v12 (light), dark-v11 (dark), satellite-streets-v12 (satellite).
