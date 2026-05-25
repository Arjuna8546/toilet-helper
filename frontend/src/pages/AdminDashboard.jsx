// src/pages/AdminDashboard.jsx
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const STATS = [
  { label: "Total Toilets", value: "—", icon: "🚻", ring: "ring-blue-500/20", bg: "bg-blue-500/10", text: "text-blue-400" },
  { label: "Published",     value: "—", icon: "✅", ring: "ring-emerald-500/20", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  { label: "Pending",       value: "—", icon: "⏳", ring: "ring-amber-500/20",   bg: "bg-amber-500/10",   text: "text-amber-400"  },
  { label: "Reviews",       value: "—", icon: "💬", ring: "ring-purple-500/20",  bg: "bg-purple-500/10",  text: "text-purple-400" },
];

const ACTIONS = [
  {
    title: "Add New Toilet",
    desc: "Register a new toilet location with all details",
    icon: "➕",
    to: "/admin-dashboard/add-toilet",
    accent: "from-blue-600 to-indigo-600",
    iconBg: "bg-blue-500/10",
  },
  {
    title: "All Toilets",
    desc: "Browse, edit and manage all listings",
    icon: "🗂️",
    to: "/admin-dashboard/toilets",
    accent: "from-emerald-600 to-teal-600",
    iconBg: "bg-emerald-500/10",
  },
  {
    title: "Manage Reviews",
    desc: "View and update structured audit reviews",
    icon: "📋",
    to: "/admin-dashboard/reviews",
    accent: "from-purple-600 to-violet-600",
    iconBg: "bg-purple-500/10",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function AdminDashboard() {
  const user = useSelector((state) => state.auth.user);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#07090f] font-sans">
      <Sidebar />

      <main className="flex-1 px-10 py-10 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-10 gap-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight m-0">
              Good {getGreeting()}, {user?.name ?? "Admin"} 👋
            </h1>
            <p className="text-sm text-slate-600 mt-1.5">
              Here's what's happening with ToiletTrail today.
            </p>
          </div>
          {/* <button
            onClick={() => navigate("/admin-dashboard/add-toilet")}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 border-none cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Toilet
          </button> */}
        </div>

        
      </main>
    </div>
  );
}