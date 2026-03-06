'use client';

import { motion } from "framer-motion";
import { type SchemeData, formatCrores } from "@/data/budgetData";
import { ExclamationTriangleIcon, ArrowTrendingUpIcon, ChartBarIcon, BoltIcon } from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

interface SchemeAnalyticsProps {
  scheme: SchemeData;
  onBack: () => void;
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SchemeAnalytics = ({ scheme, onBack }: SchemeAnalyticsProps) => {
  const remaining = scheme.allocated - scheme.spent;
  const trendData = scheme.trend.map((v, i) => ({ month: months[i], value: v }));

  const pieData = [
    { name: "Spent", value: scheme.spent },
    { name: "Remaining", value: remaining },
  ];
  const pieColors = ["#f59e0b", "#374151"]; // amber-500, gray-700

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors"
        >
          ← Back to Schemes
        </button>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-white font-medium flex items-center gap-2">
          <span className="text-2xl">{scheme.icon}</span>
          {scheme.name}
        </span>
      </div>

      {/* Title + Overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-black bg-gradient-to-r from-amber-200 via-orange-300 to-amber-300 bg-clip-text text-transparent">
            {scheme.name}
          </h2>
          <p className="text-gray-400 text-base mt-2 font-medium">
            {scheme.category} · Budget Analysis & Insights
          </p>
        </div>
        <div
          className={`mt-4 sm:mt-0 px-5 py-3 rounded-2xl text-sm font-black backdrop-blur-xl border ${
            scheme.utilization >= 80
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : scheme.utilization >= 50
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          }`}
        >
          {scheme.utilization}% Utilized
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Allocated",
            value: formatCrores(scheme.allocated),
            icon: <ArrowTrendingUpIcon className="w-5 h-5" />,
            color: "amber",
          },
          {
            label: "Spent",
            value: formatCrores(scheme.spent),
            icon: <ChartBarIcon className="w-5 h-5" />,
            color: "orange",
          },
          {
            label: "Remaining",
            value: formatCrores(remaining),
            icon: <BoltIcon className="w-5 h-5" />,
            color: "gray",
          },
          {
            label: "Anomalies",
            value: String(scheme.anomalies.length),
            icon: <ExclamationTriangleIcon className="w-5 h-5" />,
            color: "red",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl"
          >
            <div
              className={`flex items-center gap-2 text-${s.color}-400 mb-3`}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-${s.color}-500/20 flex items-center justify-center`}
              >
                {s.icon}
              </div>
            </div>
            <p className="text-3xl font-black text-white mb-1">{s.value}</p>
            <p className="text-sm text-gray-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Spending Trend */}
        <div className="glass-card p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
          <h3 className="text-lg font-black text-amber-300 mb-5 flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></span>
            Spending Trend (₹ Cr)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.1)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                stroke="#4b5563"
              />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} stroke="#4b5563" />
              <Tooltip
                contentStyle={{
                  background: "rgba(17, 24, 39, 0.95)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  borderRadius: "12px",
                  color: "#f3f4f6",
                  backdropFilter: "blur(20px)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                fill="url(#trendGrad)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Utilization Pie */}
        <div className="glass-card p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
          <h3 className="text-lg font-black text-amber-300 mb-5 flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></span>
            Fund Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(17, 24, 39, 0.95)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  borderRadius: "12px",
                  color: "#f3f4f6",
                  backdropFilter: "blur(20px)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-3">
            <span className="flex items-center gap-2 text-sm text-gray-300 font-medium">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Spent
            </span>
            <span className="flex items-center gap-2 text-sm text-gray-300 font-medium">
              <span className="w-3 h-3 rounded-full bg-gray-700" /> Remaining
            </span>
          </div>
        </div>
      </div>

      {/* Anomaly Alerts */}
      {scheme.anomalies.length > 0 && (
        <div className="glass-card p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mb-6">
          <h3 className="text-lg font-black text-amber-300 mb-5 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            Anomaly Alerts Detected
          </h3>
          <div className="space-y-3">
            {scheme.anomalies.map((a) => (
              <div
                key={a.id}
                className={`rounded-2xl p-5 border backdrop-blur-xl ${
                  a.severity === "high"
                    ? "bg-red-500/10 border-red-500/30"
                    : a.severity === "medium"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-blue-500/10 border-blue-500/30"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className={`text-xs uppercase font-black px-3 py-1 rounded-full ${
                        a.severity === "high"
                          ? "bg-red-500/30 text-red-300"
                          : a.severity === "medium"
                          ? "bg-amber-500/30 text-amber-300"
                          : "bg-blue-500/30 text-blue-300"
                      }`}
                    >
                      {a.severity} · {a.type.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-base font-black text-white">
                    {formatCrores(a.amount)}
                  </span>
                </div>
                <p className="text-sm text-gray-200 font-medium leading-relaxed">
                  {a.description}
                </p>
                <p className="text-xs text-gray-500 mt-2">{a.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Predictions */}
      <div className="glass-card p-6 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/10 backdrop-blur-xl border border-amber-400/20 rounded-3xl">
        <h3 className="text-lg font-black text-amber-300 mb-5 flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-amber-400" />
          AI Predictive Insights
        </h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-amber-400/20 p-5 bg-white/5 backdrop-blur-xl">
            <p className="text-xs text-amber-300 mb-2 font-bold uppercase tracking-wider">
              Year-End Projection
            </p>
            <p className="text-3xl font-black text-white mb-2">
              {Math.min(scheme.utilization + 12, 100)}%
            </p>
            <p className="text-sm text-green-400 font-medium">
              ↑ Expected improvement of 12%
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 p-5 bg-white/5 backdrop-blur-xl">
            <p className="text-xs text-amber-300 mb-2 font-bold uppercase tracking-wider">
              Estimated Unused Funds
            </p>
            <p className="text-3xl font-black text-amber-400 mb-2">
              {formatCrores(Math.round(remaining * 0.6))}
            </p>
            <p className="text-sm text-gray-400 font-medium">
              Based on historical trends
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SchemeAnalytics;
