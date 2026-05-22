// src/services/toiletService.js
import api from "../lib/axios";

// ─── Toilets ────────────────────────────────────────────────────────────────

export const fetchToilets = () => api.get("/toilets/");

export const fetchToiletById = (id) => api.get(`/toilets/${id}/`);

export const createToilet = (data) => api.post("/toilets/", data);

export const updateToilet = (id, data) => api.patch(`/toilets/${id}/`, data);

export const deleteToilet = (id) => api.delete(`/toilets/${id}/`);

export const fetchNearbyToilets = ({ lat, lng, radius = 5000 }) =>
  api.get("/toilets/nearby/", { params: { lat, lng, radius } });

// ─── Photos ─────────────────────────────────────────────────────────────────

export const uploadToiletPhoto = (toiletId, formData) =>
  api.post(`/toilets/${toiletId}/photos/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteToiletPhoto = (toiletId, photoId) =>
  api.delete(`/toilets/${toiletId}/photos/${photoId}/`);

// ─── Reviews ────────────────────────────────────────────────────────────────

export const fetchReviews = (toiletId) =>
  api.get("/reviews/", { params: { toilet: toiletId } });

export const createReview = (data) => api.post("/reviews/", data);

export const updateReview = (id, data) => api.patch(`/reviews/${id}/`, data);

// ─── Verification Votes ──────────────────────────────────────────────────────

export const fetchVoteCounts = (toiletId) =>
  api.get("/votes/", { params: { toilet: toiletId } });

export const castVote = (data) => api.post("/votes/", data);