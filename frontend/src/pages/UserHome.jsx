// src/pages/SuperUserHome.jsx
// Requires: mapbox-gl, @mapbox/mapbox-gl-geocoder, react-redux, lucide-react
// npm install mapbox-gl @mapbox/mapbox-gl-geocoder lucide-react

import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { fetchToiletsInBounds } from "../services/toiletService";
import Navbar from "../components/Navbar ";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const ERNAKULAM = { lat: 9.9816, lng: 76.2999 };

// ── Brand colors ────────────────────────────────────────────────────────────
const BRAND = "#10B57E";
const BRAND_LIGHT = "#e6f7f1";
const BRAND_DARK = "#0d9468";
const SURFACE = "#E8E8E8";
const WHITE = "#ffffff";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#6b7280";

// ── Lucide Toilet icon as an inline SVG string for Mapbox DOM markers ──────
const TOILET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 2h8a2 2 0 0 1 2 2v2a6 6 0 0 1-6 6 6 6 0 0 1-6-6V4a2 2 0 0 1 2-2Z"/>
  <path d="M4 8a6 6 0 0 0 5 5.92V16H7l-1 6h10l-1-6h-2v-2.08A6 6 0 0 0 18 8"/>
  <line x1="12" y1="2" x2="12" y2="4"/>
</svg>`;

// ── Star rating helper ─────────────────────────────────────────────────────
function Stars({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <span style={{ color: "#f59e0b", fontSize: "12px", letterSpacing: "1px" }}>
      {"★".repeat(Math.round(r))}{"☆".repeat(5 - Math.round(r))}
      <span style={{ color: TEXT_MUTED, marginLeft: 4, fontSize: 11 }}>
        {r > 0 ? r.toFixed(1) : "No ratings"}
      </span>
    </span>
  );
}

// ── Distance label ─────────────────────────────────────────────────────────
function DistanceBadge({ metres }) {
  if (metres == null) return null;
  const label = metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
  return (
    <span style={{
      background: BRAND_LIGHT,
      color: BRAND_DARK,
      fontSize: 11,
      padding: "3px 9px",
      borderRadius: 99,
      fontWeight: 700,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      {label} away
    </span>
  );
}

// ── Toilet card in sidebar ─────────────────────────────────────────────────
function ToiletCard({ toilet, isActive, onClick }) {
  const navigate = useNavigate();

  const features = [
    toilet.is_accessible && "Accessible",
    toilet.has_baby_changing && "Baby change",
    toilet.is_free && "Free",
    !toilet.is_free && toilet.fee && `₹${toilet.fee}`,
  ].filter(Boolean);

  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? BRAND_LIGHT : WHITE,
        border: `1.5px solid ${isActive ? BRAND : SURFACE}`,
        borderRadius: 14,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: isActive
          ? `0 4px 20px rgba(16,181,126,0.18)`
          : "0 1px 4px rgba(0,0,0,0.06)",
        marginBottom: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 14,
            color: TEXT_PRIMARY,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {toilet.name}
          </div>
          <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 2 }}>
            {toilet.address || toilet.city || ""}
          </div>
        </div>
        <DistanceBadge metres={toilet.distance_metres} />
      </div>

      {/* Rating */}
      <div style={{ marginTop: 8 }}>
        <Stars rating={toilet.avg_overall} />
        {toilet.review_count > 0 && (
          <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 4 }}>
            ({toilet.review_count} review{toilet.review_count !== 1 ? "s" : ""})
          </span>
        )}
      </div>

      {/* Feature chips */}
      {features.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {features.map((f) => (
            <span key={f} style={{
              background: SURFACE,
              color: "#374151",
              fontSize: 11,
              padding: "3px 9px",
              borderRadius: 99,
            }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Opening hours */}
      {toilet.opening_hours && (
        <div style={{ marginTop: 8, fontSize: 11, color: TEXT_MUTED }}>
          🕐 {toilet.opening_hours}
        </div>
      )}

      {/* Footer: View button */}
      <div
        style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => navigate(`/toilet/${toilet.id}`)}
          style={{
            background: BRAND,
            color: WHITE,
            border: "none",
            borderRadius: 9,
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            transition: "background 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = BRAND_DARK;
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = BRAND;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          View
        </button>
      </div>
    </div>
  );
}

// ── Popup HTML for Mapbox markers ─────────────────────────────────────────
function buildPopupHTML(toilet) {
  const dist =
    toilet.distance_metres != null
      ? toilet.distance_metres < 1000
        ? `${toilet.distance_metres} m`
        : `${(toilet.distance_metres / 1000).toFixed(1)} km`
      : "";

  const rating = parseFloat(toilet.avg_overall) || 0;
  const filled = Math.round(rating);
  const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
  const ratingLabel = rating > 0 ? rating.toFixed(1) : "No ratings";

  return `
    <div style="font-family:'DM Sans',sans-serif;min-width:200px;padding:4px">
      <div style="font-weight:700;font-size:14px;color:${TEXT_PRIMARY};margin-bottom:4px">${toilet.name}</div>
      ${toilet.address
      ? `<div style="color:${TEXT_MUTED};font-size:12px;margin-bottom:6px">${toilet.address}</div>`
      : ""}
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
        <span style="color:#f59e0b;font-size:13px;letter-spacing:1px">${stars}</span>
        <span style="color:${TEXT_MUTED};font-size:11px">${ratingLabel}</span>
      </div>
      ${dist
      ? `<div style="color:${BRAND_DARK};font-size:12px;font-weight:600;margin-top:4px"> ${dist} away</div>`
      : ""}
      ${toilet.is_free
      ? `<div style="color:${BRAND};font-size:12px;margin-top:4px"> Free to use</div>`
      : ""}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function UserHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const moveTimeoutRef = useRef(null);

  // Refs to hold geocoder containers so we can mount the same geocoder instance
  // into both the desktop sidebar and the mobile sheet header.
  const desktopGeocoderContainerRef = useRef(null);
  const mobileGeocoderContainerRef = useRef(null);
  const geocoderRef = useRef(null);

  const [toilets, setToilets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sheetState, setSheetState] = useState("peek");

  // ── Load toilets for current map bounds ──────────────────────────────────
  const loadToiletsForBounds = useCallback(async (mapInstance, userLoc) => {
    if (!mapInstance) return;
    const bounds = mapInstance.getBounds();
    setLoading(true);
    try {
      const params = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };
      if (userLoc) {
        params.lat = userLoc.lat;
        params.lng = userLoc.lng;
      }
      const res = await fetchToiletsInBounds(params);
      const data = res.data || [];
      setToilets(data);
      updateMarkers(mapInstance, data);
    } catch (err) {
      console.error("Failed to load toilets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Sync Mapbox markers with toilet data ─────────────────────────────────
  const updateMarkers = (mapInstance, toiletList) => {
    const newIds = new Set(toiletList.map((t) => t.id));
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!newIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    toiletList.forEach((toilet) => {
      if (markersRef.current[toilet.id]) return;

      const el = document.createElement("div");
      el.className = "toilet-marker";
      el.innerHTML = `
        <div class="marker-bubble" data-id="${toilet.id}">
          <span class="marker-icon">${TOILET_SVG}</span>
        </div>
      `;
      el.style.cssText = `
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; transition:transform 0.15s ease;
      `;

      const popup = new mapboxgl.Popup({ offset: 18, closeButton: false })
        .setHTML(buildPopupHTML(toilet));

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([toilet.longitude, toilet.latitude])
        .setPopup(popup)
        .addTo(mapInstance);

      el.addEventListener("click", () => {
        setActiveId(toilet.id);
        setSidebarOpen(true);
        setSheetState("expanded");
        document
          .getElementById(`toilet-card-${toilet.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });

      markersRef.current[toilet.id] = marker;
    });
  };

  // ── Highlight active marker ───────────────────────────────────────────────
  useEffect(() => {
    document.querySelectorAll(".marker-bubble").forEach((el) => {
      const id = el.dataset.id;
      const isActive = id === activeId;
      el.style.background = isActive ? BRAND : WHITE;
      el.style.color = isActive ? WHITE : TEXT_PRIMARY;
      el.style.transform = isActive ? "scale(1.18)" : "scale(1)";
      el.style.borderColor = BRAND;
      const svg = el.querySelector("svg");
      if (svg) svg.style.stroke = isActive ? WHITE : BRAND;
    });
  }, [activeId]);

  // ── Initialise map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current) return;

    const initMap = (center) => {
      const m = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [center.lng, center.lat],
        zoom: 14,
      });

      m.addControl(new mapboxgl.NavigationControl(), "top-right");
      m.addControl(new mapboxgl.ScaleControl(), "bottom-right");

      if (center !== ERNAKULAM) {
        new mapboxgl.Marker({ color: "#3b82f6" })
          .setLngLat([center.lng, center.lat])
          .setPopup(new mapboxgl.Popup().setHTML("<b>You are here</b>"))
          .addTo(m);
      }

      map.current = m;

      // ── Create geocoder (NOT added to map as a control) ─────────────────
      // We create it once and manually mount its DOM element into both the
      // desktop sidebar container and the mobile sheet container. The geocoder
      // still drives the map (flyTo on result) without rendering on the map.
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: "Search for a location…",
        marker: false, // We don't want a geocoder marker; map already tracks user
        flyTo: {
          speed: 1.4,
          zoom: 15,
        },
      });

      geocoderRef.current = geocoder;

      // Render geocoder DOM once (it only renders to one container)
      geocoder.onAdd(m); // initialises the internal element
      const geocoderEl = geocoder.onAdd(m); // returns the DOM node

      // Mount into desktop container if available
      if (desktopGeocoderContainerRef.current) {
        desktopGeocoderContainerRef.current.innerHTML = "";
        desktopGeocoderContainerRef.current.appendChild(geocoderEl);
      }

      // After the geocoder result, reload toilets for the new bounds
      geocoder.on("result", () => {
        // flyTo is handled internally; wait for moveend to trigger reload
      });

      m.on("load", () => {
        loadToiletsForBounds(m, center !== ERNAKULAM ? center : null);
      });

      m.on("moveend", () => {
        clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = setTimeout(() => {
          loadToiletsForBounds(m, center !== ERNAKULAM ? center : null);
        }, 400);
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setLocationStatus("granted");
          initMap(loc);
        },
        () => {
          setLocationStatus("denied");
          initMap(ERNAKULAM);
        },
        { timeout: 8000 }
      );
    } else {
      setLocationStatus("denied");
      initMap(ERNAKULAM);
    }

    return () => {
      clearTimeout(moveTimeoutRef.current);
      // Remove geocoder before removing map to avoid stale refs
      if (geocoderRef.current && map.current) {
        try { geocoderRef.current.onRemove(); } catch (_) {}
      }
      map.current?.remove();
    };
  }, []);

  // ── Mount a cloned geocoder input inside mobile sheet header ─────────────
  // Because a MapboxGeocoder instance can only be physically mounted in one
  // DOM node at a time, we use a second independent geocoder instance for the
  // mobile sheet that shares the same map reference but is created separately.
  const mobileGeocoderRef = useRef(null);

  useEffect(() => {
    // Poll until BOTH the map instance AND the mobile container ref are available.
    // We intentionally do NOT bail out early if mobileGeocoderContainerRef.current
    // is null here — the ref is always in the DOM now (we use CSS to show/hide),
    // but the map may still be initialising due to geolocation latency.
    const interval = setInterval(() => {
      // Stop once we have successfully mounted the geocoder
      if (mobileGeocoderRef.current) {
        clearInterval(interval);
        return;
      }
      // Wait for both map and container to be ready
      if (!map.current || !mobileGeocoderContainerRef.current) return;

      const mobileGeocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        placeholder: "Search for a location…",
        marker: false,
        flyTo: {
          speed: 1.4,
          zoom: 15,
        },
      });

      mobileGeocoderRef.current = mobileGeocoder;
      const el = mobileGeocoder.onAdd(map.current);

      mobileGeocoderContainerRef.current.innerHTML = "";
      mobileGeocoderContainerRef.current.appendChild(el);

      clearInterval(interval);
    }, 300);

    return () => {
      clearInterval(interval);
      if (mobileGeocoderRef.current && map.current) {
        try { mobileGeocoderRef.current.onRemove(); } catch (_) {}
      }
    };
  }, []);

  const flyToToilet = (toilet) => {
    setActiveId(toilet.id);
    map.current?.flyTo({
      center: [toilet.longitude, toilet.latitude],
      zoom: 16,
      speed: 1.2,
    });
    markersRef.current[toilet.id]?.togglePopup();
  };

  const sheetHeights = { collapsed: "52px", peek: "38vh", expanded: "72vh" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Baloo+Chettan+2:wght@800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { font-family: 'DM Sans', sans-serif; background: ${SURFACE}; }

        .mapboxgl-map { border-radius: 0; }
        .mapboxgl-ctrl-top-right { top: 10px !important; right: 10px !important; }
        .mapboxgl-ctrl-bottom-right { bottom: 10px !important; right: 10px !important; }

        @media (max-width: 768px) {
          .navbar-username { display: none; }
        }

        .mapboxgl-popup-content {
          border-radius: 14px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important;
          padding: 14px 18px !important;
          font-family: 'DM Sans', sans-serif !important;
          border: 1px solid ${SURFACE} !important;
        }

        .mapboxgl-popup-tip { display: none; }

        .marker-bubble {
          background: ${WHITE};
          border: 2px solid ${BRAND};
          border-radius: 99px;
          padding: 5px 11px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 2px 10px rgba(16,181,126,0.25);
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
          white-space: nowrap;
          color: ${TEXT_PRIMARY};
        }

        .marker-bubble svg {
          stroke: ${BRAND};
          flex-shrink: 0;
          transition: stroke 0.15s ease;
        }

        .marker-bubble:hover {
          background: ${BRAND} !important;
          color: ${WHITE} !important;
          transform: scale(1.12) !important;
          box-shadow: 0 4px 16px rgba(16,181,126,0.4) !important;
        }

        .marker-bubble:hover svg { stroke: ${WHITE} !important; }

        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: ${SURFACE}; border-radius: 99px; }

        .desktop-sidebar { display: flex; }
        .mobile-sheet { display: none; }
        .mobile-map-wrapper { display: flex; flex-direction: column; }

        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-sheet { display: flex !important; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .desktop-sidebar { min-width: 300px !important; }
        }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sheet-handle {
          width: 40px;
          height: 4px;
          background: #d1d5db;
          border-radius: 99px;
          margin: 0 auto 12px;
          cursor: grab;
        }

        /* ── Geocoder overrides: make it fit the sidebar aesthetic ───────── */
        .mapboxgl-ctrl-geocoder {
          width: 100% !important;
          max-width: 100% !important;
          min-width: unset !important;
          box-shadow: none !important;
          border: 1.5px solid ${SURFACE} !important;
          border-radius: 10px !important;
          font-family: 'DM Sans', sans-serif !important;
          background: #f9fafb !important;
          transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
        }

        .mapboxgl-ctrl-geocoder:focus-within {
          border-color: ${BRAND} !important;
          box-shadow: 0 0 0 3px rgba(16,181,126,0.12) !important;
          background: ${WHITE} !important;
        }

        .mapboxgl-ctrl-geocoder--input {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px !important;
          color: ${TEXT_PRIMARY} !important;
          padding: 8px 36px 8px 38px !important;
          height: 40px !important;
          background: transparent !important;
        }

        .mapboxgl-ctrl-geocoder--input::placeholder {
          color: ${TEXT_MUTED} !important;
          font-size: 13px !important;
        }

        .mapboxgl-ctrl-geocoder--input:focus {
          outline: none !important;
        }

        .mapboxgl-ctrl-geocoder--icon {
          top: 10px !important;
        }

        .mapboxgl-ctrl-geocoder--icon-search {
          fill: ${TEXT_MUTED} !important;
          left: 10px !important;
          top: 11px !important;
          width: 18px !important;
          height: 18px !important;
        }

        .mapboxgl-ctrl-geocoder--button {
          background: transparent !important;
          top: 8px !important;
          right: 8px !important;
        }

        .mapboxgl-ctrl-geocoder--icon-close {
          fill: ${TEXT_MUTED} !important;
        }

        .mapboxgl-ctrl-geocoder--powered-by {
          display: none !important;
        }

        .suggestions {
          border-radius: 10px !important;
          border: 1.5px solid ${SURFACE} !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important;
          font-family: 'DM Sans', sans-serif !important;
          overflow: hidden !important;
          margin-top: 4px !important;
        }

        .suggestions > li > a {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 13px !important;
          color: ${TEXT_PRIMARY} !important;
          padding: 10px 14px !important;
        }

        .suggestions > .active > a,
        .suggestions > li > a:hover {
          background: ${BRAND_LIGHT} !important;
          color: ${BRAND_DARK} !important;
        }

        .mapboxgl-ctrl-geocoder--suggestion-title {
          font-weight: 600 !important;
          font-size: 13px !important;
        }

        .mapboxgl-ctrl-geocoder--suggestion-address {
          font-size: 11px !important;
          color: ${TEXT_MUTED} !important;
        }
      `}</style>

      <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>

        <Navbar />

        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
          <div
            className="desktop-sidebar"
            style={{
              width: sidebarOpen ? 340 : 0,
              minWidth: sidebarOpen ? 340 : 0,
              background: WHITE,
              borderRight: `1px solid ${SURFACE}`,
              flexDirection: "column",
              overflow: "hidden",
              transition: "width 0.25s ease, min-width 0.25s ease",
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            {/* ── Geocoder search bar (desktop) ──────────────────────────── */}
            <div style={{
              padding: "12px 12px 0",
              flexShrink: 0,
              background: WHITE,
            }}>
              {/* The geocoder DOM node is injected here by the useEffect */}
              <div ref={desktopGeocoderContainerRef} style={{ width: "100%" }} />
            </div>

            <div style={{
              padding: "12px 16px 10px",
              borderBottom: `1px solid ${SURFACE}`,
              flexShrink: 0,
              background: WHITE,
            }}>

              {/* Heading */}
              <div style={{
                fontWeight: 700,
                fontSize: 15,
                color: TEXT_PRIMARY,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                {loading ? (
                  <>
                    <span style={{
                      animation: "spin 1s linear infinite",
                      display: "inline-block",
                      color: BRAND,
                      fontSize: 18
                    }}>
                      ⟳
                    </span>

                    <span style={{ color: BRAND }}>
                      Searching…
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{
                      background: BRAND,
                      color: WHITE,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "2px 9px",
                      borderRadius: 99,
                      minWidth: 28,
                      textAlign: "center",
                    }}>
                      {toilets.length}
                    </span>

                    <span>
                      {toilets.length !== 1 ? "toilets" : "toilet"} in this area
                    </span>
                  </>
                )}
              </div>

              <div style={{
                fontSize: 12,
                color: TEXT_MUTED,
                marginTop: 4,
              }}>
                Move the map to explore more
              </div>

            </div>

            <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
              {toilets.length === 0 && !loading && (
                <div style={{ textAlign: "center", color: TEXT_MUTED, marginTop: 48, fontSize: 14, animation: "fadeIn 0.3s ease" }}>
                  <div style={{ marginTop: 12, fontWeight: 600, color: TEXT_PRIMARY }}>No toilets found</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try zooming out or moving the map</div>
                </div>
              )}

              {toilets.map((toilet) => (
                <div key={toilet.id} id={`toilet-card-${toilet.id}`}>
                  <ToiletCard toilet={toilet} isActive={activeId === toilet.id} onClick={() => flyToToilet(toilet)} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Map area ─────────────────────────────────────────────────────── */}
          <div
            className="mobile-map-wrapper"
            style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minWidth: 0 }}
          >

            <div ref={mapContainer} style={{ flex: 1, width: "100%", minHeight: 0 }} />

            {loading && (
              <div style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                background: WHITE,
                borderRadius: 99,
                padding: "8px 18px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                border: `1px solid ${SURFACE}`,
                fontSize: 13,
                fontWeight: 600,
                color: TEXT_PRIMARY,
                display: "flex",
                alignItems: "center",
                gap: 8,
                zIndex: 20,
                whiteSpace: "nowrap",
              }}>
                <span style={{ animation: "spin 0.9s linear infinite", display: "inline-block", color: BRAND, fontSize: 16 }}>⟳</span>
                Loading toilets…
              </div>
            )}

            {locationStatus === "granted" && userLocation && (
              <button
                onClick={() => {
                  map.current?.flyTo({
                    center: [userLocation.lng, userLocation.lat],
                    zoom: 15,
                    speed: 1.4
                  });
                }}
                style={{
                  position: "absolute",
                  bottom: 32,
                  right: 16,
                  background: WHITE,
                  border: `1.5px solid ${SURFACE}`,
                  borderRadius: 12,
                  padding: "9px 16px",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT_PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  zIndex: 10,
                  transition: "all 0.15s ease",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                📍 My location
              </button>
            )}
          </div>

          {/* ── Mobile bottom sheet ─────────────────────────────────────────── */}
          <div
            className="mobile-sheet"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: WHITE,
              borderTop: `1px solid ${SURFACE}`,
              borderRadius: "20px 20px 0 0",
              height: sheetHeights[sheetState],
              flexDirection: "column",
              zIndex: 50,
              boxShadow: "0 -4px 28px rgba(0,0,0,0.10)",
              transition: "height 0.3s cubic-bezier(0.32,0.72,0,1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{ padding: "10px 16px 0", flexShrink: 0 }}
              onClick={() => setSheetState((s) => s === "collapsed" ? "peek" : s === "peek" ? "expanded" : "peek")}
            >
              <div className="sheet-handle" />

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 10,
                borderBottom: `1px solid ${SURFACE}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    background: BRAND,
                    color: WHITE,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 99
                  }}>
                    {toilets.length}
                  </span>

                  <span style={{ fontWeight: 700, fontSize: 14, color: TEXT_PRIMARY }}>
                    {toilets.length !== 1 ? "toilets" : "toilet"} nearby
                  </span>

                  {loading && (
                    <span style={{
                      animation: "spin 0.9s linear infinite",
                      display: "inline-block",
                      color: BRAND
                    }}>
                      ⟳
                    </span>
                  )}
                </div>

                <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {sheetState === "expanded" ? "▼" : "▲"}
                </span>
              </div>
            </div>

            {/* ── Geocoder search bar (mobile sheet) ────────────────────────
                Always in the DOM so the ref is always populated and the
                geocoder element stays mounted. We use CSS display to
                hide it in collapsed/peek states without unmounting it.
                Stop propagation so tapping the input doesn't toggle the sheet. */}
            <div
              style={{
                padding: "10px 12px 0",
                flexShrink: 0,
                display: sheetState === "expanded" ? "block" : "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div ref={mobileGeocoderContainerRef} style={{ width: "100%" }} />
            </div>

            <div className="sidebar-scroll" style={{ overflowY: "auto", padding: "10px 12px 24px", flex: 1 }}>
              {toilets.length === 0 && !loading && (
                <div style={{ textAlign: "center", color: TEXT_MUTED, paddingTop: 24, fontSize: 13 }}>
                  No toilets in this area — try moving the map.
                </div>
              )}

              {toilets.map((t) => (
                <div key={t.id} id={`toilet-card-${t.id}`}>
                  <ToiletCard
                    toilet={t}
                    isActive={activeId === t.id}
                    onClick={() => {
                      flyToToilet(t);
                      setSheetState("peek");
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}