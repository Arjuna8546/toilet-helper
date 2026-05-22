// src/pages/AddToilet.jsx

import { useState, useCallback, useRef } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import Sidebar from "../components/Sidebar";

import {
    createToilet,
    createReview,
    uploadToiletPhoto,
    deleteToiletPhoto,
} from "../services/toiletService";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// ─────────────────────────────────────────────────────────
// Options
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

const WATER_OPTIONS = [
    { value: "ALWAYS", label: "Always" },
    { value: "SOMETIMES", label: "Sometimes" },
    { value: "NEVER", label: "Never" },
    { value: "UNKNOWN", label: "Unknown" },
];

const CROWD_OPTIONS = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
];

// ─────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────

const TOILET_INIT = {
    name: "",
    category: "PUBLIC",
    status: "DRAFT",

    latitude: "",
    longitude: "",

    address: "",
    city: "",

    district: "",
    landmark: "",

    google_maps_url: "",
    osm_node_id: "",

    is_free: true,
    price_inr: "",

    operating_hours_from: "",
    operating_hours_to: "",

    phone_number: "",

    is_wheelchair_accessible: false,
    is_women_friendly: false,
    has_western_toilet: false,
    has_indian_toilet: false,
    has_baby_changing: false,
    has_parking: false,
};

const REVIEW_INIT = {
    cleanliness: 3,
    smell: 3,
    privacy: 3,
    lighting: 3,
    maintenance: 3,
    safety: 3,
    overall: 3,

    water_availability: "UNKNOWN",
    crowd_level: "LOW",

    has_soap: false,
    has_mirror: false,
    has_dustbin: false,
    has_hand_dryer: false,
    has_sanitary_vending: false,

    best_time_to_visit: "",

    visited_at: new Date().toISOString().slice(0, 16),

    admin_note: "",
};

const STEPS = [
    "Toilet Details",
    "Photos",
    "Initial Review",
    "Completed",
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
        <label
            className="flex items-center gap-3 cursor-pointer"
            onClick={onChange}
        >
            <div
                className={`w-10 h-5 rounded-full transition-colors relative ${checked ? "bg-blue-600" : "bg-[#1a1f2e]"
                    }`}
            >
                <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"
                        }`}
                />
            </div>

            <span className="text-sm text-slate-400">{label}</span>
        </label>
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
                        className={`text-xl ${n <= value ? "text-yellow-400" : "text-slate-700"
                            }`}
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

    const handleClick = useCallback(
        (e) => {
            const { lng, lat } = e.lngLat;
            onSelect(lat.toFixed(6), lng.toFixed(6));
        },
        [onSelect]
    );

    return (
        <div
            className="rounded-xl overflow-hidden border border-[#1e293b]"
            style={{ height: 300 }}
        >
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
                    <Marker
                        latitude={parseFloat(latitude)}
                        longitude={parseFloat(longitude)}
                    >
                        <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white" />
                    </Marker>
                )}
            </Map>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

export default function AddToilet() {
    const [step, setStep] = useState(1);

    const [loading, setLoading] = useState(false);

    const [toilet, setToilet] = useState(TOILET_INIT);

    const [createdToilet, setCreatedToilet] = useState(null);

    const [review, setReview] = useState(REVIEW_INIT);

    const [addReview, setAddReview] = useState(true);

    const [photos, setPhotos] = useState([]);

    const [photoUploading, setPhotoUploading] = useState(false);

    const [showMap, setShowMap] = useState(false);

    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

    const toiletId = createdToilet?.id;

    // ─────────────────────────────────────────────────────

    const handleToilet = (e) => {
        const { name, value, type, checked } = e.target;

        setToilet((p) => ({
            ...p,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleMapSelect = (lat, lng) => {
        setToilet((p) => ({
            ...p,
            latitude: lat,
            longitude: lng,
        }));
    };

    // ─────────────────────────────────────────────────────
    // Step 1 Create Toilet
    // ─────────────────────────────────────────────────────

    const handleCreateToilet = async () => {
        try {
            setLoading(true);
            setError(null);

            // Validation
            if (!toilet.name.trim()) {
                setError("Toilet name is required");
                return;
            }

            if (!toilet.address.trim()) {
                setError("Address is required");
                return;
            }

            if (!toilet.city.trim()) {
                setError("City is required");
                return;
            }

            if (!toilet.district.trim()) {
                setError("District is required");
                return;
            }

            if (!toilet.latitude || !toilet.longitude) {
                setError("Location is required");
                return;
            }

            const operating_hours =
                toilet.operating_hours_from && toilet.operating_hours_to
                    ? `${toilet.operating_hours_from} - ${toilet.operating_hours_to}`
                    : "";

            const payload = {
                ...toilet,

                district: toilet.district.trim(),

                latitude: parseFloat(toilet.latitude),
                longitude: parseFloat(toilet.longitude),

                price_inr: toilet.price_inr
                    ? parseFloat(toilet.price_inr)
                    : null,

                operating_hours,
            };

            const res = await createToilet(payload);

            setCreatedToilet(res.data);

            setStep(2);
        } catch (err) {
            console.log(err);

            console.log(err.response?.data);

            setError(
                err.response?.data?.district?.[0] ||
                "Failed to create toilet"
            );
        } finally {
            setLoading(false);
        }
    };
    // ─────────────────────────────────────────────────────
    // Photos
    // ─────────────────────────────────────────────────────

    const handlePhotoFiles = async (files) => {
        if (!files?.length) return;

        setPhotoUploading(true);

        for (const file of Array.from(files)) {
            const tempId = `temp-${Date.now()}`;

            const preview = URL.createObjectURL(file);

            setPhotos((p) => [
                ...p,
                {
                    id: tempId,
                    image_url: preview,
                    uploading: true,
                },
            ]);

            try {
                const formData = new FormData();

                formData.append("photo", file);

                const res = await uploadToiletPhoto(toiletId, formData);

                setPhotos((p) =>
                    p.map((photo) =>
                        photo.id === tempId
                            ? {
                                ...res.data,
                                uploading: false,
                            }
                            : photo
                    )
                );
            } catch (err) {
                console.log(err);

                setPhotos((p) => p.filter((x) => x.id !== tempId));
            }
        }

        setPhotoUploading(false);
    };

    const handleDeletePhoto = async (photoId) => {
        try {
            await deleteToiletPhoto(toiletId, photoId);

            setPhotos((p) => p.filter((x) => x.id !== photoId));
        } catch (err) {
            console.log(err);
        }
    };

    // ─────────────────────────────────────────────────────
    // Review
    // ─────────────────────────────────────────────────────

    const handleCreateReview = async () => {
        if (!addReview) {
            setStep(4);
            return;
        }

        try {
            setLoading(true);

            await createReview({
                ...review,

                toilet: toiletId,

                cleanliness: Number(review.cleanliness),
                smell: Number(review.smell),
                privacy: Number(review.privacy),
                lighting: Number(review.lighting),
                maintenance: Number(review.maintenance),
                safety: Number(review.safety),
                overall: Number(review.overall),
            });

            setStep(4);
        } catch (err) {
            console.log(err);

            setError("Failed to create review");
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────

    return (
        <div className="flex min-h-screen bg-[#07090f]">
            <Sidebar />

            <main className="flex-1 px-10 py-10 overflow-y-auto">
                {/* Header */}

                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-white">
                        Add New Toilet
                    </h1>

                    <p className="text-slate-500 mt-2">
                        Create toilet → upload photos → add initial review
                    </p>
                </div>

                {/* Stepper */}

                <div className="flex items-center justify-between mb-10">
                    {STEPS.map((label, index) => {
                        const current = index + 1;

                        return (
                            <div
                                key={label}
                                className="flex items-center flex-1"
                            >
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= current
                                            ? "bg-blue-600 text-white"
                                            : "bg-[#1a1f2e] text-slate-500"
                                        }`}
                                >
                                    {current}
                                </div>

                                <div className="ml-3">
                                    <div className="text-sm text-slate-300">
                                        {label}
                                    </div>
                                </div>

                                {index !== STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-[2px] mx-4 ${step > current
                                                ? "bg-blue-600"
                                                : "bg-[#1a1f2e]"
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Error */}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {/* STEP 1 */}

                {step === 1 && (
                    <div className="space-y-6">
                        {/* Basic */}

                        <div className="bg-[#0d1018] border border-[#181e2e] rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6">
                                Toilet Details
                            </h2>

                            <div className="grid grid-cols-2 gap-5">
                                <Field label="Toilet Name">
                                    <Input
                                        name="name"
                                        value={toilet.name}
                                        onChange={handleToilet}
                                    />
                                </Field>

                                <Field label="Category">
                                    <Select
                                        name="category"
                                        value={toilet.category}
                                        onChange={handleToilet}
                                    >
                                        {CATEGORY_OPTIONS.map((o) => (
                                            <option
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Address">
                                    <Input
                                        name="address"
                                        value={toilet.address}
                                        onChange={handleToilet}
                                    />
                                </Field>

                                <Field label="City">
                                    <Input
                                        name="city"
                                        value={toilet.city}
                                        onChange={handleToilet}
                                    />
                                    <Field label="District *">
                                        <Input
                                            name="district"
                                            value={toilet.district}
                                            onChange={handleToilet}
                                            placeholder="Ernakulam"
                                        />
                                    </Field>
                                </Field>

                                <Field label="Latitude">
                                    <Input
                                        name="latitude"
                                        type="number"
                                        value={toilet.latitude}
                                        onChange={handleToilet}
                                    />
                                </Field>

                                <Field label="Longitude">
                                    <Input
                                        name="longitude"
                                        type="number"
                                        value={toilet.longitude}
                                        onChange={handleToilet}
                                    />
                                </Field>
                            </div>

                            {/* Map */}

                            <div className="mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowMap((p) => !p)}
                                    className="px-4 py-2 bg-[#1a1f2e] rounded-lg text-slate-300"
                                >
                                    {showMap ? "Hide Map" : "Select on Map"}
                                </button>

                                {showMap && (
                                    <div className="mt-4">
                                        <MapPicker
                                            latitude={toilet.latitude}
                                            longitude={toilet.longitude}
                                            onSelect={handleMapSelect}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Amenities */}

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <Toggle
                                    label="Wheelchair Accessible"
                                    checked={toilet.is_wheelchair_accessible}
                                    onChange={() =>
                                        setToilet((p) => ({
                                            ...p,
                                            is_wheelchair_accessible:
                                                !p.is_wheelchair_accessible,
                                        }))
                                    }
                                />

                                <Toggle
                                    label="Women Friendly"
                                    checked={toilet.is_women_friendly}
                                    onChange={() =>
                                        setToilet((p) => ({
                                            ...p,
                                            is_women_friendly:
                                                !p.is_women_friendly,
                                        }))
                                    }
                                />

                                <Toggle
                                    label="Western Toilet"
                                    checked={toilet.has_western_toilet}
                                    onChange={() =>
                                        setToilet((p) => ({
                                            ...p,
                                            has_western_toilet:
                                                !p.has_western_toilet,
                                        }))
                                    }
                                />

                                <Toggle
                                    label="Indian Toilet"
                                    checked={toilet.has_indian_toilet}
                                    onChange={() =>
                                        setToilet((p) => ({
                                            ...p,
                                            has_indian_toilet:
                                                !p.has_indian_toilet,
                                        }))
                                    }
                                />
                            </div>

                            {/* Next */}

                            <div className="flex justify-end mt-10">
                                <button
                                    onClick={handleCreateToilet}
                                    disabled={loading}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-semibold"
                                >
                                    {loading
                                        ? "Creating..."
                                        : "Create Toilet & Continue"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2 */}

                {step === 2 && (
                    <div className="bg-[#0d1018] border border-[#181e2e] rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-2">
                            Upload Photos
                        </h2>

                        <p className="text-slate-500 mb-6">
                            Upload photos for this toilet
                        </p>

                        {/* Dropzone */}

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={(e) => {
                                e.preventDefault();
                                handlePhotoFiles(e.dataTransfer.files);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            className="border-2 border-dashed border-[#334155] rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*"
                                hidden
                                onChange={(e) =>
                                    handlePhotoFiles(e.target.files)
                                }
                            />

                            <div className="text-slate-300 text-lg">
                                {photoUploading
                                    ? "Uploading..."
                                    : "Drop photos here"}
                            </div>

                            <div className="text-slate-600 text-sm mt-2">
                                or click to browse
                            </div>
                        </div>

                        {/* Photos */}

                        {photos.length > 0 && (
                            <div className="grid grid-cols-4 gap-4 mt-8">
                                {photos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className="relative rounded-xl overflow-hidden border border-[#1e293b]"
                                    >
                                        <img
                                            src={photo.image_url}
                                            className="w-full aspect-square object-cover"
                                        />

                                        {!photo.uploading && (
                                            <button
                                                onClick={() =>
                                                    handleDeletePhoto(photo.id)
                                                }
                                                className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-red-500 text-white"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}

                        <div className="flex justify-between mt-10">
                            <button
                                onClick={() => setStep(1)}
                                className="px-5 py-3 bg-[#1a1f2e] rounded-xl text-slate-300"
                            >
                                Back
                            </button>

                            <button
                                onClick={() => setStep(3)}
                                className="px-6 py-3 bg-blue-600 rounded-xl text-white font-semibold"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3 */}

                {step === 3 && (
                    <div className="bg-[#0d1018] border border-[#181e2e] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Initial Review
                                </h2>

                                <p className="text-slate-500 mt-1">
                                    Add optional admin review
                                </p>
                            </div>

                            <Toggle
                                label="Enable Review"
                                checked={addReview}
                                onChange={() => setAddReview((p) => !p)}
                            />
                        </div>

                        {addReview && (
                            <>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <RatingInput
                                            label="Cleanliness"
                                            value={review.cleanliness}
                                            onChange={(v) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    cleanliness: v,
                                                }))
                                            }
                                        />

                                        <RatingInput
                                            label="Smell"
                                            value={review.smell}
                                            onChange={(v) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    smell: v,
                                                }))
                                            }
                                        />

                                        <RatingInput
                                            label="Privacy"
                                            value={review.privacy}
                                            onChange={(v) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    privacy: v,
                                                }))
                                            }
                                        />
                                    </div>

                                    <div>
                                        <RatingInput
                                            label="Lighting"
                                            value={review.lighting}
                                            onChange={(v) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    lighting: v,
                                                }))
                                            }
                                        />

                                        <RatingInput
                                            label="Maintenance"
                                            value={review.maintenance}
                                            onChange={(v) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    maintenance: v,
                                                }))
                                            }
                                        />

                                        <RatingInput
                                            label="Overall"
                                            value={review.overall}
                                            onChange={(v) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    overall: v,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5 mt-8">
                                    <Field label="Water Availability">
                                        <Select
                                            value={review.water_availability}
                                            onChange={(e) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    water_availability:
                                                        e.target.value,
                                                }))
                                            }
                                        >
                                            {WATER_OPTIONS.map((o) => (
                                                <option
                                                    key={o.value}
                                                    value={o.value}
                                                >
                                                    {o.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>

                                    <Field label="Crowd Level">
                                        <Select
                                            value={review.crowd_level}
                                            onChange={(e) =>
                                                setReview((p) => ({
                                                    ...p,
                                                    crowd_level: e.target.value,
                                                }))
                                            }
                                        >
                                            {CROWD_OPTIONS.map((o) => (
                                                <option
                                                    key={o.value}
                                                    value={o.value}
                                                >
                                                    {o.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>
                                </div>
                            </>
                        )}

                        {/* Actions */}

                        <div className="flex justify-between mt-10">
                            <button
                                onClick={() => setStep(2)}
                                className="px-5 py-3 bg-[#1a1f2e] rounded-xl text-slate-300"
                            >
                                Back
                            </button>

                            <button
                                onClick={handleCreateReview}
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 rounded-xl text-white font-semibold"
                            >
                                {loading ? "Saving..." : "Finish"}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4 */}

                {step === 4 && (
                    <div className="bg-[#0d1018] border border-[#181e2e] rounded-2xl p-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">✅</span>
                        </div>

                        <h2 className="text-3xl font-bold text-white">
                            Toilet Added Successfully
                        </h2>

                        <p className="text-slate-500 mt-4">
                            Toilet, photos and initial review saved
                            successfully.
                        </p>

                        <div className="flex items-center justify-center gap-4 mt-10">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-[#1a1f2e] rounded-xl text-slate-300"
                            >
                                Add Another
                            </button>

                            <button className="px-6 py-3 bg-blue-600 rounded-xl text-white">
                                View Toilet
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}