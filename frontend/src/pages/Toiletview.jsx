// src/pages/ToiletView.jsx
// Requires: react-router-dom, react-redux, lucide-react
// Fetches a single toilet by ID and renders a detailed view.

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchToiletById, fetchReviews, createReview } from "../services/toiletService";
import Navbar from "../components/Navbar ";

// ── Brand tokens (mirror SuperUserHome) ──────────────────────────────────────
const BRAND = "#10B57E";
const BRAND_LIGHT = "#e6f7f1";
const BRAND_DARK = "#0d9468";
const SURFACE = "#E8E8E8";
const WHITE = "#ffffff";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#6b7280";

// ── Tiny helpers ─────────────────────────────────────────────────────────────
function Stars({ value, max = 5, size = 15 }) {
    const filled = Math.round(parseFloat(value) || 0);
    return (
        <span style={{ color: "#f59e0b", fontSize: size, letterSpacing: "1px" }}>
            {"★".repeat(filled)}{"☆".repeat(max - filled)}
        </span>
    );
}

function Chip({ label, active, icon }) {
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: active ? BRAND_LIGHT : SURFACE,
            color: active ? BRAND_DARK : TEXT_MUTED,
            border: `1.5px solid ${active ? BRAND : "transparent"}`,
            fontSize: 12, fontWeight: 600,
            padding: "4px 11px", borderRadius: 99,
            whiteSpace: "nowrap",
        }}>
            {icon && <span>{icon}</span>}
            {label}
        </span>
    );
}

function RatingBar({ label, value, max = 5 }) {
    const pct = ((parseFloat(value) || 0) / max) * 100;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: 700 }}>
                    {value ? parseFloat(value).toFixed(1) : "—"}
                </span>
            </div>
            <div style={{ height: 6, background: SURFACE, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${BRAND_DARK}, ${BRAND})`,
                    borderRadius: 99,
                    transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                }} />
            </div>
        </div>
    );
}

function Section({ title, children, accent = false }) {
    return (
        <div style={{
            background: WHITE,
            borderRadius: 18,
            padding: "20px 22px",
            border: `1.5px solid ${accent ? BRAND : SURFACE}`,
            boxShadow: accent
                ? `0 4px 24px rgba(16,181,126,0.10)`
                : "0 1px 6px rgba(0,0,0,0.05)",
        }}>
            {title && (
                <div style={{
                    fontWeight: 800, fontSize: 14, color: TEXT_PRIMARY,
                    marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
                }}>
                    <span style={{
                        display: "inline-block", width: 3, height: 14,
                        background: BRAND, borderRadius: 99,
                    }} />
                    {title}
                </div>
            )}
            {children}
        </div>
    );
}

// ── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
    const date = new Date(review.visited_at || review.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });

    const amenities = [
        review.has_soap && "Soap",
        review.has_mirror && "Mirror",
        review.has_dustbin && "Dustbin",
        review.has_hand_dryer && "Hand dryer",
        review.has_sanitary_vending && "Sanitary vending",
    ].filter(Boolean);

    return (
        <div style={{
            background: WHITE,
            border: `1.5px solid ${SURFACE}`,
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: 12,
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: BRAND_LIGHT, color: BRAND_DARK,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 14,
                    }}>
                        A
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY }}>
                            Anonymous
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED }}>{date}</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Stars value={review.overall} size={13} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY }}>
                        {review.overall}/5
                    </span>
                </div>
            </div>

            {/* Rating breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 12 }}>
                {[
                    ["Cleanliness", review.cleanliness],
                    ["Smell", review.smell],
                    ["Privacy", review.privacy],
                    ["Lighting", review.lighting],
                    ["Maintenance", review.maintenance],
                    ["Safety", review.safety],
                ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: TEXT_MUTED }}>{label}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Stars value={val} size={10} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_PRIMARY }}>{val}</span>
                        </span>
                    </div>
                ))}
            </div>

            {/* Crowd level */}
            {review.crowd_level && (
                <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>Crowd level: </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_PRIMARY }}>
                        {review.crowd_level}/5
                    </span>
                </div>
            )}

            {/* Water */}
            <div style={{ marginBottom: 10 }}>
                <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: review.water_availability === "AVAILABLE" ? BRAND_DARK : "#ef4444",
                    background: review.water_availability === "AVAILABLE" ? BRAND_LIGHT : "#fef2f2",
                    padding: "3px 9px", borderRadius: 99,
                }}>
                    Water: {review.water_availability_display || review.water_availability}
                </span>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {amenities.map((a) => (
                        <span key={a} style={{
                            fontSize: 11, background: SURFACE, color: TEXT_MUTED,
                            padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                        }}>✓ {a}</span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Star picker for review form ───────────────────────────────────────────────
function StarPicker({ value, onChange }) {
    const [hover, setHover] = useState(0);
    return (
        <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
                <span
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(n)}
                    style={{
                        fontSize: 24,
                        cursor: "pointer",
                        color: n <= (hover || value) ? "#f59e0b" : SURFACE,
                        transition: "color 0.1s ease",
                        lineHeight: 1,
                    }}
                >★</span>
            ))}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ToiletView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [toilet, setToilet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePhoto, setActivePhoto] = useState(0);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [lightbox, setLightbox] = useState(false);

    // Review form state
    const [form, setForm] = useState({
        cleanliness: 0, smell: 0, privacy: 0, lighting: 0,
        maintenance: 0, safety: 0, overall: 0,
        water_availability: "AVAILABLE",
        has_soap: false, has_mirror: false, has_dustbin: false,
        has_hand_dryer: false, has_sanitary_vending: false,
        crowd_level: 3,
        best_time_to_visit: "",
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetchToiletById(id);
                if (!cancelled) {
                    setToilet(res.data);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createReview({ ...form, toilet: id });
            setSubmitSuccess(true);
            setShowReviewForm(false);
            // Refresh toilet data
            const res = await fetchToiletById(id);
            setToilet(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const f = (field) => (val) => setForm((s) => ({ ...s, [field]: val }));

    // ── Loading skeleton ────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: SURFACE, fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Baloo+Chettan+2:wght@800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}
            </style>
            {/* Navbar skeleton */}
            <div style={{ height: 56, background: WHITE, borderBottom: `1px solid ${SURFACE}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: SURFACE, animation: "pulse 1.4s ease infinite" }} />
                <div style={{ width: 120, height: 18, borderRadius: 6, background: SURFACE, animation: "pulse 1.4s ease infinite" }} />
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${BRAND}`, borderTopColor: "transparent", animation: "spin 0.9s linear infinite" }} />
                    <span style={{ color: TEXT_MUTED, fontSize: 14 }}>Loading toilet details…</span>
                </div>
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );

    if (!toilet) return (
        <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: SURFACE, fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚽</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: TEXT_PRIMARY, marginBottom: 8 }}>Toilet not found</div>
                <button onClick={() => navigate(-1)} style={backBtnStyle}>← Go back</button>
            </div>
        </div>
    );

    const photos = toilet.photos || [];
    const hasGeneratedVideo = Boolean(toilet.generated_video_url);
    const activeMediaIsVideo = hasGeneratedVideo && activePhoto === photos.length;
    const mediaCount = photos.length + (hasGeneratedVideo ? 1 : 0);
    const reviews = toilet.reviews || [];
    const features = [
        { label: "Wheelchair Accessible", active: toilet.is_wheelchair_accessible },
        { label: "Women Friendly", active: toilet.is_women_friendly },
        { label: "Western Toilet", active: toilet.has_western_toilet },
        { label: "Indian Toilet", active: toilet.has_indian_toilet },
        { label: "Baby Changing", active: toilet.has_baby_changing },
        { label: "Parking", active: toilet.has_parking },
    ];

    const avgRatings = [
        ["Cleanliness", toilet.avg_cleanliness],
        ["Smell", toilet.avg_smell],
        ["Privacy", toilet.avg_privacy],
        ["Lighting", toilet.avg_lighting],
        ["Maintenance", toilet.avg_maintenance],
        ["Safety", toilet.avg_safety],
    ].filter(([, v]) => v != null);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Baloo+Chettan+2:wght@800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { font-family: 'DM Sans', sans-serif; background: ${SURFACE}; }

        .toilet-scroll::-webkit-scrollbar { width: 4px; }
        .toilet-scroll::-webkit-scrollbar-track { background: transparent; }
        .toilet-scroll::-webkit-scrollbar-thumb { background: ${SURFACE}; border-radius: 99px; }

        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }

        .section-anim { animation: fadeUp 0.35s ease both; }

        .photo-thumb {
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          border: 2.5px solid transparent;
          transition: border-color 0.15s ease, transform 0.15s ease;
          flex-shrink: 0;
        }
        .photo-thumb:hover { transform: scale(1.04); }
        .photo-thumb.active { border-color: ${BRAND}; }

        .action-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 12px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          border: none; transition: all 0.15s ease;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
        }
        .action-btn-primary {
          background: ${BRAND}; color: ${WHITE};
        }
        .action-btn-primary:hover { background: ${BRAND_DARK}; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(16,181,126,0.3); }

        .action-btn-outline {
          background: ${WHITE}; color: ${TEXT_PRIMARY};
          border: 1.5px solid ${SURFACE} !important;
        }
        .action-btn-outline:hover { background: ${SURFACE}; }

        .form-input {
          width: 100%; padding: 10px 14px;
          border: 1.5px solid ${SURFACE}; border-radius: 10px;
          font-size: 13px; font-family: 'DM Sans', sans-serif; color: ${TEXT_PRIMARY};
          background: WHITE; outline: none; transition: border-color 0.15s ease;
        }
        .form-input:focus { border-color: ${BRAND}; }

        .toggle-check {
          appearance: none; width: 18px; height: 18px;
          border: 1.5px solid ${SURFACE}; border-radius: 5px;
          cursor: pointer; background: ${WHITE}; flex-shrink: 0;
          position: relative; transition: all 0.15s ease;
        }
        .toggle-check:checked {
          background: ${BRAND}; border-color: ${BRAND};
        }
        .toggle-check:checked::after {
          content: '✓'; position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          color: white; font-size: 11px; font-weight: 800;
        }

        @media (max-width: 768px) {
          .two-col { grid-template-columns: 1fr !important; }
          .content-wrap { padding: 0 12px 80px !important; }
          .header-inner { padding: 0 12px !important; }
        }
      `}</style>

            <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: SURFACE }}>

                {/* ── Navbar ──────────────────────────────────────────────────────────── */}
                <Navbar>
                </Navbar>

                {/* ── Scrollable body ─────────────────────────────────────────────────── */}
                <div className="toilet-scroll" style={{ flex: 1, overflowY: "auto" }}>


                    {/* ── Content ─────────────────────────────────────────────────────────── */}
                    <div
                        className="content-wrap"
                        style={{ maxWidth: 820, margin: "0 auto", padding: "20px 16px 80px", display: "flex", flexDirection: "column", gap: 16 }}
                    >

                        {/* ── Photos card ─────────────────────────────────────────────── */}
                        {mediaCount > 0 && (
                            <div className="section-anim" style={{ animationDelay: "20ms" }}>
                                <Section>
                                    {/* Hero image */}
                                    <div style={{
                                        position: "relative", borderRadius: 12, overflow: "hidden",
                                        height: 220, background: SURFACE, marginBottom: 10,
                                    }}>
                                        {activeMediaIsVideo ? (
                                            <video controls preload="metadata" src={toilet.generated_video_url} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}>
                                                Your browser does not support video playback.
                                            </video>
                                        ) : (
                                            <img src={photos[activePhoto]?.image_url} alt={toilet.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        )}

                                        {/* Expand / fullscreen icon */}
                                        {!activeMediaIsVideo && <button
                                            onClick={() => setLightbox(true)}
                                            title="View full photo"
                                            aria-label="View full photo"
                                            style={{
                                                position: "absolute", top: 10, right: 10,
                                                background: "rgba(0,0,0,0.50)", border: "none",
                                                borderRadius: 8, width: 34, height: 34,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                cursor: "pointer", color: WHITE, fontSize: 16,
                                                backdropFilter: "blur(4px)", transition: "background 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = BRAND}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.50)"}
                                        >⛶</button>

                                        }

                                        {/* Counter */}
                                        {mediaCount > 1 && (
                                            <div style={{
                                                position: "absolute", bottom: 10, right: 10,
                                                background: "rgba(0,0,0,0.50)", color: WHITE,
                                                fontSize: 11, fontWeight: 600,
                                                padding: "4px 10px", borderRadius: 99,
                                                backdropFilter: "blur(4px)",
                                            }}>
                                                {activePhoto + 1} / {mediaCount}
                                            </div>
                                        )}
                                    </div>

                                    {/* Thumbnail strip */}
                                    {mediaCount > 1 && (
                                        <div style={{
                                            display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2,
                                        }}>
                                            {photos.map((p, i) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => setActivePhoto(i)}
                                                    style={{
                                                        flexShrink: 0, width: 58, height: 58, borderRadius: 8,
                                                        overflow: "hidden", cursor: "pointer",
                                                        border: `2.5px solid ${i === activePhoto ? BRAND : "transparent"}`,
                                                        transition: "border-color 0.15s ease, transform 0.15s ease",
                                                        transform: i === activePhoto ? "scale(1.05)" : "scale(1)",
                                                    }}
                                                >
                                                    <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                </div>
                                            ))}
                                            {hasGeneratedVideo && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePhoto(photos.length)}
                                                    aria-label="Play generated video"
                                                    style={{
                                                        flexShrink: 0, width: 58, height: 58, borderRadius: 8,
                                                        cursor: "pointer", border: `2.5px solid ${activeMediaIsVideo ? BRAND : "transparent"}`,
                                                        background: "#111827", color: WHITE, fontSize: 20,
                                                        transform: activeMediaIsVideo ? "scale(1.05)" : "scale(1)",
                                                    }}
                                                >Play</button>
                                            )}
                                        </div>
                                    )}
                                </Section>
                            </div>
                        )}

                        {/* ── Lightbox ─────────────────────────────────────────────────── */}
                        {lightbox && (
                            <div
                                onClick={() => setLightbox(false)}
                                style={{
                                    position: "fixed", inset: 0, zIndex: 999,
                                    background: "rgba(0,0,0,0.88)",
                                    display: "flex", flexDirection: "column",
                                    alignItems: "center", justifyContent: "center", gap: 12,
                                }}
                            >
                                <button
                                    onClick={() => setLightbox(false)}
                                    style={{
                                        position: "absolute", top: 18, right: 18,
                                        background: "rgba(255,255,255,0.15)", border: "none",
                                        borderRadius: 99, width: 38, height: 38,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer", color: WHITE, fontSize: 20,
                                    }}
                                >✕</button>
                                <img
                                    src={photos[activePhoto]?.image_url}
                                    alt={toilet.name}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        maxWidth: "92vw", maxHeight: "80vh",
                                        borderRadius: 12, objectFit: "contain",
                                    }}
                                />
                                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                                    {activePhoto + 1} / {photos.length}
                                </span>
                            </div>
                        )}

                        {/* ── Name + quick info ──────────────────────────────────────────── */}
                        <div className="section-anim" style={{ animationDelay: "0ms" }}>
                            <Section>
                                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h1 style={{
                                            fontSize: 20, fontWeight: 800, color: TEXT_PRIMARY,
                                            lineHeight: 1.25, marginBottom: 6,
                                            fontFamily: "'DM Sans', sans-serif",
                                        }}>
                                            {toilet.name}
                                        </h1>
                                        {toilet.address && (
                                            <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>
                                                {toilet.address}{toilet.landmark ? ` · near ${toilet.landmark}` : ""}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                                            {toilet.district && `${toilet.district.charAt(0).toUpperCase() + toilet.district.slice(1)} district`}
                                        </div>
                                    </div>

                                    {/* Rating pill */}
                                    {toilet.review_count > 0 && (
                                        <div style={{
                                            background: BRAND_LIGHT, border: `1.5px solid ${BRAND}`,
                                            borderRadius: 14, padding: "10px 16px",
                                            display: "flex", flexDirection: "column", alignItems: "center",
                                            minWidth: 76, flexShrink: 0,
                                        }}>
                                            <span style={{ fontSize: 26, fontWeight: 800, color: BRAND_DARK, lineHeight: 1 }}>
                                                {parseFloat(toilet.avg_cleanliness || 0).toFixed(1)}
                                            </span>
                                            <Stars value={toilet.avg_cleanliness} size={12} />
                                            {/* <span style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                        {toilet.review_count} review{toilet.review_count !== 1 ? "s" : ""}
                      </span> */}
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                                    {toilet.google_maps_url && (
                                        <a
                                            href={toilet.google_maps_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="action-btn action-btn-primary"
                                        >
                                            Directions
                                        </a>
                                    )}
                                    {/* <button
                    className="action-btn action-btn-primary"
                    onClick={() => setShowReviewForm((s) => !s)}
                    style={{ background: showReviewForm ? BRAND_DARK : BRAND }}
                  >
                    {showReviewForm ? "Cancel review" : "Write a review"}
                  </button> */}
                                    {toilet.phone_number && (
                                        <a href={`tel:${toilet.phone_number}`} className="action-btn action-btn-outline">
                                            {toilet.phone_number}
                                        </a>
                                    )}
                                </div>
                            </Section>
                        </div>

                        {/* ── Two-column layout ──────────────────────────────────────────── */}
                        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                            {/* ── Fee & Hours ──────────────────────────────────────────────── */}
                            <div className="section-anim" style={{ animationDelay: "40ms" }}>
                                <Section title="Details">
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        {/* Fee */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 13, color: TEXT_MUTED }}>Entry fee</span>
                                            {toilet.is_free ? (
                                                <span style={{
                                                    background: BRAND_LIGHT, color: BRAND_DARK,
                                                    fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                                                }}>Free</span>
                                            ) : (
                                                <span style={{
                                                    background: "#fef3c7", color: "#92400e",
                                                    fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                                                }}>₹{toilet.price_inr || toilet.fee || "—"}</span>
                                            )}
                                        </div>

                                        {/* Category */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 13, color: TEXT_MUTED }}>Type</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>
                                                {toilet.category_display}
                                            </span>
                                        </div>

                                        {/* Hours */}
                                        {toilet.operating_hours && (
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ fontSize: 13, color: TEXT_MUTED }}>Hours</span>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>
                                                    {toilet.operating_hours}
                                                </span>
                                            </div>
                                        )}

                                        {/* Verifications */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: 13, color: TEXT_MUTED }}>Verified by</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>
                                                {toilet.verification_count} user{toilet.verification_count !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>
                                </Section>
                            </div>

                            {/* ── Features ────────────────────────────────────────────────── */}
                            <div className="section-anim" style={{ animationDelay: "80ms" }}>
                                <Section title="Facilities">
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                        {features.map(({ label, icon, active }) => (
                                            <Chip key={label} label={label} icon={icon} active={active} />
                                        ))}
                                    </div>
                                </Section>
                            </div>
                        </div>

                        {/* ── Average ratings ────────────────────────────────────────────── */}
                        {avgRatings.length > 0 && (
                            <div className="section-anim" style={{ animationDelay: "120ms" }}>
                                <Section title="Average Ratings">
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        {avgRatings.map(([label, val]) => (
                                            <RatingBar key={label} label={label} value={val} />
                                        ))}
                                    </div>
                                </Section>
                            </div>
                        )}

                        {/* ── Review form ────────────────────────────────────────────────── */}
                        {showReviewForm && (
                            <div className="section-anim" style={{ animationDelay: "0ms" }}>
                                <div style={{
                                    background: WHITE, borderRadius: 18,
                                    border: `1.5px solid ${BRAND}`,
                                    boxShadow: `0 8px 32px rgba(16,181,126,0.12)`,
                                    overflow: "hidden",
                                }}>
                                    {/* Form header */}
                                    <div style={{
                                        background: BRAND, padding: "14px 22px",
                                        display: "flex", alignItems: "center", gap: 8,
                                    }}>
                                        <span style={{ fontSize: 18 }}></span>
                                        <span style={{ fontWeight: 800, fontSize: 15, color: WHITE }}>Write a Review</span>
                                    </div>

                                    <form onSubmit={handleSubmitReview} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

                                        {/* Star ratings grid */}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY, marginBottom: 14 }}>
                                                Rate this toilet
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
                                                {[
                                                    ["Overall", "overall"],
                                                    ["Cleanliness", "cleanliness"],
                                                    ["Smell", "smell"],
                                                    ["Privacy", "privacy"],
                                                    ["Lighting", "lighting"],
                                                    ["Maintenance", "maintenance"],
                                                    ["Safety", "safety"],
                                                ].map(([label, field]) => (
                                                    <div key={field}>
                                                        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 5, fontWeight: 500 }}>{label}</div>
                                                        <StarPicker value={form[field]} onChange={f(field)} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Water availability */}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY, marginBottom: 10 }}>Water</div>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                {["AVAILABLE", "NOT_AVAILABLE", "SOMETIMES"].map((opt) => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => setForm((s) => ({ ...s, water_availability: opt }))}
                                                        style={{
                                                            padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                                                            cursor: "pointer", border: "1.5px solid",
                                                            fontFamily: "'DM Sans', sans-serif",
                                                            background: form.water_availability === opt ? BRAND_LIGHT : WHITE,
                                                            borderColor: form.water_availability === opt ? BRAND : SURFACE,
                                                            color: form.water_availability === opt ? BRAND_DARK : TEXT_MUTED,
                                                        }}
                                                    >
                                                        {opt === "AVAILABLE" ? "Available" : opt === "NOT_AVAILABLE" ? " None" : " Sometimes"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Amenities checkboxes */}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY, marginBottom: 10 }}>Amenities present</div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                                {[
                                                    ["has_soap", "Soap"],
                                                    ["has_mirror", "Mirror"],
                                                    ["has_dustbin", "Dustbin"],
                                                    ["has_hand_dryer", "Hand dryer"],
                                                    ["has_sanitary_vending", "Sanitary vending"],
                                                ].map(([field, label]) => (
                                                    <label key={field} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: TEXT_PRIMARY }}>
                                                        <input
                                                            type="checkbox"
                                                            className="toggle-check"
                                                            checked={form[field]}
                                                            onChange={(e) => setForm((s) => ({ ...s, [field]: e.target.checked }))}
                                                        />
                                                        {label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Crowd level */}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY, marginBottom: 8 }}>
                                                Crowd level: <span style={{ color: BRAND }}>{form.crowd_level}/5</span>
                                            </div>
                                            <input
                                                type="range" min={1} max={5} value={form.crowd_level}
                                                onChange={(e) => setForm((s) => ({ ...s, crowd_level: +e.target.value }))}
                                                style={{ width: "100%", accentColor: BRAND }}
                                            />
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                                                <span>Very quiet</span>
                                                <span>Very crowded</span>
                                            </div>
                                        </div>

                                        {/* Best time to visit */}
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY, marginBottom: 8 }}>Best time to visit (optional)</div>
                                            <input
                                                className="form-input"
                                                type="text"
                                                placeholder="e.g. Early morning, avoid evenings…"
                                                value={form.best_time_to_visit}
                                                onChange={(e) => setForm((s) => ({ ...s, best_time_to_visit: e.target.value }))}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting || form.overall === 0}
                                            className="action-btn action-btn-primary"
                                            style={{
                                                alignSelf: "flex-start",
                                                opacity: (submitting || form.overall === 0) ? 0.55 : 1,
                                                pointerEvents: (submitting || form.overall === 0) ? "none" : "auto",
                                            }}
                                        >
                                            {submitting ? "Submitting…" : "Submit Review"}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Success toast */}
                        {submitSuccess && (
                            <div style={{
                                background: BRAND_LIGHT, border: `1.5px solid ${BRAND}`,
                                borderRadius: 12, padding: "12px 18px",
                                display: "flex", alignItems: "center", gap: 10,
                                fontSize: 13, fontWeight: 600, color: BRAND_DARK,
                                animation: "fadeUp 0.3s ease",
                            }}>
                                Review submitted! Thank you for helping the community.
                            </div>
                        )}

                        {/* ── Reviews ────────────────────────────────────────────────────── */}
                        <div className="section-anim" style={{ animationDelay: "160ms" }}>
                            {/* <div style={{
                fontWeight: 800, fontSize: 15, color: TEXT_PRIMARY,
                marginBottom: 12, display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ background: BRAND, color: WHITE, fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 99 }}>
                  {reviews.length}
                </span>
                {reviews.length !== 1 ? "Reviews" : "Review"}
              </div> */}

                            {reviews.length === 0 ? (
                                <div style={{
                                    background: WHITE, borderRadius: 18, border: `1.5px solid ${SURFACE}`,
                                    padding: "36px 24px", textAlign: "center",
                                }}>
                                    <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                                    <div style={{ fontWeight: 700, color: TEXT_PRIMARY, marginBottom: 6 }}>No reviews yet</div>
                                    <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 16 }}>Be the first to share your experience!</div>
                                    <button
                                        className="action-btn action-btn-primary"
                                        onClick={() => setShowReviewForm(true)}
                                    >Write a review</button>
                                </div>
                            ) : (
                                reviews.map((r) => <ReviewCard key={r.id} review={r} />)
                            )}
                        </div>

                        {/* ── Map mini preview ────────────────────────────────────────────── */}
                        <div className="section-anim" style={{ animationDelay: "200ms" }}>
                            <Section title="Location">
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: TEXT_PRIMARY }}>{toilet.address}</div>
                                    {toilet.landmark && (
                                        <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3 }}>
                                            Near {toilet.landmark}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                                        {toilet.city}, {toilet.district}
                                    </div>
                                </div>

                                {/* Embed a static map tile */}
                                <a
                                    href={`https://www.google.com/maps?q=${toilet.latitude},${toilet.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: "block", textDecoration: "none" }}
                                >
                                    <div style={{
                                        height: 160,
                                        borderRadius: 12,
                                        overflow: "hidden",
                                        border: `1.5px solid ${SURFACE}`,
                                        position: "relative",
                                        background: SURFACE,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <img
                                            src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+10B57E(${toilet.longitude},${toilet.latitude})/${toilet.longitude},${toilet.latitude},15,0/600x160@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
                                            alt="Map location"
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                                e.currentTarget.parentElement.innerHTML = `
                          <div style="text-align:center;color:${TEXT_MUTED};font-size:13px;">
                            <div style="font-size:28px;margin-bottom:8px"></div>
                            <div>${toilet.latitude}, ${toilet.longitude}</div>
                            <div style="margin-top:6px;color:${BRAND_DARK};font-weight:600">Open in maps →</div>
                          </div>
                        `;
                                            }}
                                        />
                                        {/* Hover overlay */}
                                        <div style={{
                                            position: "absolute", inset: 0,
                                            background: "rgba(16,181,126,0.08)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            opacity: 0, transition: "opacity 0.2s ease",
                                            borderRadius: 12,
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                                        >
                                            <span style={{
                                                background: WHITE, color: BRAND_DARK, fontWeight: 700, fontSize: 13,
                                                padding: "8px 18px", borderRadius: 99,
                                                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                                            }}>Open in maps →</span>
                                        </div>
                                    </div>
                                </a>
                            </Section>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}

const backBtnStyle = {
    background: BRAND, color: WHITE, border: "none",
    borderRadius: 12, padding: "10px 22px", fontSize: 14,
    fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
};
