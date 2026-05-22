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
          <button
            onClick={() => navigate("/admin-dashboard/add-toilet")}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0 border-none cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Toilet
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className={`bg-[#0d1018] border border-[#181e2e] rounded-2xl p-6 ring-1 ${stat.ring}`}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center text-xl mb-4`}>
                {stat.icon}
              </div>
              <div className={`text-3xl font-bold tracking-tight mb-1 ${stat.text}`}>{stat.value}</div>
              <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <div className="text-[10px] font-bold text-slate-700 tracking-[1.2px] uppercase mb-4">
            Quick Actions
          </div>
          <div className="grid grid-cols-3 gap-4">
            {ACTIONS.map((action) => (
              <div
                key={action.title}
                onClick={() => navigate(action.to)}
                className="bg-[#0d1018] border border-[#181e2e] rounded-2xl p-6 cursor-pointer hover:border-[#252d42] hover:-translate-y-0.5 transition-all duration-150 group"
              >
                <div className={`w-11 h-11 rounded-xl ${action.iconBg} flex items-center justify-center text-2xl mb-5`}>
                  {action.icon}
                </div>
                <div className="text-[15px] font-bold text-slate-300 mb-1 group-hover:text-slate-100 transition-colors">
                  {action.title}
                </div>
                <div className="text-[13px] text-slate-600 leading-relaxed">{action.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}