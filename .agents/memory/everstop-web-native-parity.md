---
name: EverStop mobile web/native map parity
description: Why index.tsx and index.web.tsx are separate, manually-synced files instead of a shared component
---

The EverStop map screen has two separate implementations: `app/(tabs)/index.tsx` (native, Expo MapView + raster UrlTile) and `app/(tabs)/index.web.tsx` (web, mapboxgl WebGL with a Leaflet fallback via `onFallback`).

**Why:** the underlying map renderers are fundamentally different libraries (native MapView vs. mapboxgl/Leaflet DOM), so a single shared component isn't practical. This was already the case before route options, weigh stations, and POI waypoints were added.

**How to apply:** any new map feature (props, state, handlers, UI overlays) must be added to *both* files by hand to keep behavior in parity. There's no shared abstraction enforcing this — check both files whenever changing map behavior. Web-side popup buttons for the mapboxgl path use global `window.__everstop*` callbacks (since mapboxgl markers render outside React); the Leaflet fallback path uses normal React onClick handlers instead.

**Calling the app's own api-server from native:** `@workspace/api-client-react`'s generated hooks call relative URLs (e.g. `/api/...`). This resolves fine on web (relative to `window.location`), but native RN `fetch` has no origin to resolve against and throws. `app/_layout.tsx` now calls `setBaseUrl(https://${EXPO_PUBLIC_DOMAIN})` once at startup, and an `ApiAuthBridge` component (mounted inside `ClerkLoaded`) wires `setAuthTokenGetter` to Clerk's `useAuth().getToken` so authenticated writes carry a bearer token on both platforms. Any first-time use of a real (non-external) api-server endpoint from a native screen depends on this bridge already being mounted.
