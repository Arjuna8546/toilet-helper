// src/pages/SuperUserHome.jsx
// Requires: mapbox-gl, @mapbox/mapbox-gl-geocoder, react-redux
// npm install mapbox-gl @mapbox/mapbox-gl-geocoder

import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import { logout } from "../features/auth/authSlice";
import { fetchToiletsInBounds, fetchNearbyToilets } from "../services/toiletService";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

// ── Replace with your Mapbox public token ──────────────────────────────────
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN 

// Default fallback: Ernakulam, Kerala
const ERNAKULAM = { lat: 9.9816, lng: 76.2999 };

// ── Star rating helper ─────────────────────────────────────────────────────
function Stars({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <span style={{ color: "#f59e0b", fontSize: "12px", letterSpacing: "1px" }}>
      {"★".repeat(Math.round(r))}{"☆".repeat(5 - Math.round(r))}
      <span style={{ color: "#6b7280", marginLeft: 4, fontSize: 11 }}>
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
      background: "#ecfdf5", color: "#059669", fontSize: 11,
      padding: "2px 7px", borderRadius: 99, fontWeight: 600,
    }}>
      {label} away
    </span>
  );
}

// ── Toilet card in sidebar ─────────────────────────────────────────────────
function ToiletCard({ toilet, isActive, onClick }) {
  const features = [
    toilet.is_accessible && "♿ Accessible",
    toilet.has_baby_changing && "👶 Baby change",
    toilet.is_free && "🆓 Free",
    !toilet.is_free && toilet.fee && `💰 ₹${toilet.fee}`,
  ].filter(Boolean);

  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? "#f0fdf4" : "#fff",
        border: isActive ? "1.5px solid #10b981" : "1.5px solid #e5e7eb",
        borderRadius: 14,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: isActive ? "0 4px 20px rgba(16,185,129,0.15)" : "0 1px 4px rgba(0,0,0,0.06)",
        marginBottom: 10,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", lineHeight: 1.3 }}>
            {toilet.name}
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            {toilet.address || toilet.city || ""}
          </div>
        </div>
        <DistanceBadge metres={toilet.distance_metres} />
      </div>

      {/* Rating */}
      <div style={{ marginTop: 8 }}>
        <Stars rating={toilet.average_rating} />
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
              background: "#f3f4f6", color: "#374151", fontSize: 11,
              padding: "3px 8px", borderRadius: 99,
            }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Open/closed */}
      {toilet.opening_hours && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
          🕐 {toilet.opening_hours}
        </div>
      )}
    </div>
  );
}

// ── Popup marker content (inline HTML for Mapbox) ─────────────────────────
function buildPopupHTML(toilet) {
  const dist = toilet.distance_metres != null
    ? (toilet.distance_metres < 1000
      ? `${toilet.distance_metres} m`
      : `${(toilet.distance_metres / 1000).toFixed(1)} km`)
    : "";
  const stars = "★".repeat(Math.round(parseFloat(toilet.average_rating) || 0));
  return `
    <div style="font-family:'DM Sans',sans-serif;min-width:200px;padding:4px">
      <div style="font-weight:700;font-size:14px;color:#111827;margin-bottom:4px">${toilet.name}</div>
      ${toilet.address ? `<div style="color:#6b7280;font-size:12px;margin-bottom:6px">${toilet.address}</div>` : ""}
      <div style="color:#f59e0b;font-size:13px">${stars || "☆☆☆☆☆"}</div>
      ${dist ? `<div style="color:#059669;font-size:12px;font-weight:600;margin-top:4px">📍 ${dist} away</div>` : ""}
      ${toilet.is_free ? `<div style="color:#10b981;font-size:12px;margin-top:4px">🆓 Free to use</div>` : ""}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function UserHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({}); // id → mapboxgl.Marker
  const geocoderRef = useRef(null);
  const moveTimeoutRef = useRef(null);

  const [toilets, setToilets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("pending"); // pending | granted | denied
  const [loading, setLoading] = useState(false);
  const [listCount, setListCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      setListCount(data.length);
      updateMarkers(mapInstance, data);
    } catch (err) {
      console.error("Failed to load toilets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Sync Mapbox markers with toilet data ─────────────────────────────────
  const updateMarkers = (mapInstance, toiletList) => {
    // Remove old markers not in new list
    const newIds = new Set(toiletList.map((t) => t.id));
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!newIds.has(Number(id))) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    // Add/update markers
    toiletList.forEach((toilet) => {
      if (markersRef.current[toilet.id]) return; // already exists

      // Custom marker element
      const el = document.createElement("div");
      el.className = "toilet-marker";
      el.innerHTML = `
        <div class="marker-bubble" data-id="${toilet.id}">
          <span class="marker-icon">🚻</span>
          ${toilet.is_free ? '<span class="marker-free">Free</span>' : ""}
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
        // Scroll card into view
        const card = document.getElementById(`toilet-card-${toilet.id}`);
        card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });

      markersRef.current[toilet.id] = marker;
    });
  };

  // ── Highlight active marker ───────────────────────────────────────────────
  useEffect(() => {
    document.querySelectorAll(".marker-bubble").forEach((el) => {
      const id = Number(el.dataset.id);
      el.style.background = id === activeId ? "#10b981" : "#fff";
      el.style.color = id === activeId ? "#fff" : "#111";
      el.style.transform = id === activeId ? "scale(1.15)" : "scale(1)";
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

      // Geocoder (search box)
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        placeholder: "Search a place…",
        marker: false,
        flyTo: { speed: 1.4 },
      });
      m.addControl(geocoder, "top-left");
      geocoderRef.current = geocoder;

      // User location dot
      if (center !== ERNAKULAM) {
        new mapboxgl.Marker({ color: "#3b82f6" })
          .setLngLat([center.lng, center.lat])
          .setPopup(new mapboxgl.Popup().setHTML("<b>You are here</b>"))
          .addTo(m);
      }

      map.current = m;

      m.on("load", () => {
        loadToiletsForBounds(m, center !== ERNAKULAM ? center : null);
      });

      // Debounced move end → reload toilets
      m.on("moveend", () => {
        clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = setTimeout(() => {
          loadToiletsForBounds(m, center !== ERNAKULAM ? center : null);
        }, 400);
      });
    };

    // Request geolocation
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
      map.current?.remove();
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const flyToToilet = (toilet) => {
    setActiveId(toilet.id);
    map.current?.flyTo({
      center: [toilet.longitude, toilet.latitude],
      zoom: 16,
      speed: 1.2,
    });
    markersRef.current[toilet.id]?.togglePopup();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Global styles ─────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        .mapboxgl-map { border-radius: 0; }
        .mapboxgl-ctrl-top-left { top: 64px !important; }
        .mapboxgl-ctrl-geocoder {
          min-width: 280px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;
          border-radius: 12px !important;
          border: 1.5px solid #e5e7eb !important;
          font-family: 'DM Sans', sans-serif !important;
        }
        .mapboxgl-popup-content {
          border-radius: 12px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15) !important;
          padding: 12px 16px !important;
          font-family: 'DM Sans', sans-serif !important;
        }

        .marker-bubble {
          background: #fff;
          border: 2px solid #10b981;
          border-radius: 99px;
          padding: 5px 10px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .marker-bubble:hover {
          background: #10b981 !important;
          color: #fff !important;
          transform: scale(1.1) !important;
        }
        .marker-free {
          font-size: 10px;
          background: #d1fae5;
          color: #059669;
          border-radius: 99px;
          padding: 1px 5px;
        }

        .sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }

        @media (max-width: 640px) {
          .desktop-sidebar { display: none !important; }
          .mobile-sheet { display: flex !important; }
        }
        .mobile-sheet { display: none; }
      `}</style>

      {/* ── Root layout ───────────────────────────────────────────────── */}
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f9fafb" }}>

        {/* ── Top navbar ──────────────────────────────────────────────── */}
        <nav style={{
          height: 56,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 100,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🚻</span>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px", color: "#111" }}>
              ToiletFinder
            </span>
            {locationStatus === "denied" && (
              <span style={{
                fontSize: 11, background: "#fef3c7", color: "#92400e",
                padding: "2px 8px", borderRadius: 99, fontWeight: 600,
              }}>
                📍 Using Ernakulam
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#6b7280", display: "none" }} className="welcome-name">
              Hi, {user?.name}
            </span>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              style={{
                border: "1.5px solid #e5e7eb", background: "#fff",
                borderRadius: 10, padding: "6px 12px", cursor: "pointer",
                fontSize: 13, fontWeight: 600, color: "#374151",
              }}
            >
              {sidebarOpen ? "Hide list" : `Show ${listCount} toilets`}
            </button>
            <button
              onClick={handleLogout}
              style={{
                border: "none", background: "#111827",
                borderRadius: 10, padding: "7px 14px", cursor: "pointer",
                fontSize: 13, fontWeight: 600, color: "#fff",
              }}
            >
              Logout
            </button>
          </div>
        </nav>

        {/* ── Main content: map + sidebar ──────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* ── Left sidebar (desktop) ─────────────────────────────────── */}
          <div
            className="desktop-sidebar"
            style={{
              width: sidebarOpen ? 360 : 0,
              minWidth: sidebarOpen ? 360 : 0,
              background: "#fff",
              borderRight: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transition: "width 0.25s ease, min-width 0.25s ease",
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            {/* Sidebar header */}
            <div style={{
              padding: "16px 16px 10px",
              borderBottom: "1px solid #f3f4f6",
              flexShrink: 0,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                {loading ? (
                  <span style={{ color: "#10b981" }}>⟳ Searching…</span>
                ) : (
                  `${toilets.length} toilet${toilets.length !== 1 ? "s" : ""} in this area`
                )}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                Move the map to explore more
              </div>
            </div>

            {/* Toilet list */}
            <div
              className="sidebar-scroll"
              style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}
            >
              {toilets.length === 0 && !loading && (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 14 }}>
                  <div style={{ fontSize: 40 }}>🔍</div>
                  <div style={{ marginTop: 10 }}>No toilets found in this area</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try zooming out or moving the map</div>
                </div>
              )}
              {toilets.map((toilet) => (
                <div key={toilet.id} id={`toilet-card-${toilet.id}`}>
                  <ToiletCard
                    toilet={toilet}
                    isActive={activeId === toilet.id}
                    onClick={() => flyToToilet(toilet)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Map ───────────────────────────────────────────────────── */}
          <div style={{ flex: 1, position: "relative" }}>
            <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

            {/* Loading overlay */}
            {loading && (
              <div style={{
                position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                background: "#fff", borderRadius: 99, padding: "8px 16px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                fontSize: 13, fontWeight: 600, color: "#111827",
                display: "flex", alignItems: "center", gap: 8, zIndex: 20,
              }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                Loading toilets…
                <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
              </div>
            )}

            {/* Re-centre button (only when location granted) */}
            {locationStatus === "granted" && userLocation && (
              <button
                onClick={() => {
                  map.current?.flyTo({
                    center: [userLocation.lng, userLocation.lat],
                    zoom: 15, speed: 1.4,
                  });
                }}
                style={{
                  position: "absolute", bottom: 32, right: 16,
                  background: "#fff", border: "1.5px solid #e5e7eb",
                  borderRadius: 12, padding: "9px 14px",
                  cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  fontSize: 13, fontWeight: 700, color: "#111827",
                  display: "flex", alignItems: "center", gap: 6, zIndex: 10,
                }}
              >
                📍 My location
              </button>
            )}
          </div>

          {/* ── Mobile bottom sheet ────────────────────────────────────── */}
          <div
            className="mobile-sheet"
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "#fff",
              borderTop: "1px solid #e5e7eb",
              borderRadius: "20px 20px 0 0",
              maxHeight: "42vh",
              flexDirection: "column",
              zIndex: 50,
              boxShadow: "0 -4px 24px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ padding: "10px 16px 6px", textAlign: "center" }}>
              <div style={{
                width: 36, height: 4, background: "#d1d5db",
                borderRadius: 99, margin: "0 auto 10px",
              }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>
                {toilets.length} toilet{toilets.length !== 1 ? "s" : ""} here
              </div>
            </div>
            <div className="sidebar-scroll" style={{ overflowY: "auto", padding: "0 12px 16px" }}>
              {toilets.map((t) => (
                <div key={t.id}>
                  <ToiletCard
                    toilet={t}
                    isActive={activeId === t.id}
                    onClick={() => flyToToilet(t)}
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