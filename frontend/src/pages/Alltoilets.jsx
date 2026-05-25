// src/pages/AllToilets.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import Sidebar from "../components/Sidebar";
import {
    fetchToilets,
    fetchToiletById,
    updateToilet,
    uploadToiletPhoto,
    deleteToiletPhoto,
    updateToiletPhoto,
    fetchReviews,
    updateReview,
} from "../services/toiletService";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
    { value: "PUBLIC", label: "Public" },
    { value: "MALL", label: "Mall" },
    { value: "RESTAURANT", label: "Restaurant" },
    { value: "PETROL_STATION", label: "Petrol Station" },
    { value: "HOSPITAL", label: "Hospital" },
    { value: "RAILWAY", label: "Railway" },
    { value: "BUS_STAND", label: "Bus Stand" },
    { value: "BEACH", label: "Beach" },
    { value: "PARK", label: "Park" },
    { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "Draft" },
    { value: "PUBLISHED", label: "Published" },
    { value: "CLOSED", label: "Closed" },
];

const STATUS_STYLE = {
    DRAFT: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    PUBLISHED: "bg-green-500/10  text-green-400  border border-green-500/20",
    CLOSED: "bg-red-500/10    text-red-400    border border-red-500/20",
};

const CATEGORY_ICON = {
    PUBLIC: "🏛️",
    MALL: "🏬",
    RESTAURANT: "🍽️",
    PETROL_STATION: "⛽",
    HOSPITAL: "🏥",
    RAILWAY: "🚉",
    BUS_STAND: "🚌",
    BEACH: "🏖️",
    PARK: "🌳",
    OTHER: "📍",
};

const WATER_OPTIONS = [
    { value: "AVAILABLE", label: "Available" },
    { value: "SOMETIMES", label: "Sometimes Available" },
    { value: "UNAVAILABLE", label: "Not Available" },
];

// ─────────────────────────────────────────────────────────
// Reusable UI
// ─────────────────────────────────────────────────────────

const baseCls =
    "bg-[#07090f] border border-[#181e2e] rounded-xl text-slate-300 px-3 py-2.5 text-sm outline-none w-full focus:border-blue-600 transition-colors";

function Input(props) {
    return <input className={baseCls} {...props} />;
}

function Select({ children, ...props }) {
    return (
        <select className={`${baseCls} cursor-pointer`} {...props}>
            {children}
        </select>
    );
}

function Field({ label, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {label}
            </label>
            {children}
        </div>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex items-center gap-3 cursor-pointer" onClick={onChange}>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-blue-600" : "bg-[#1a1f2e]"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-slate-400">{label}</span>
        </label>
    );
}

function SectionLabel({ children }) {
    return (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-8 mb-4 first:mt-0">
            {children}
        </p>
    );
}

function RatingInput({ label, value, onChange }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-[#111827]">
            <span className="text-sm text-slate-400">{label}</span>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        className={`text-xl transition-colors ${n <= value ? "text-yellow-400" : "text-slate-700 hover:text-slate-500"}`}
                    >
                        ★
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Map Picker
// ─────────────────────────────────────────────────────────

function MapPicker({ latitude, longitude, onSelect }) {
    const [viewState, setViewState] = useState({
        longitude: longitude || 76.2673,
        latitude: latitude || 9.9312,
        zoom: latitude ? 14 : 10,
    });

    const handleClick = useCallback((e) => {
        const { lng, lat } = e.lngLat;
        onSelect(lat.toFixed(6), lng.toFixed(6));
    }, [onSelect]);

    return (
        <div className="rounded-xl overflow-hidden border border-[#1e293b]" style={{ height: 240 }}>
            <Map
                {...viewState}
                onMove={(e) => setViewState(e.viewState)}
                onClick={handleClick}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                style={{ width: "100%", height: "100%" }}
            >
                <NavigationControl position="top-right" />
                {latitude && longitude && (
                    <Marker latitude={parseFloat(latitude)} longitude={parseFloat(longitude)}>
                        <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white" />
                    </Marker>
                )}
            </Map>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function parseOperatingHours(str) {
    if (!str) return { from: "", to: "" };
    const parts = str.split(" - ");
    return { from: parts[0] ?? "", to: parts[1] ?? "" };
}

function StarDisplay({ value }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`text-sm ${n <= value ? "text-yellow-400" : "text-slate-700"}`}>★</span>
            ))}
            <span className="text-xs text-slate-500 ml-1">{value}/5</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Review Modal
// ─────────────────────────────────────────────────────────

function ReviewModal({ toilet, onClose }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingReview, setEditingReview] = useState(null); // review object being edited
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            setError(null);
            if (typeof fetchReviews !== "function") {
                throw new Error("fetchReviews is not defined in toiletService — please add it.");
            }
            const res = await fetchReviews(toilet.id);
            const data = res.data?.results ?? res.data ?? [];
            setReviews(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("fetchReviews error:", err);
            setError(err.message ?? "Failed to load reviews.");
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (review) => {
        setEditingReview(review);
        setEditForm({ ...review });
        setSaveError(null);
        setSaveSuccess(false);
    };

    const cancelEdit = () => {
        setEditingReview(null);
        setEditForm(null);
        setSaveError(null);
        setSaveSuccess(false);
    };

    const handleSaveReview = async () => {
        try {
            setSaving(true);
            setSaveError(null);
            setSaveSuccess(false);

            const payload = {
                ...editForm,
                cleanliness: Number(editForm.cleanliness),
                smell: Number(editForm.smell),
                privacy: Number(editForm.privacy),
                lighting: Number(editForm.lighting),
                maintenance: Number(editForm.maintenance),
                safety: Number(editForm.safety),
                overall: Number(editForm.overall),
                crowd_level: Number(editForm.crowd_level),
            };

            const res = await updateReview(editForm.id, payload);
            setReviews((prev) =>
                prev.map((r) => (r.id === editForm.id ? { ...r, ...res.data } : r))
            );
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                cancelEdit();
            }, 1500);
        } catch (err) {
            console.error("updateReview error:", err);
            setSaveError(err.response?.data?.detail ?? "Failed to save review.");
        } finally {
            setSaving(false);
        }
    };

    const setEditField = (field, value) => {
        setEditForm((p) => ({ ...p, [field]: value }));
    };

    // Prevent backdrop click when interacting with modal content
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6"
            onClick={handleBackdropClick}
        >
            <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1f2e] shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white truncate max-w-[420px]">
                            {toilet.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {toilet.city}{toilet.district ? `, ${toilet.district}` : ""} · Reviews
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-[#1a1f2e] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal body */}
                <div className="flex-1 overflow-y-auto px-6 py-6">

                    {loading && (
                        <div className="flex items-center justify-center py-16 text-slate-600">
                            Loading reviews…
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {!loading && !error && reviews.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
                            <span className="text-4xl">📝</span>
                            <p className="text-sm">No reviews yet for this toilet.</p>
                        </div>
                    )}

                    {/* ── Review list ── */}
                    {!loading && !error && reviews.length > 0 && !editingReview && (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="bg-[#0d1018] border border-[#181e2e] rounded-xl p-5"
                                >
                                    {/* Review header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-white font-semibold text-sm">
                                                    Overall
                                                </span>
                                                <StarDisplay value={review.overall} />
                                            </div>
                                            <p className="text-xs text-slate-600">
                                                Visited: {review.visited_at
                                                    ? new Date(review.visited_at).toLocaleString("en-IN", {
                                                        dateStyle: "medium", timeStyle: "short"
                                                    })
                                                    : "—"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => startEdit(review)}
                                            className="px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#222840] rounded-lg text-slate-300 hover:text-white text-xs font-medium transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    {/* Ratings grid */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
                                        {[
                                            ["Cleanliness", review.cleanliness],
                                            ["Smell", review.smell],
                                            ["Privacy", review.privacy],
                                            ["Lighting", review.lighting],
                                            ["Maintenance", review.maintenance],
                                            ["Safety", review.safety],
                                        ].map(([label, val]) => (
                                            <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#111827]">
                                                <span className="text-xs text-slate-500">{label}</span>
                                                <StarDisplay value={val} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className="px-2.5 py-1 bg-[#111827] rounded-lg text-slate-400">
                                            💧 Water: {review.water_availability_display ?? review.water_availability}
                                        </span>
                                        <span className="px-2.5 py-1 bg-[#111827] rounded-lg text-slate-400">
                                            👥 Crowd: {review.crowd_level}/5
                                        </span>
                                        {review.best_time_to_visit && (
                                            <span className="px-2.5 py-1 bg-[#111827] rounded-lg text-slate-400">
                                                ⏰ Best time: {review.best_time_to_visit}
                                            </span>
                                        )}
                                    </div>

                                    {/* Facilities */}
                                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                        {review.has_soap && <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">Soap</span>}
                                        {review.has_mirror && <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">Mirror</span>}
                                        {review.has_dustbin && <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">Dustbin</span>}
                                        {review.has_hand_dryer && <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">Hand Dryer</span>}
                                        {review.has_sanitary_vending && <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">Sanitary Vending</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Edit form ── */}
                    {editingReview && editForm && (
                        <div>
                            {/* Back button */}
                            <button
                                onClick={cancelEdit}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 mb-6 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to reviews
                            </button>

                            {saveError && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                                    {saveError}
                                </div>
                            )}
                            {saveSuccess && (
                                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-6 text-sm">
                                    Review saved successfully.
                                </div>
                            )}

                            {/* Ratings */}
                            <SectionLabel>Ratings</SectionLabel>
                            <div className="grid grid-cols-2 gap-x-8">
                                <div>
                                    <RatingInput label="Cleanliness" value={editForm.cleanliness} onChange={(v) => setEditField("cleanliness", v)} />
                                    <RatingInput label="Smell" value={editForm.smell} onChange={(v) => setEditField("smell", v)} />
                                    <RatingInput label="Privacy" value={editForm.privacy} onChange={(v) => setEditField("privacy", v)} />
                                    <RatingInput label="Lighting" value={editForm.lighting} onChange={(v) => setEditField("lighting", v)} />
                                </div>
                                <div>
                                    <RatingInput label="Maintenance" value={editForm.maintenance} onChange={(v) => setEditField("maintenance", v)} />
                                    <RatingInput label="Safety" value={editForm.safety} onChange={(v) => setEditField("safety", v)} />
                                    <RatingInput label="Overall" value={editForm.overall} onChange={(v) => setEditField("overall", v)} />
                                    <RatingInput
                                        label="Crowd Level (1 = Empty, 5 = Always crowded)"
                                        value={editForm.crowd_level}
                                        onChange={(v) => setEditField("crowd_level", v)}
                                    />
                                </div>
                            </div>

                            {/* Water & Timing */}
                            <SectionLabel>Water &amp; Timing</SectionLabel>
                            <div className="grid grid-cols-2 gap-5">
                                <Field label="Water Availability">
                                    <Select
                                        value={editForm.water_availability}
                                        onChange={(e) => setEditField("water_availability", e.target.value)}
                                    >
                                        {WATER_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label="Best Time to Visit">
                                    <Input
                                        value={editForm.best_time_to_visit ?? ""}
                                        onChange={(e) => setEditField("best_time_to_visit", e.target.value)}
                                        placeholder="e.g. Early morning"
                                    />
                                </Field>
                                <Field label="Visited At">
                                    <Input
                                        type="datetime-local"
                                        value={editForm.visited_at
                                            ? editForm.visited_at.slice(0, 16)
                                            : ""}
                                        onChange={(e) => setEditField("visited_at", e.target.value)}
                                    />
                                </Field>
                            </div>

                            {/* Facilities */}
                            <SectionLabel>Facilities</SectionLabel>
                            <div className="grid grid-cols-2 gap-4">
                                <Toggle label="Soap Available" checked={editForm.has_soap} onChange={() => setEditField("has_soap", !editForm.has_soap)} />
                                <Toggle label="Mirror Available" checked={editForm.has_mirror} onChange={() => setEditField("has_mirror", !editForm.has_mirror)} />
                                <Toggle label="Dustbin Available" checked={editForm.has_dustbin} onChange={() => setEditField("has_dustbin", !editForm.has_dustbin)} />
                                <Toggle label="Hand Dryer" checked={editForm.has_hand_dryer} onChange={() => setEditField("has_hand_dryer", !editForm.has_hand_dryer)} />
                                <Toggle label="Sanitary Vending Machine" checked={editForm.has_sanitary_vending} onChange={() => setEditField("has_sanitary_vending", !editForm.has_sanitary_vending)} />
                            </div>

                            {/* Admin Note */}
                            <SectionLabel>Admin Note</SectionLabel>
                            <textarea
                                value={editForm.admin_note ?? ""}
                                onChange={(e) => setEditField("admin_note", e.target.value)}
                                placeholder="Internal note — not shown publicly"
                                rows={3}
                                className="bg-[#07090f] border border-[#181e2e] rounded-xl text-slate-300 px-3 py-2.5 text-sm outline-none w-full focus:border-blue-600 transition-colors resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Modal footer — only shown in edit mode */}
                {editingReview && (
                    <div className="px-6 py-4 border-t border-[#1a1f2e] shrink-0 flex justify-end gap-3">
                        <button
                            onClick={cancelEdit}
                            className="px-5 py-2.5 bg-[#1a1f2e] rounded-xl text-slate-300 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveReview}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

export default function AllToilets() {
    // ── List state ──────────────────────────────────────
    const [toilets, setToilets] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [listError, setListError] = useState(null);

    // ── Drawer state ─────────────────────────────────────
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("details");

    // ── Details/edit state ───────────────────────────────
    const [editData, setEditData] = useState(null);
    const [opHours, setOpHours] = useState({ from: "", to: "" });
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showMap, setShowMap] = useState(false);

    // ── Photo state ──────────────────────────────────────
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [pendingPhotos, setPendingPhotos] = useState([]);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState(null);
    const [coverSetting, setCoverSetting] = useState(null);

    // ── Review modal state ───────────────────────────────
    const [reviewModalToilet, setReviewModalToilet] = useState(null);

    const fileInputRef = useRef(null);

    // ─────────────────────────────────────────────────────
    // Load toilet list
    // ─────────────────────────────────────────────────────

    useEffect(() => { loadToilets(); }, []);

    const loadToilets = async () => {
        try {
            setListLoading(true);
            setListError(null);
            const res = await fetchToilets();
            setToilets(res.data?.results ?? res.data ?? []);
        } catch (err) {
            console.error("fetchToilets error:", err);
            setListError("Failed to load toilets.");
        } finally {
            setListLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────
    // Fetch toilet details (for Details + Photos tabs)
    // ─────────────────────────────────────────────────────

    const loadToiletDetails = async (toiletId) => {
        try {
            setDetailsLoading(true);
            setDetailsError(null);
            const res = await fetchToiletById(toiletId);
            const t = res.data;
            setEditData(t);
            setOpHours(parseOperatingHours(t.operating_hours));
            setExistingPhotos(t.photos ?? []);
        } catch (err) {
            console.error("fetchToiletById error:", err);
            setDetailsError("Failed to load toilet details.");
        } finally {
            setDetailsLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────
    // Open drawer
    // ─────────────────────────────────────────────────────

    const openDrawer = (toilet, tab = "details") => {
        setDrawerOpen(true);
        setActiveTab(tab);
        setEditData(null);
        setExistingPhotos([]);
        setPendingPhotos([]);
        setSaveError(null);
        setSaveSuccess(false);
        setShowMap(false);
        setPhotoError(null);
        setCoverSetting(null);
        setDetailsError(null);

        loadToiletDetails(toilet.id);
    };

    const closeDrawer = () => {
        pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        setPendingPhotos([]);
        setDrawerOpen(false);
        setEditData(null);
    };

    // ─────────────────────────────────────────────────────
    // Edit handlers
    // ─────────────────────────────────────────────────────

    const handleEdit = (e) => {
        const { name, value, type, checked } = e.target;
        setEditData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    };

    const handleMapSelect = (lat, lng) => {
        setEditData((p) => ({ ...p, latitude: lat, longitude: lng }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setSaveError(null);
            setSaveSuccess(false);

            const operating_hours =
                opHours.from && opHours.to
                    ? `${opHours.from} - ${opHours.to}`
                    : "";

            const payload = {
                ...editData,
                latitude: parseFloat(editData.latitude),
                longitude: parseFloat(editData.longitude),
                price_inr: editData.price_inr ? parseFloat(editData.price_inr) : null,
                operating_hours,
            };

            const res = await updateToilet(editData.id, payload);
            setToilets((prev) =>
                prev.map((t) => (t.id === editData.id ? { ...t, ...res.data } : t))
            );
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("updateToilet error:", err);
            setSaveError(err.response?.data?.detail ?? "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    // ─────────────────────────────────────────────────────
    // Photo handlers
    // ─────────────────────────────────────────────────────

    const handlePhotoFiles = (files) => {
        if (!files?.length) return;
        const entries = Array.from(files).map((file) => ({
            localId: `local-${Date.now()}-${Math.random()}`,
            file,
            previewUrl: URL.createObjectURL(file),
        }));
        setPendingPhotos((p) => [...p, ...entries]);
    };

    const handleRemovePending = (localId) => {
        setPendingPhotos((p) => {
            const entry = p.find((x) => x.localId === localId);
            if (entry) URL.revokeObjectURL(entry.previewUrl);
            return p.filter((x) => x.localId !== localId);
        });
    };

    const handleUploadPhotos = async () => {
        if (!pendingPhotos.length) return;
        setPhotoUploading(true);
        setPhotoError(null);
        try {
            const formData = new FormData();
            pendingPhotos.forEach((e) => formData.append("photos", e.file));
            const res = await uploadToiletPhoto(editData.id, formData);
            const uploaded = Array.isArray(res.data) ? res.data : [res.data];
            setExistingPhotos((p) => [...p, ...uploaded]);
            pendingPhotos.forEach((e) => URL.revokeObjectURL(e.previewUrl));
            setPendingPhotos([]);
        } catch (err) {
            console.error("uploadToiletPhoto error:", err);
            setPhotoError("Upload failed. Please try again.");
        } finally {
            setPhotoUploading(false);
        }
    };

    const handleDeletePhoto = async (photoId) => {
        try {
            await deleteToiletPhoto(editData.id, photoId);
            setExistingPhotos((p) => p.filter((x) => x.id !== photoId));
        } catch (err) {
            console.error("deleteToiletPhoto error:", err);
        }
    };

    const handleSetCover = async (photoId) => {
        try {
            setCoverSetting(photoId);
            await updateToiletPhoto(editData.id, photoId, { is_cover: true });
            setExistingPhotos((p) =>
                p.map((x) => ({ ...x, is_cover: x.id === photoId }))
            );
        } catch (err) {
            console.error("updateToiletPhoto error:", err);
            setPhotoError("Failed to set cover photo.");
        } finally {
            setCoverSetting(null);
        }
    };

    // ─────────────────────────────────────────────────────
    // Filtered list
    // ─────────────────────────────────────────────────────

    const filtered = toilets.filter((t) => {
        const q = search.toLowerCase();
        const matchSearch =
            t.name.toLowerCase().includes(q) ||
            t.city?.toLowerCase().includes(q) ||
            t.district?.toLowerCase().includes(q);
        const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    // ─────────────────────────────────────────────────────
    // Derived loading flag for Details/Photos tabs
    // ─────────────────────────────────────────────────────

    const detailsReady = !detailsLoading && editData !== null;

    // ─────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────

    return (
        <div className="flex min-h-screen bg-[#07090f]">
            <Sidebar />

            <main className="flex-1 px-10 py-10 overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">All Toilets</h1>
                        <p className="text-slate-500 mt-1">
                            {toilets.length} toilet{toilets.length !== 1 ? "s" : ""} total
                        </p>
                    </div>
                    <button
                        onClick={loadToilets}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1f2e] rounded-xl text-slate-300 hover:text-white text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, city or district…"
                            className="w-full bg-[#0d1018] border border-[#181e2e] rounded-xl text-slate-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-blue-600 transition-colors"
                        />
                    </div>
                    {["ALL", "DRAFT", "PUBLISHED", "CLOSED"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterStatus === s
                                    ? "bg-blue-600 text-white"
                                    : "bg-[#0d1018] border border-[#181e2e] text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* List error */}
                {listError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
                        {listError}
                    </div>
                )}

                {/* Table */}
                {listLoading ? (
                    <div className="flex items-center justify-center py-32 text-slate-600">
                        Loading toilets…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-600 gap-3">
                        <span className="text-5xl">🚽</span>
                        <p>No toilets found.</p>
                    </div>
                ) : (
                    <div className="bg-[#0d1018] border border-[#181e2e] rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#181e2e]">
                                    {["Toilet", "Location", "Category", "Free", "Status", ""].map((h) => (
                                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3.5">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#0f1420]">
                                {filtered.map((toilet) => (
                                    <tr
                                        key={toilet.id}
                                        className="hover:bg-[#0f1420] transition-colors cursor-pointer"
                                        onClick={() => { console.log("ROW CLICKED", toilet.id); setReviewModalToilet(toilet); }}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="text-slate-200 font-medium">{toilet.name}</div>
                                            <div className="text-slate-600 text-xs mt-0.5 font-mono truncate max-w-[160px]">
                                                {toilet.id.slice(0, 8)}…
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-slate-300">{toilet.city}</div>
                                            <div className="text-slate-600 text-xs">{toilet.district}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-slate-400">
                                                {CATEGORY_ICON[toilet.category]}{" "}
                                                {CATEGORY_OPTIONS.find((c) => c.value === toilet.category)?.label ?? toilet.category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            {toilet.is_free ? (
                                                <span className="text-green-400">Free</span>
                                            ) : (
                                                <span className="text-slate-400">₹{toilet.price_inr}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_STYLE[toilet.status] ?? ""}`}>
                                                {toilet.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openDrawer(toilet, "details"); }}
                                                    className="px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#222840] rounded-lg text-slate-300 hover:text-white text-xs font-medium transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* ── Review modal ── */}
            {reviewModalToilet && (
                <ReviewModal
                    toilet={reviewModalToilet}
                    onClose={() => setReviewModalToilet(null)}
                />
            )}

            {/* ── Drawer backdrop ── */}
            {drawerOpen && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
            )}

            {/* ── Slide-over panel ── */}
            <aside
                className={`fixed top-0 right-0 h-full w-[540px] bg-[#0a0d14] border-l border-[#1a1f2e] z-50 flex flex-col transition-transform duration-300 ${drawerOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
                    }`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1f2e] shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white truncate max-w-[340px]">
                            {editData?.name ?? "Loading…"}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {editData?.city}{editData?.district ? `, ${editData.district}` : ""}
                        </p>
                    </div>
                    <button
                        onClick={closeDrawer}
                        className="w-8 h-8 rounded-lg bg-[#1a1f2e] flex items-center justify-center text-slate-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#1a1f2e] shrink-0">
                    {["details", "photos"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab
                                    ? "text-blue-400 border-b-2 border-blue-500"
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            {tab}
                            {tab === "photos" && existingPhotos.length > 0 && (
                                <span className="ml-1.5 text-xs bg-[#1a1f2e] text-slate-400 px-1.5 py-0.5 rounded">
                                    {existingPhotos.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto px-6 py-6">

                    {/* ── Details tab ── */}
                    {activeTab === "details" && (
                        detailsLoading ? (
                            <div className="flex items-center justify-center h-40 text-slate-600">Loading…</div>
                        ) : detailsError ? (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                                {detailsError}
                            </div>
                        ) : editData ? (
                            <div className="space-y-0">
                                {saveError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                                        {saveError}
                                    </div>
                                )}
                                {saveSuccess && (
                                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-6 text-sm">
                                        Changes saved successfully.
                                    </div>
                                )}

                                <SectionLabel>Basic Info</SectionLabel>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Name *">
                                        <Input name="name" value={editData.name} onChange={handleEdit} />
                                    </Field>
                                    <Field label="Status">
                                        <Select name="status" value={editData.status} onChange={handleEdit}>
                                            {STATUS_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                    <Field label="Category">
                                        <Select name="category" value={editData.category} onChange={handleEdit}>
                                            {CATEGORY_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                </div>

                                <SectionLabel>Location</SectionLabel>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Address">
                                        <Input name="address" value={editData.address ?? ""} onChange={handleEdit} />
                                    </Field>
                                    <Field label="City">
                                        <Input name="city" value={editData.city ?? ""} onChange={handleEdit} />
                                    </Field>
                                    <Field label="District">
                                        <Input name="district" value={editData.district ?? ""} onChange={handleEdit} />
                                    </Field>
                                    <Field label="Landmark">
                                        <Input name="landmark" value={editData.landmark ?? ""} onChange={handleEdit} placeholder="Nearby landmark" />
                                    </Field>
                                    <Field label="Latitude">
                                        <Input name="latitude" type="number" value={editData.latitude ?? ""} onChange={handleEdit} />
                                    </Field>
                                    <Field label="Longitude">
                                        <Input name="longitude" type="number" value={editData.longitude ?? ""} onChange={handleEdit} />
                                    </Field>
                                </div>

                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowMap((p) => !p)}
                                        className="px-3 py-1.5 bg-[#1a1f2e] rounded-lg text-slate-400 text-xs"
                                    >
                                        {showMap ? "Hide Map" : "Adjust on Map"}
                                    </button>
                                    {showMap && (
                                        <div className="mt-3">
                                            <MapPicker
                                                latitude={parseFloat(editData.latitude)}
                                                longitude={parseFloat(editData.longitude)}
                                                onSelect={handleMapSelect}
                                            />
                                        </div>
                                    )}
                                </div>

                                <SectionLabel>Contact &amp; Links</SectionLabel>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Phone">
                                        <Input name="phone_number" value={editData.phone_number ?? ""} onChange={handleEdit} placeholder="+91 XXXXX XXXXX" />
                                    </Field>
                                    <Field label="Google Maps URL">
                                        <Input name="google_maps_url" value={editData.google_maps_url ?? ""} onChange={handleEdit} placeholder="https://maps.google.com/…" />
                                    </Field>
                                    <Field label="OSM Node ID">
                                        <Input name="osm_node_id" value={editData.osm_node_id ?? ""} onChange={handleEdit} />
                                    </Field>
                                </div>

                                <SectionLabel>Pricing</SectionLabel>
                                <div className="grid grid-cols-2 gap-4 items-end">
                                    <Toggle
                                        label="Free to Use"
                                        checked={editData.is_free}
                                        onChange={() =>
                                            setEditData((p) => ({
                                                ...p,
                                                is_free: !p.is_free,
                                                price_inr: !p.is_free ? "" : p.price_inr,
                                            }))
                                        }
                                    />
                                    {!editData.is_free && (
                                        <Field label="Price (₹)">
                                            <Input name="price_inr" type="number" min="0" value={editData.price_inr ?? ""} onChange={handleEdit} />
                                        </Field>
                                    )}
                                </div>

                                <SectionLabel>Operating Hours</SectionLabel>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="From">
                                        <Input
                                            type="time"
                                            value={opHours.from}
                                            onChange={(e) => setOpHours((p) => ({ ...p, from: e.target.value }))}
                                        />
                                    </Field>
                                    <Field label="To">
                                        <Input
                                            type="time"
                                            value={opHours.to}
                                            onChange={(e) => setOpHours((p) => ({ ...p, to: e.target.value }))}
                                        />
                                    </Field>
                                </div>

                                <SectionLabel>Amenities</SectionLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: "is_wheelchair_accessible", label: "Wheelchair Accessible" },
                                        { key: "is_women_friendly", label: "Women Friendly" },
                                        { key: "has_western_toilet", label: "Western Toilet" },
                                        { key: "has_indian_toilet", label: "Indian Toilet" },
                                        { key: "has_baby_changing", label: "Baby Changing" },
                                        { key: "has_parking", label: "Parking Available" },
                                    ].map(({ key, label }) => (
                                        <Toggle
                                            key={key}
                                            label={label}
                                            checked={editData[key]}
                                            onChange={() => setEditData((p) => ({ ...p, [key]: !p[key] }))}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : null
                    )}

                    {/* ── Photos tab ── */}
                    {activeTab === "photos" && (
                        detailsLoading ? (
                            <div className="flex items-center justify-center h-40 text-slate-600">Loading…</div>
                        ) : (
                            <div>
                                {photoError && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                                        {photoError}
                                    </div>
                                )}

                                {existingPhotos.length > 0 && (
                                    <>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                            Uploaded ({existingPhotos.length})
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            {existingPhotos.map((photo) => (
                                                <div key={photo.id} className="relative rounded-xl overflow-hidden border border-[#1e293b] group">
                                                    <img src={photo.image_url} className="w-full aspect-square object-cover" alt="" />
                                                    {photo.is_cover && (
                                                        <span className="absolute bottom-2 left-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                                                            Cover
                                                        </span>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                        {!photo.is_cover && (
                                                            <button
                                                                onClick={() => handleSetCover(photo.id)}
                                                                disabled={coverSetting === photo.id}
                                                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-[10px] font-semibold disabled:opacity-60"
                                                            >
                                                                {coverSetting === photo.id ? "Setting…" : "Set as Cover"}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeletePhoto(photo.id)}
                                                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 rounded-lg text-white text-[10px] font-semibold"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {pendingPhotos.length > 0 && (
                                    <>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                            Pending upload ({pendingPhotos.length})
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {pendingPhotos.map((photo) => (
                                                <div key={photo.localId} className="relative rounded-xl overflow-hidden border border-dashed border-blue-500/40 group">
                                                    <img src={photo.previewUrl} className="w-full aspect-square object-cover opacity-70" alt="" />
                                                    <button
                                                        onClick={() => handleRemovePending(photo.localId)}
                                                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-base"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleUploadPhotos}
                                            disabled={photoUploading}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold mb-6 disabled:opacity-50"
                                        >
                                            {photoUploading
                                                ? `Uploading ${pendingPhotos.length} photo${pendingPhotos.length !== 1 ? "s" : ""}…`
                                                : `Upload ${pendingPhotos.length} Photo${pendingPhotos.length !== 1 ? "s" : ""}`}
                                        </button>
                                    </>
                                )}

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDrop={(e) => { e.preventDefault(); handlePhotoFiles(e.dataTransfer.files); }}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="border-2 border-dashed border-[#334155] hover:border-blue-600 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => { handlePhotoFiles(e.target.files); e.target.value = ""; }}
                                    />
                                    <div className="text-3xl mb-2">📷</div>
                                    <div className="text-slate-400 text-sm">Drop photos or click to browse</div>
                                    <div className="text-slate-600 text-xs mt-1">Selected photos upload when you click Upload</div>
                                </div>
                            </div>
                        )
                    )}

                </div>

                {/* Drawer footer — only for Details tab */}
                {activeTab === "details" && detailsReady && (
                    <div className="px-6 py-4 border-t border-[#1a1f2e] shrink-0 flex justify-end gap-3">
                        <button
                            onClick={closeDrawer}
                            className="px-5 py-2.5 bg-[#1a1f2e] rounded-xl text-slate-300 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
}