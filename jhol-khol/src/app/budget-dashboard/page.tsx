'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import IndiaMap from "@/components/IndiaMap";
import StatePanel from "@/components/StatePanel";
import SchemeAnalytics from "@/components/SchemeAnalytics";
import {
  nationalStats,
  formatCrores,
  states,
  schemes,
  type StateData,
  type SchemeData,
} from "@/data/budgetData";
import {
  CurrencyRupeeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

type View = "map" | "schemes" | "analytics";

export default function DashboardPage() {
  const [selectedState, setSelectedState] = useState<StateData | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SchemeData | null>(null);
  const [view, setView] = useState<View>("map");

  const handleStateSelect = (state: StateData) => {
    setSelectedState(state);
    setSelectedDistrictId(null);
  };

  const handleDistrictSelect = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setView("schemes");
  };

  const handleSchemeSelect = (scheme: SchemeData) => {
    setSelectedScheme(scheme);
    setView("analytics");
  };

  const handleBackToMap = () => {
    setView("map");
    setSelectedDistrictId(null);
    setSelectedScheme(null);
    setSelectedState(null);
  };

  const handleBackToSchemes = () => {
    setView("schemes");
    setSelectedScheme(null);
  };

  const districtName =
    selectedState?.districts.find((d) => d.id === selectedDistrictId)?.name || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 py-8">
        {view === "map" && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-10">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-amber-200 via-orange-300 to-amber-300 bg-clip-text text-transparent"
              >
                India Budget Dashboard
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-gray-400 text-lg max-w-2xl mx-auto"
              >
                Real-time government scheme tracking across all states and districts.
                Click on any state to explore detailed budget allocation and utilization.
              </motion.p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: "Total Allocated",
                  value: formatCrores(nationalStats.totalAllocated),
                  icon: <CurrencyRupeeIcon className="w-6 h-6" />,
                  color: "amber",
                  trend: "+8.2%",
                },
                {
                  label: "Total Spent",
                  value: formatCrores(nationalStats.totalSpent),
                  icon: <ChartBarIcon className="w-6 h-6" />,
                  color: "green",
                },
                {
                  label: "Remaining",
                  value: formatCrores(nationalStats.remaining),
                  icon: <CurrencyRupeeIcon className="w-6 h-6" />,
                  color: "orange",
                },
                {
                  label: "Active Alerts",
                  value: String(nationalStats.activeAlerts),
                  icon: <ExclamationTriangleIcon className="w-6 h-6" />,
                  color: "red",
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl hover:border-amber-400/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/20 flex items-center justify-center`}
                    >
                      <div className={`text-${stat.color}-400`}>{stat.icon}</div>
                    </div>
                    {stat.trend && (
                      <span className="text-xs font-bold text-green-400">
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-black text-white mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Map + State Panel */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="glass-card p-6 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
                        <MapPinIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white">
                          India Budget Map
                        </h2>
                        <p className="text-sm text-gray-400">
                          Click on a state to explore districts & schemes
                        </p>
                      </div>
                    </div>
                    <div className="glass-card px-3 py-2 text-xs text-amber-300 font-bold bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                      {states.length} States/UTs
                    </div>
                  </div>
                  <IndiaMap
                    onStateSelect={handleStateSelect}
                    selectedStateId={selectedState?.id}
                  />
                </div>
              </div>

              {/* State Panel */}
              {selectedState && (
                <div className="lg:col-span-1">
                  <StatePanel
                    state={selectedState}
                    onClose={() => setSelectedState(null)}
                    onDistrictSelect={handleDistrictSelect}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {view === "schemes" && selectedDistrictId && (
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={handleBackToMap}
                className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors font-medium px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl"
              >
                ← Back to Map
              </button>
              <span className="text-gray-600">/</span>
              <span className="text-sm text-white font-medium px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                {selectedState?.name} / {districtName}
              </span>
            </div>

            {/* Schemes Grid */}
            <div className="mb-8">
              <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-amber-200 via-orange-300 to-amber-300 bg-clip-text text-transparent">
                Government Schemes
              </h2>
              <p className="text-gray-400 text-lg mb-6">
                Select a scheme to view detailed analytics and insights
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schemes.map((scheme, i) => {
                const utilization = scheme.utilization;
                return (
                  <motion.button
                    key={scheme.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => handleSchemeSelect(scheme)}
                    className="glass-card p-6 text-left bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-amber-400/40 rounded-3xl transition-all duration-300 hover:scale-105"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-5xl">{scheme.icon}</span>
                      {scheme.anomalies.length > 0 && (
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-black border border-red-500/30">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          {scheme.anomalies.length}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">
                      {scheme.name}
                    </h3>
                    <p className="text-sm text-amber-300 mb-4 font-medium">
                      {scheme.category} · {formatCrores(scheme.allocated)}
                    </p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-700/60">
                        <div
                          className={`h-full rounded-full ${
                            utilization >= 80
                              ? "bg-green-500"
                              : utilization >= 50
                              ? "bg-amber-400"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-black ${
                          utilization >= 80
                            ? "text-green-400"
                            : utilization >= 50
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {utilization}%
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {view === "analytics" && selectedScheme && (
          <SchemeAnalytics
            scheme={selectedScheme}
            onBack={handleBackToSchemes}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
