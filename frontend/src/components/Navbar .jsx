// src/components/Navbar.jsx
// Reusable top navigation bar for peeസ്
// Props:
//   onLogout  – (optional) override the logout handler
//   children  – (optional) extra items rendered in the right slot

import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";

// ── Brand tokens (keep in sync with your theme file / design tokens) ──────
const BRAND       = "#10B57E";
const BRAND_LIGHT = "#e6f7f1";
const BRAND_DARK  = "#0d9468";
const SURFACE     = "#E8E8E8";
const WHITE       = "#ffffff";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED   = "#6b7280";

export default function Navbar({ onLogout, children }) {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const user      = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      dispatch(logout());
      navigate("/");
    }
  };

  return (
    <nav
      style={{
        height: 56,
        background: WHITE,
        borderBottom: `1px solid ${SURFACE}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 200,
        flexShrink: 0,
      }}
    >
      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: BRAND,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.5px",
            color: TEXT_PRIMARY,
            fontFamily: "'Baloo Chettan 2', cursive",
            lineHeight: 1,
          }}
        >
          peeസ്
        </span>
      </div>

      {/* ── Right slot ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Avatar + name (hidden on narrow screens via inline style;
            override with a CSS class if you want a breakpoint) */}
        <span
          style={{
            fontSize: 13,
            color: TEXT_MUTED,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: BRAND_LIGHT,
              color: BRAND_DARK,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </span>
          {/* Name hidden on mobile – add a CSS class if you need the breakpoint */}
          {/* <span className="navbar-username">{user?.name}</span> */}
        </span>

        {/* Caller-supplied extra items (e.g. an "Add Toilet" button) */}
        {children}

        <button
          className="logout-btn"
          onClick={handleLogout}
          style={{
            border: "none",
            background: TEXT_PRIMARY,
            borderRadius: 10,
            padding: "7px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: WHITE,
            transition: "all 0.15s ease",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1f2937")}
          onMouseLeave={(e) => (e.currentTarget.style.background = TEXT_PRIMARY)}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}