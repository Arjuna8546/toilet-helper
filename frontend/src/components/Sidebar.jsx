// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";

const NAV_ITEMS = [
  {
    to: "/admin-dashboard",
    end: true,
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
      </svg>
    ),
  },
  {
    to: "/admin-dashboard/add-toilet",
    label: "Add Toilet",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: "/admin-dashboard/toilets",
    label: "All Toilets",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    to: "/admin-dashboard/reviews",
    label: "Reviews",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.83L3 20l1.09-3.27A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <aside className="w-64 min-h-screen bg-[#0a0d14] border-r border-[#1a1f2e] flex flex-col shrink-0 font-sans">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-5">
        <span className="text-3xl leading-none">🚻</span>
        <div>
          <div className="text-[15px] font-bold text-slate-200 tracking-tight">ToiletTrail</div>
          <div className="text-[10px] text-slate-600 tracking-widest uppercase mt-0.5">Admin Panel</div>
        </div>
      </div>

      {/* User chip */}
      <div className="mx-4 mb-2 flex items-center gap-2.5 px-3 py-2.5 bg-[#10141e] rounded-xl border border-[#1a1f2e]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {user?.name?.[0]?.toUpperCase() ?? "A"}
        </div>
        <div className="overflow-hidden">
          <div className="text-[13px] font-semibold text-slate-300 truncate">{user?.name ?? "Admin"}</div>
          <div className="text-[11px] text-blue-400 mt-0.5">Administrator</div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#1a1f2e] mx-0 my-4" />

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3">
        <div className="text-[10px] font-bold text-[#252b3b] tracking-[1.2px] uppercase px-3 pb-2">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 no-underline ${
                isActive
                  ? "bg-[#141928] text-slate-100 border-l-2 border-blue-500 pl-3"
                  : "text-slate-500 hover:text-slate-300 hover:bg-[#0f1320]"
              }`
            }
          >
            <span className="opacity-80">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 mx-4 my-4 px-3.5 py-2.5 rounded-lg text-[13px] font-medium text-rose-900 border border-rose-950/60 bg-transparent hover:bg-rose-950/20 transition-all duration-150 cursor-pointer font-sans"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
        </svg>
        Logout
      </button>
    </aside>
  );
}