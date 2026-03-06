'use client';

import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, ChevronRightIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { type StateData, formatCrores } from "@/data/budgetData";

interface StatePanelProps {
  state: StateData | null;
  onClose: () => void;
  onDistrictSelect: (districtId: string) => void;
}

const StatePanel = ({ state, onClose, onDistrictSelect }: StatePanelProps) => {
  if (!state) return null;

  const utilization = Math.round((state.spent / state.allocated) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="w-full max-w-md"
      >
        {/* Glass panel header */}
        <div className="glass-card p-6 mb-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
                <BuildingOffice2Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-white">{state.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass-card p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <p className="text-xs text-amber-300 uppercase tracking-wider font-bold mb-1">
                Allocated
              </p>
              <p className="text-2xl font-black bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
                {formatCrores(state.allocated)}
              </p>
            </div>
            <div className="glass-card p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <p className="text-xs text-amber-300 uppercase tracking-wider font-bold mb-1">
                Spent
              </p>
              <p className="text-2xl font-black text-amber-400">
                {formatCrores(state.spent)}
              </p>
            </div>
          </div>

          {/* Utilization bar */}
          <div className="glass-card p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-amber-300 uppercase tracking-wider font-bold">
                Budget Utilization
              </p>
              <span
                className={`text-lg font-black ${
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
            <div className="w-full h-3 rounded-full bg-gray-800/60 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${utilization}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className={`h-full rounded-full ${
                  utilization >= 80
                    ? "bg-gradient-to-r from-green-500 to-emerald-400"
                    : utilization >= 50
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-red-500 to-orange-600"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Districts - glassmorphic list */}
        <div className="glass-card p-5 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl">
          <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></span>
            Districts ({state.districts.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {state.districts.map((district, i) => {
              const dUtil = Math.round(
                (district.spent / district.allocated) * 100
              );
              return (
                <motion.button
                  key={district.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                  onClick={() => onDistrictSelect(district.id)}
                  className="w-full glass-card p-4 flex items-center justify-between text-left group transition-all duration-200 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-amber-400/40 rounded-2xl hover:bg-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate mb-1">
                      {district.name}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-amber-300 font-medium">
                        {formatCrores(district.allocated)}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-700/60 max-w-[80px] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dUtil >= 80
                              ? "bg-green-500"
                              : dUtil >= 50
                              ? "bg-amber-400"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${dUtil}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span
                      className={`text-sm font-black ${
                        dUtil >= 80
                          ? "text-green-400"
                          : dUtil >= 50
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {dUtil}%
                    </span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-amber-400 transition-all" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatePanel;
