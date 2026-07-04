import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import mapboxgl from "mapbox-gl";
import { MapContainer, TileLayer, Marker, Popup, Polyline as LeafletPolyline } from "react-leaflet";
import L from "leaflet";
import type { Map as LeafletMapInstance, LeafletMouseEvent } from "leaflet";
import { useQueryClient } from "@tanstack/react-query";
import { useListWeighStationStatuses, useSetWeighStationStatus, getListWeighStationStatusesQueryKey } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useLocations } from "@/contexts/LocationsContext";
import { SearchBar } from "@/components/SearchBar";
import type { Location } from "@/components/MapLayer";
import { fetchRoutes, type RouteData } from "@/utils/mapboxRouting";
import { fetchRouteHazards, type Hazard, type HazardType } from "@/utils/routeHazards";
import { startNativeNavigation, type NavStop } from "@/utils/nativeNavigation";
import { fetchWeighStationsAlongRoute, type WeighStation } from "@/utils/weighStations";
import { fetchPoisAlongRoute, POI_CATEGORIES, type Poi, type PoiCategory } from "@/utils/poiSearch";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
mapboxgl.accessToken = MAPBOX_TOKEN;

const STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12";
const STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const STYLE_SATELLITE = "mapbox://styles/mapbox/satellite-streets-v12";

const MAPBOX_RASTER_STREETS = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_RASTER_DARK = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
const MAPBOX_RASTER_SATELLITE = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;
const ATTRIBUTION = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const RATING_COLORS: Record<string, string> = {
  high: "#22C55E",
  medium: "#F59E0B",
  low: "#EF4444",
  none: "#7A8CA0",
};

function getPinColor(loc: Location): string {
  if (loc.categoryColor) return loc.categoryColor;
  const { rating, ratingCount } = loc;
  if (ratingCount === 0) return RATING_COLORS.none;
  if (rating >= 4.0) return RATING_COLORS.high;
  if (rating >= 3.0) return RATING_COLORS.medium;
  return RATING_COLORS.low;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const HAZARD_WEB_CFG: Record<HazardType, { bg: string; symbol: string; label: string }> = {
  bridge:       { bg: "#F59E0B", symbol: "⚠", label: "Low Clearance" },
  railroad:     { bg: "#7C3AED", symbol: "R",  label: "Railroad Hump" },
};

function makeHazardEl(type: HazardType): HTMLElement {
  const { bg, symbol } = HAZARD_WEB_CFG[type];
  const el = document.createElement("div");
  el.innerHTML = `<div style="width:28px;height:28px;background:${bg};border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.45);font-size:13px;font-weight:800;color:#fff;cursor:pointer;font-family:sans-serif">${symbol}</div>`;
  el.style.display = "block";
  return el;
}

function makePinEl(color: string, size = 14): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="${size}" height="${Math.round(size * 1.43)}" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="${color}"/><circle cx="7" cy="7" r="2.5" fill="#fff"/></svg>`;
  el.style.cursor = "pointer";
  el.style.display = "block";
  return el;
}

function makeWeighEl(status: "open" | "closed" | undefined): HTMLElement {
  const bg = status === "open" ? "#22C55E" : status === "closed" ? "#EF4444" : "#7A8CA0";
  const el = document.createElement("div");
  el.innerHTML = `<div style="width:26px;height:26px;background:${bg};border:2.5px solid #fff;border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.45);font-size:12px;font-weight:800;color:#fff;cursor:pointer;font-family:sans-serif">W</div>`;
  el.style.display = "block";
  return el;
}

function makePoiEl(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="20" height="28" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="#3D8DC4"/><circle cx="7" cy="7" r="2.5" fill="#fff"/></svg>`;
  el.style.cursor = "pointer";
  el.style.display = "block";
  return el;
}

function makeDroppedPinEl(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="#EF4444"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`;
  el.style.display = "block";
  return el;
}

type MapView = "default" | "satellite";

// ─── Full Mapbox GL JS map (WebGL path) ─────────────────────────────────────

export type MapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
};

type MapboxMapProps = {
  locations: Location[];
  isDark: boolean;
  mapView: MapView;
  droppingPin: boolean;
  droppedPin: { lat: number; lng: number } | null;
  routeData: RouteData | null;
  hazards: Hazard[];
  weighStations: WeighStation[];
  weighStationStatus: Record<string, "open" | "closed" | undefined>;
  pois: Poi[];
  onMapClick: (lat: number, lng: number) => void;
  onLocationNav: (id: string) => void;
  onDirections: (id: string, lat: number, lng: number) => void;
  onWeighStationToggle: (id: string, current: "open" | "closed" | undefined) => void;
  onPoiAdd: (id: string) => void;
  onFallback: () => void;
};

const MapboxMap = forwardRef<MapHandle, MapboxMapProps>(function MapboxMap({
  locations,
  isDark,
  mapView,
  droppingPin,
  droppedPin,
  routeData,
  hazards,
  weighStations,
  weighStationStatus,
  pois,
  onMapClick,
  onLocationNav,
  onDirections,
  onWeighStationToggle,
  onPoiAdd,
  onFallback,
}: MapboxMapProps, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const hazardMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const weighMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const poiMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const droppedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const droppingRef = useRef(droppingPin);
  droppingRef.current = droppingPin;
  const routeDataRef = useRef<RouteData | null>(null);
  routeDataRef.current = routeData;
  const onDirectionsRef = useRef(onDirections);
  onDirectionsRef.current = onDirections;
  const onLocationNavRef = useRef(onLocationNav);
  onLocationNavRef.current = onLocationNav;
  const onWeighStationToggleRef = useRef(onWeighStationToggle);
  onWeighStationToggleRef.current = onWeighStationToggle;
  const onPoiAddRef = useRef(onPoiAdd);
  onPoiAddRef.current = onPoiAdd;
  const weighStationStatusRef = useRef(weighStationStatus);
  weighStationStatusRef.current = weighStationStatus;

  const styleUrl = mapView === "satellite" ? STYLE_SATELLITE : isDark ? STYLE_DARK : STYLE_LIGHT;

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    (window as any).__everstopNav = (id: string) => onLocationNavRef.current(id);
    (window as any).__everstopDirections = (id: string, lat: number, lng: number) =>
      onDirectionsRef.current(id, lat, lng);
    (window as any).__everstopWeighToggle = (id: string) =>
      onWeighStationToggleRef.current(id, weighStationStatusRef.current[id]);
    (window as any).__everstopPoiAdd = (id: string) => onPoiAddRef.current(id);
    return () => {
      delete (window as any).__everstopNav;
      delete (window as any).__everstopDirections;
      delete (window as any).__everstopWeighToggle;
      delete (window as any).__everstopPoiAdd;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [-98.35, 39.5],
        zoom: 3.5,
        attributionControl: false,
      });
    } catch {
      onFallback();
      return;
    }
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("click", (e) => {
      if (!droppingRef.current) return;
      onMapClick(e.lngLat.lat, e.lngLat.lng);
    });
    map.on("error", () => { onFallback(); });

    const setupRouteLayer = () => {
      if (map.getSource("route")) return;
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#fff", "line-width": 8 },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3D8DC4", "line-width": 5 },
      });
    };

    map.on("style.load", () => {
      setupRouteLayer();
      const rd = routeDataRef.current;
      if (rd && rd.coords.length > 0) {
        const src = map.getSource("route") as mapboxgl.GeoJSONSource;
        if (src) {
          src.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: rd.coords },
          });
        }
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn({ duration: 250 }),
    zoomOut: () => mapRef.current?.zoomOut({ duration: 250 }),
    flyTo: (lat, lng, zoom = 12) => mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 600 }),
  }), []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = droppingPin ? "crosshair" : "";
  }, [droppingPin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setStyle(styleUrl);
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarkers = () => {
      locations.forEach((loc) => {
        const color = getPinColor(loc);
        const el = makePinEl(color);
        const safeId = escapeHtml(loc.id);
        const safeName = escapeHtml(loc.companyName);
        const safeCity = escapeHtml(loc.city);
        const safeState = escapeHtml(loc.state);
        const safeRating = loc.ratingCount > 0 ? escapeHtml(loc.rating.toFixed(1)) : "No ratings";
        const safeCount = loc.ratingCount > 0 ? escapeHtml(String(loc.ratingCount)) : "";
        const safeLat = Number(loc.latitude).toFixed(7);
        const safeLng = Number(loc.longitude).toFixed(7);

        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false, maxWidth: "230px" })
          .setHTML(`
            <div style="font-family:sans-serif;padding:4px 0">
              <div style="font-weight:700;font-size:14px;margin-bottom:2px">${safeName}</div>
              <div style="font-size:12px;color:#6b7280;margin-bottom:4px">${safeCity}, ${safeState}</div>
              <div style="font-size:12px;margin-bottom:10px">⭐ ${safeRating}${safeCount ? ` <span style="color:#9ca3af">(${safeCount})</span>` : ""}</div>
              <div style="display:flex;gap:6px">
                <button
                  onclick="window.__everstopNav('${safeId}')"
                  style="flex:1;background:#3D8DC4;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;cursor:pointer"
                >View Details</button>
                <button
                  onclick="window.__everstopDirections('${safeId}', ${safeLat}, ${safeLng})"
                  style="background:#fff;color:#3D8DC4;border:1.5px solid #3D8DC4;border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px"
                >&#9658; Route</button>
              </div>
            </div>
          `);
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      addMarkers();
    } else {
      map.once("styledata", addMarkers);
    }
  }, [locations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: routeData?.coords ?? [],
      },
    });
    if (routeData && routeData.coords.length > 1) {
      const lngs = routeData.coords.map(([lng]) => lng);
      const lats = routeData.coords.map(([, lat]) => lat);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, duration: 800 }
      );
    }
  }, [routeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (droppedMarkerRef.current) { droppedMarkerRef.current.remove(); droppedMarkerRef.current = null; }
    if (!droppedPin) return;
    const el = makeDroppedPinEl();
    droppedMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([droppedPin.lng, droppedPin.lat])
      .addTo(map);
  }, [droppedPin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    hazardMarkersRef.current.forEach((m) => m.remove());
    hazardMarkersRef.current = [];

    const addHazardMarkers = () => {
      hazards.forEach((h) => {
        const el = makeHazardEl(h.type);
        const cfg = HAZARD_WEB_CFG[h.type];
        const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: "200px" })
          .setHTML(`<div style="font-family:sans-serif;padding:4px 0"><div style="font-weight:700;font-size:13px;margin-bottom:2px;color:${cfg.bg}">${escapeHtml(h.label)}</div>${h.detail ? `<div style="font-size:11px;color:#6b7280">${escapeHtml(h.detail)}</div>` : ""}</div>`);
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([h.lng, h.lat])
          .setPopup(popup)
          .addTo(map);
        hazardMarkersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      addHazardMarkers();
    } else {
      map.once("styledata", addHazardMarkers);
    }
  }, [hazards]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    weighMarkersRef.current.forEach((m) => m.remove());
    weighMarkersRef.current = [];

    const addWeighMarkers = () => {
      weighStations.forEach((w) => {
        const status = weighStationStatus[w.id];
        const el = makeWeighEl(status);
        const safeId = escapeHtml(w.id);
        const statusLabel = status === "open" ? "Open" : status === "closed" ? "Closed" : "Status unknown";
        const statusColor = status === "open" ? "#22C55E" : status === "closed" ? "#EF4444" : "#7A8CA0";
        const popup = new mapboxgl.Popup({ offset: 16, closeButton: false, maxWidth: "210px" })
          .setHTML(`
            <div style="font-family:sans-serif;padding:4px 0">
              <div style="font-weight:700;font-size:13px;margin-bottom:2px">${escapeHtml(w.label)}</div>
              <div style="font-size:12px;margin-bottom:8px;color:${statusColor};font-weight:600">${statusLabel}</div>
              <button
                onclick="window.__everstopWeighToggle('${safeId}')"
                style="width:100%;background:#3D8DC4;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer"
              >Mark ${status === "open" ? "Closed" : "Open"}</button>
            </div>
          `);
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([w.lng, w.lat])
          .setPopup(popup)
          .addTo(map);
        weighMarkersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      addWeighMarkers();
    } else {
      map.once("styledata", addWeighMarkers);
    }
  }, [weighStations, weighStationStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];

    const addPoiMarkers = () => {
      pois.forEach((p) => {
        const el = makePoiEl();
        const safeId = escapeHtml(p.id);
        const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: "200px" })
          .setHTML(`
            <div style="font-family:sans-serif;padding:4px 0">
              <div style="font-weight:700;font-size:13px;margin-bottom:8px">${escapeHtml(p.label)}</div>
              <button
                onclick="window.__everstopPoiAdd('${safeId}')"
                style="width:100%;background:#3D8DC4;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:600;cursor:pointer"
              >Add as Stop</button>
            </div>
          `);
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([p.lng, p.lat])
          .setPopup(popup)
          .addTo(map);
        poiMarkersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      addPoiMarkers();
    } else {
      map.once("styledata", addPoiMarkers);
    }
  }, [pois]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
});

// ─── Leaflet fallback (no WebGL) ─────────────────────────────────────────────

type LeafletMapProps = {
  locations: Location[];
  isDark: boolean;
  mapView: MapView;
  droppingPin: boolean;
  droppedPin: { lat: number; lng: number } | null;
  routeData: RouteData | null;
  hazards: Hazard[];
  weighStations: WeighStation[];
  weighStationStatus: Record<string, "open" | "closed" | undefined>;
  pois: Poi[];
  onMapClick: (lat: number, lng: number) => void;
  onLocationNav: (id: string) => void;
  onDirections: (id: string, lat: number, lng: number) => void;
  onWeighStationToggle: (id: string, current: "open" | "closed" | undefined) => void;
  onPoiAdd: (id: string) => void;
};

const LeafletMap = forwardRef<MapHandle, LeafletMapProps>(function LeafletMap({
  locations,
  isDark,
  mapView,
  droppingPin,
  droppedPin,
  routeData,
  hazards,
  weighStations,
  weighStationStatus,
  pois,
  onMapClick,
  onLocationNav,
  onDirections,
  onWeighStationToggle,
  onPoiAdd,
}: LeafletMapProps, ref) {
  const mapRef = useRef<LeafletMapInstance | null>(null);

  useImperativeHandle(ref, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    flyTo: (lat, lng, zoom = 12) => mapRef.current?.flyTo([lat, lng], zoom, { duration: 0.6 }),
  }), []);

  const tileUrl = mapView === "satellite"
    ? MAPBOX_RASTER_SATELLITE
    : isDark ? MAPBOX_RASTER_DARK : MAPBOX_RASTER_STREETS;

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: LeafletMouseEvent) => { onMapClick(e.latlng.lat, e.latlng.lng); };
    if (droppingPin) { map.on("click", handler); map.getContainer().style.cursor = "crosshair"; }
    else { map.getContainer().style.cursor = ""; }
    return () => { map.off("click", handler); };
  }, [droppingPin, onMapClick]);

  const routePositions = routeData?.coords.map(([lng, lat]) => [lat, lng] as [number, number]) ?? [];

  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ width: "100%", height: "100%" }}
      ref={mapRef}
      zoomControl={false}
    >
      <TileLayer url={tileUrl} attribution={ATTRIBUTION} tileSize={256} />

      {routePositions.length > 1 && (
        <>
          <LeafletPolyline positions={routePositions} pathOptions={{ color: "#fff", weight: 8, opacity: 0.9 }} />
          <LeafletPolyline positions={routePositions} pathOptions={{ color: "#3D8DC4", weight: 5, opacity: 1 }} />
        </>
      )}

      {droppedPin && (
        <Marker
          position={[droppedPin.lat, droppedPin.lng]}
          icon={L.divIcon({
            html: `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22C24 5.373 18.627 0 12 0z" fill="#EF4444"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
            className: "", iconSize: [24, 34], iconAnchor: [12, 34],
          })}
        />
      )}

      {hazards.map((h) => {
        const cfg = HAZARD_WEB_CFG[h.type];
        return (
          <Marker
            key={`h-${h.id}`}
            position={[h.lat, h.lng]}
            icon={L.divIcon({
              html: `<div style="width:28px;height:28px;background:${cfg.bg};border:2.5px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.45);font-size:13px;font-weight:800;color:#fff;font-family:sans-serif">${cfg.symbol}</div>`,
              className: "", iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
            })}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", minWidth: 120 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: cfg.bg, marginBottom: 2 }}>{h.label}</div>
                {h.detail && <div style={{ fontSize: 11, color: "#6b7280" }}>{h.detail}</div>}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {weighStations.map((w) => {
        const status = weighStationStatus[w.id];
        const bg = status === "open" ? "#22C55E" : status === "closed" ? "#EF4444" : "#7A8CA0";
        return (
          <Marker
            key={`w-${w.id}`}
            position={[w.lat, w.lng]}
            icon={L.divIcon({
              html: `<div style="width:26px;height:26px;background:${bg};border:2.5px solid #fff;border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.45);font-size:12px;font-weight:800;color:#fff;font-family:sans-serif">W</div>`,
              className: "", iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13],
            })}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", minWidth: 150 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{w.label}</div>
                <div style={{ fontSize: 12, marginBottom: 8, color: bg, fontWeight: 600 }}>
                  {status === "open" ? "Open" : status === "closed" ? "Closed" : "Status unknown"}
                </div>
                <button
                  onClick={() => onWeighStationToggle(w.id, status)}
                  style={{ width: "100%", background: "#3D8DC4", color: "#fff", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Mark {status === "open" ? "Closed" : "Open"}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {pois.map((p) => (
        <Marker
          key={`p-${p.id}`}
          position={[p.lat, p.lng]}
          icon={L.divIcon({
            html: `<svg width="20" height="28" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="#3D8DC4"/><circle cx="7" cy="7" r="2.5" fill="#fff"/></svg>`,
            className: "", iconSize: [20, 28], iconAnchor: [10, 28], popupAnchor: [0, -28],
          })}
        >
          <Popup>
            <div style={{ fontFamily: "sans-serif", minWidth: 140 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{p.label}</div>
              <button
                onClick={() => onPoiAdd(p.id)}
                style={{ width: "100%", background: "#3D8DC4", color: "#fff", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Add as Stop
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
      {locations.map((loc) => {
        const color = getPinColor(loc);
        const icon = L.divIcon({
          html: `<svg width="14" height="20" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.134 0 0 3.134 0 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" fill="${color}"/><circle cx="7" cy="7" r="2.5" fill="#fff"/></svg>`,
          className: "", iconSize: [14, 20], iconAnchor: [7, 20], popupAnchor: [0, -20],
        });
        return (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={icon}>
            <Popup>
              <div style={{ minWidth: 160, fontFamily: "sans-serif" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{loc.companyName}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{loc.city}, {loc.state}</div>
                <div style={{ fontSize: 12, marginBottom: 10 }}>
                  ⭐ {loc.ratingCount > 0 ? loc.rating.toFixed(1) : "No ratings"}
                  {loc.ratingCount > 0 && <span style={{ color: "#9ca3af" }}> ({loc.ratingCount})</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => onLocationNav(loc.id)}
                    style={{ flex: 1, background: "#3D8DC4", color: "#fff", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onDirections(loc.id, loc.latitude, loc.longitude)}
                    style={{ background: "#fff", color: "#3D8DC4", border: "1.5px solid #3D8DC4", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    ▶ Route
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mapView, setMapView] = useState<MapView>("default");
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [droppingPin, setDroppingPin] = useState(false);
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { filteredLocations } = useLocations();
  const [query, setQuery] = useState("");
  const results = filteredLocations(query);
  const [useGL, setUseGL] = useState(() => {
    try { return mapboxgl.supported(); } catch { return false; }
  });

  const [routeOptions, setRouteOptions] = useState<RouteData[]>([]);
  const [routeHazardsByRoute, setRouteHazardsByRoute] = useState<Hazard[][]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeDestName, setRouteDestName] = useState<string | null>(null);
  const [routeDestCoord, setRouteDestCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [loadingHazards, setLoadingHazards] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);

  const [weighStationsByRoute, setWeighStationsByRoute] = useState<WeighStation[][]>([]);
  const [showPoiMenu, setShowPoiMenu] = useState(false);
  const [poiCategory, setPoiCategory] = useState<PoiCategory | null>(null);
  const [poiResults, setPoiResults] = useState<Poi[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);
  const [addedPois, setAddedPois] = useState<Poi[]>([]);
  const [waypoints, setWaypoints] = useState<NavStop[]>([]);

  const queryClient = useQueryClient();
  const { data: weighStationStatuses } = useListWeighStationStatuses();
  const setWeighStationStatusMutation = useSetWeighStationStatus();
  const weighStationStatusMap: Record<string, "open" | "closed" | undefined> = {};
  (weighStationStatuses ?? []).forEach((s) => { weighStationStatusMap[s.osmId] = s.status as "open" | "closed"; });

  const selectedRoute = routeOptions[selectedRouteIdx] ?? null;
  const selectedHazards = routeHazardsByRoute[selectedRouteIdx] ?? [];
  const selectedWeighStations = weighStationsByRoute[selectedRouteIdx] ?? [];

  const mapHandleRef = useRef<MapHandle>(null);

  const handleMapClick = (lat: number, lng: number) => {
    if (!droppingPin) return;
    setDroppedPin({ lat, lng });
    setDroppingPin(false);
  };

  const handleLocationNav = (id: string) => router.push(`/location/${id}`);

  const focusRoute = (route: RouteData) => {
    if (!route) return;
    const midIdx = Math.floor(route.coords.length / 2);
    const [midLng, midLat] = route.coords[midIdx];
    mapHandleRef.current?.flyTo(midLat, midLng, 7);
  };

  const handleDirections = (id: string, lat: number, lng: number) => {
    const loc = results.find((l) => l.id === id);
    setRouteDestName(loc?.companyName ?? null);
    setRouteDestCoord({ lat, lng });
    setIsLoadingRoute(true);
    setRouteOptions([]);
    setRouteHazardsByRoute([]);
    setWeighStationsByRoute([]);
    setSelectedRouteIdx(0);
    setWaypoints([]);
    setAddedPois([]);
    setLoadingHazards(false);

    if (!navigator.geolocation) {
      setIsLoadingRoute(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const routes = await fetchRoutes(pos.coords.latitude, pos.coords.longitude, lat, lng);
        setRouteOptions(routes);
        setIsLoadingRoute(false);
        if (routes[0]) focusRoute(routes[0]);
        if (routes.length > 0) {
          setLoadingHazards(true);
          Promise.all(routes.map((r) => fetchRouteHazards(r.coords))).then((all) => {
            setRouteHazardsByRoute(all);
            setLoadingHazards(false);
          });
          Promise.all(routes.map((r) => fetchWeighStationsAlongRoute(r.coords))).then((all) => {
            setWeighStationsByRoute(all);
          });
        }
      },
      () => { setIsLoadingRoute(false); },
      { timeout: 10000 }
    );
  };

  const toggleWeighStationStatus = (osmId: string, current: "open" | "closed" | undefined) => {
    const next = current === "open" ? "closed" : "open";
    setWeighStationStatusMutation.mutate(
      { osmId, data: { status: next } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWeighStationStatusesQueryKey() }) }
    );
  };

  const openPoiCategory = async (category: PoiCategory) => {
    if (!selectedRoute) return;
    setPoiCategory(category);
    setShowPoiMenu(false);
    setLoadingPois(true);
    setPoiResults([]);
    const pois = await fetchPoisAlongRoute(category, selectedRoute.coords);
    setPoiResults(pois);
    setLoadingPois(false);
  };

  const addPoiWaypoint = (poi: Poi) => {
    if (!routeDestCoord) return;
    const nextAdded = [...addedPois, poi];
    setAddedPois(nextAdded);
    setPoiCategory(null);
    setPoiResults([]);

    const nextWaypoints: NavStop[] = nextAdded.map((p) => ({ lat: p.lat, lng: p.lng, label: p.label }));
    setWaypoints(nextWaypoints);

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const wpCoords: [number, number][] = nextAdded.map((p) => [p.lng, p.lat]);
        const routes = await fetchRoutes(
          pos.coords.latitude, pos.coords.longitude,
          routeDestCoord.lat, routeDestCoord.lng, wpCoords
        );
        if (routes.length > 0) {
          setRouteOptions(routes);
          setSelectedRouteIdx(0);
          focusRoute(routes[0]);
          setLoadingHazards(true);
          Promise.all(routes.map((r) => fetchRouteHazards(r.coords))).then((all) => {
            setRouteHazardsByRoute(all);
            setLoadingHazards(false);
          });
          Promise.all(routes.map((r) => fetchWeighStationsAlongRoute(r.coords))).then((all) => {
            setWeighStationsByRoute(all);
          });
        }
      },
      () => {},
      { timeout: 10000 }
    );
  };

  const addPoiWaypointById = (id: string) => {
    const poi = poiResults.find((p) => p.id === id);
    if (poi) addPoiWaypoint(poi);
  };

  const selectRoute = (idx: number) => {
    setSelectedRouteIdx(idx);
    const route = routeOptions[idx];
    if (route) focusRoute(route);
  };

  const handleStartNavigation = () => {
    if (!routeDestCoord) return;
    startNativeNavigation({ lat: routeDestCoord.lat, lng: routeDestCoord.lng, label: routeDestName ?? undefined }, waypoints);
  };

  const clearRoute = () => {
    setRouteOptions([]);
    setRouteDestName(null);
    setRouteDestCoord(null);
    setRouteHazardsByRoute([]);
    setWeighStationsByRoute([]);
    setSelectedRouteIdx(0);
    setWaypoints([]);
    setAddedPois([]);
    setShowPoiMenu(false);
    setPoiCategory(null);
    setPoiResults([]);
    setLoadingHazards(false);
  };

  const zoomIn = () => mapHandleRef.current?.zoomIn();
  const zoomOut = () => mapHandleRef.current?.zoomOut();
  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapHandleRef.current?.flyTo(pos.coords.latitude, pos.coords.longitude, 12);
        setLocatingMe(false);
      },
      () => setLocatingMe(false),
      { timeout: 10000 }
    );
  };

  const WEB_TOP = 67;
  const BOTTOM_BASE = insets.bottom + 84 + 34;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={StyleSheet.absoluteFill}>
        {useGL ? (
          <MapboxMap
            ref={mapHandleRef}
            locations={results}
            isDark={isDark}
            mapView={mapView}
            droppingPin={droppingPin}
            droppedPin={droppedPin}
            routeData={selectedRoute}
            hazards={selectedHazards}
            weighStations={selectedWeighStations}
            weighStationStatus={weighStationStatusMap}
            pois={poiResults}
            onMapClick={handleMapClick}
            onLocationNav={handleLocationNav}
            onDirections={handleDirections}
            onWeighStationToggle={toggleWeighStationStatus}
            onPoiAdd={addPoiWaypointById}
            onFallback={() => setUseGL(false)}
          />
        ) : (
          <LeafletMap
            ref={mapHandleRef}
            locations={results}
            isDark={isDark}
            mapView={mapView}
            droppingPin={droppingPin}
            droppedPin={droppedPin}
            routeData={selectedRoute}
            hazards={selectedHazards}
            weighStations={selectedWeighStations}
            weighStationStatus={weighStationStatusMap}
            pois={poiResults}
            onMapClick={handleMapClick}
            onLocationNav={handleLocationNav}
            onDirections={handleDirections}
            onWeighStationToggle={toggleWeighStationStatus}
            onPoiAdd={addPoiWaypointById}
          />
        )}
      </View>

      {/* Zoom & locate controls */}
      <View style={[styles.mapControls, { bottom: BOTTOM_BASE + (routeOptions.length > 0 || isLoadingRoute ? 220 : 0) }]} pointerEvents="box-none">
        <View style={[styles.mapControlGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.mapControlBtn} onPress={zoomIn} activeOpacity={0.7}>
            <Ionicons name="add" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.mapControlDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.mapControlBtn} onPress={zoomOut} activeOpacity={0.7}>
            <Ionicons name="remove" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.mapControlGroup, styles.locateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={locateMe}
          activeOpacity={0.7}
        >
          <Ionicons name={locatingMe ? "sync" : "locate"} size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* POI waypoint button — visible during route review, ~1/3 down */}
      {routeOptions.length > 0 && !droppedPin && (
        <View style={styles.poiBtnWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.poiBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowPoiMenu((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
          {showPoiMenu && (
            <View style={[styles.poiMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {POI_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.poiMenuItem}
                  onPress={() => openPoiCategory(cat.key)}
                >
                  <Ionicons name={cat.icon as any} size={15} color={colors.foreground} />
                  <Text style={[styles.poiMenuItemText, { color: colors.foreground }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* POI results panel */}
      {poiCategory && (
        <View style={[styles.poiResultsCard, { backgroundColor: colors.card, borderColor: colors.border, top: insets.top + WEB_TOP + 90 }]}>
          <View style={styles.routeCardHeaderRow}>
            <Text style={[styles.routeCardDest, { color: colors.foreground }]} numberOfLines={1}>
              {POI_CATEGORIES.find((c) => c.key === poiCategory)?.label ?? "Results"}
            </Text>
            <TouchableOpacity onPress={() => { setPoiCategory(null); setPoiResults([]); }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {loadingPois ? (
            <Text style={[styles.routeCardText, { color: colors.mutedForeground, marginTop: 8 }]}>Searching nearby…</Text>
          ) : poiResults.length === 0 ? (
            <Text style={[styles.routeCardText, { color: colors.mutedForeground, marginTop: 8 }]}>Nothing found along this route</Text>
          ) : (
            <ScrollView style={styles.poiResultsList} showsVerticalScrollIndicator={false}>
              {poiResults.map((p) => (
                <TouchableOpacity key={p.id} style={styles.poiResultRow} onPress={() => addPoiWaypoint(p)} activeOpacity={0.8}>
                  <Ionicons name="pin" size={16} color={colors.primary} />
                  <Text style={[styles.poiResultText, { color: colors.foreground }]} numberOfLines={1}>{p.label}</Text>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Search & filter overlay */}
      <View
        style={[styles.overlay, { paddingTop: insets.top + WEB_TOP + 8 }]}
        pointerEvents="box-none"
      >
        <View pointerEvents="none">
          <Image
            source={require("@/assets/images/logo_transparent.png")}
            style={styles.logoImg}
            contentFit="contain"
          />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Search locations..." />
          </View>
          <View style={styles.layerBtnWrap}>
            <TouchableOpacity
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowLayerMenu((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name="layers" size={20} color={showLayerMenu ? colors.primary : colors.foreground} />
            </TouchableOpacity>
            {showLayerMenu && (
              <View style={[styles.layerMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.layerItem, mapView === "default" && { backgroundColor: colors.primary + "18" }]}
                  onPress={() => { setMapView("default"); setShowLayerMenu(false); }}
                >
                  <Ionicons name="map" size={15} color={mapView === "default" ? colors.primary : colors.foreground} />
                  <Text style={[styles.layerItemText, { color: mapView === "default" ? colors.primary : colors.foreground }]}>Default</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.layerItem, mapView === "satellite" && { backgroundColor: colors.primary + "18" }]}
                  onPress={() => { setMapView("satellite"); setShowLayerMenu(false); }}
                >
                  <Ionicons name="earth" size={15} color={mapView === "satellite" ? colors.primary : colors.foreground} />
                  <Text style={[styles.layerItemText, { color: mapView === "satellite" ? colors.primary : colors.foreground }]}>Satellite</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Drop pin banner */}
      {droppingPin && (
        <View style={[styles.dropBanner, { backgroundColor: colors.primary }]} pointerEvents="none">
          <Ionicons name="location" size={15} color="#fff" />
          <Text style={styles.dropBannerText}>Tap anywhere on the map to drop a pin</Text>
        </View>
      )}

      {/* Route options card */}
      {(isLoadingRoute || routeOptions.length > 0) && !droppedPin && (
        <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border, bottom: BOTTOM_BASE + 16 }]}>
          {isLoadingRoute ? (
            <View style={styles.routeCardRow}>
              <View style={[styles.routeIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="navigate-circle-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.routeCardText, { color: colors.mutedForeground }]}>Finding routes…</Text>
            </View>
          ) : routeOptions.length > 0 ? (
            <>
              <View style={styles.routeCardHeaderRow}>
                <Text style={[styles.routeCardDest, { color: colors.foreground }]} numberOfLines={1}>
                  {routeDestName}
                </Text>
                <TouchableOpacity onPress={clearRoute}>
                  <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {loadingHazards && (
                <Text style={[styles.hazardScanText, { color: colors.mutedForeground }]}>
                  Scanning routes for hazards…
                </Text>
              )}
              <View style={styles.routeOptionsList}>
                {routeOptions.map((opt, idx) => {
                  const hz = routeHazardsByRoute[idx] ?? [];
                  const bridges = hz.filter((h) => h.type === "bridge").length;
                  const rr = hz.filter((h) => h.type === "railroad").length;
                  const selected = idx === selectedRouteIdx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.routeOptionCard,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary + "12" : "transparent",
                        },
                      ]}
                      onPress={() => selectRoute(idx)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.routeOptionRadio, { borderColor: selected ? colors.primary : colors.border }]}>
                        {selected && <View style={[styles.routeOptionRadioDot, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.routeOptionMeta, { color: colors.foreground }]}>
                          {idx === 0 ? "Fastest · " : `Option ${idx + 1} · `}
                          {opt.durationMin} min · {opt.distanceMi.toFixed(1)} mi
                        </Text>
                        {!loadingHazards ? (
                          bridges > 0 || rr > 0 ? (
                            <View style={styles.hazardChipsRow}>
                              {bridges > 0 && (
                                <View style={[styles.hazardChip, { backgroundColor: "#F59E0B1A" }]}>
                                  <Text style={[styles.hazardChipSymbol, { color: "#F59E0B" }]}>⚠</Text>
                                  <Text style={[styles.hazardChipLabel, { color: "#F59E0B" }]}>{bridges} Low Bridge{bridges > 1 ? "s" : ""}</Text>
                                </View>
                              )}
                              {rr > 0 && (
                                <View style={[styles.hazardChip, { backgroundColor: "#7C3AED1A" }]}>
                                  <Text style={[styles.hazardChipSymbol, { color: "#7C3AED" }]}>R</Text>
                                  <Text style={[styles.hazardChipLabel, { color: "#7C3AED" }]}>{rr} RR Crossing{rr > 1 ? "s" : ""}</Text>
                                </View>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.routeOptionClear}>No known hazards</Text>
                          )
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.startNavBtn, { backgroundColor: colors.primary }]}
                onPress={handleStartNavigation}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.startNavBtnText}>Start Navigation</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}

      {/* Dropped pin card */}
      {droppedPin && (
        <View style={[styles.pinCard, { backgroundColor: colors.card, borderColor: colors.border, bottom: BOTTOM_BASE + 16 }]}>
          <View style={styles.pinCardHeader}>
            <Ionicons name="location" size={18} color="#EF4444" />
            <Text style={[styles.pinCardTitle, { color: colors.foreground }]}>Pin Dropped</Text>
            <TouchableOpacity onPress={() => setDroppedPin(null)}>
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.pinCardCoords, { color: colors.mutedForeground }]}>
            {droppedPin.lat.toFixed(5)}, {droppedPin.lng.toFixed(5)}
          </Text>
          <TouchableOpacity
            style={[styles.pinCardBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.push(`/add-location?prefill_lat=${droppedPin.lat}&prefill_lon=${droppedPin.lng}`);
              setDroppedPin(null);
            }}
          >
            <Ionicons name="business" size={15} color="#fff" />
            <Text style={styles.pinCardBtnText}>Add Business Here</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add / drop-pin FAB */}
      <View style={[styles.addBtnWrap, { bottom: BOTTOM_BASE }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            if (droppingPin) {
              setDroppingPin(false);
            } else {
              setDroppedPin(null);
              clearRoute();
              setDroppingPin(true);
            }
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.addBtnInner, droppingPin && { backgroundColor: "#EF4444" }]}>
            <Ionicons name={droppingPin ? "close" : "location"} size={26} color={droppingPin ? "#fff" : "#EF4444"} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  logoImg: { width: 150, height: 50 },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  searchWrap: { flex: 1 },
  layerBtnWrap: { position: "relative" },
  layerMenu: {
    position: "absolute", top: 48, right: 0, borderRadius: 12, borderWidth: 1,
    zIndex: 200, minWidth: 140, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 10, overflow: "hidden",
  },
  layerItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  layerItemText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  filterBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dropBanner: {
    position: "absolute", left: 16, right: 16, top: 130, borderRadius: 12,
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10,
  },
  dropBannerText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  routeCard: {
    position: "absolute", left: 16, right: 16, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8,
  },
  routeCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeCardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  routeCardDest: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  routeCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  routeCardText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  routeOptionsList: { maxHeight: 190, marginTop: 8 },
  routeOptionCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12,
    borderWidth: 1.5, padding: 10, marginBottom: 8,
  },
  routeOptionRadio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  routeOptionRadioDot: { width: 9, height: 9, borderRadius: 4.5 },
  routeOptionMeta: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  routeOptionClear: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#22C55E" },
  startNavBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 12, paddingVertical: 13, marginTop: 4,
  },
  startNavBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  mapControls: { position: "absolute", right: 16, gap: 10, alignItems: "center" },
  mapControlGroup: {
    borderRadius: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 6, overflow: "hidden",
  },
  mapControlBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  mapControlDivider: { height: 1, width: "100%" },
  locateBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  poiBtnWrap: { position: "absolute", right: 16, top: "33%" },
  poiBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 6,
  },
  poiMenu: {
    position: "absolute", top: 50, right: 0, borderRadius: 12, borderWidth: 1, minWidth: 170, paddingVertical: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10,
  },
  poiMenuItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  poiMenuItemText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  poiResultsCard: {
    position: "absolute", left: 16, right: 16, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8, maxHeight: 260,
  },
  poiResultsList: { marginTop: 8 },
  poiResultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  poiResultText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  pinCard: {
    position: "absolute", left: 16, right: 16, borderRadius: 16, borderWidth: 1, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
  },
  pinCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  pinCardCoords: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pinCardBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12 },
  pinCardBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hazardScanText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, fontStyle: "italic" },
  hazardChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  hazardChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  hazardChipSymbol: { fontSize: 11, fontWeight: "700" },
  hazardChipLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  addBtnWrap: { position: "absolute", right: 20 },
  addBtn: { alignItems: "center", justifyContent: "center" },
  addBtnInner: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", elevation: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
});
