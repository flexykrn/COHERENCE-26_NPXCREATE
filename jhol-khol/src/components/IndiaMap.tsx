import { useState, useCallback, useMemo } from "react";
import indiaMap from "@svg-maps/india";
import { formatCrores, type StateData } from "@/data/budgetData";

interface IndiaMapProps {
  states: StateData[];
  onStateSelect: (state: StateData) => void;
  selectedStateId?: string;
}

const IndiaMap = ({ states, onStateSelect, selectedStateId }: IndiaMapProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const stateDataMap = useMemo(() => new Map(states.map(s => [s.id, s])), [states]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const hoveredState = useMemo(() => {
    if (!hoveredId) return null;
    return stateDataMap.get(hoveredId) || null;
  }, [hoveredId]);

  const hoveredUtilization = hoveredState
    ? Math.round((hoveredState.spent / hoveredState.allocated) * 100)
    : 0;

  return (
    <div className="relative w-full" onMouseMove={handleMouseMove}>
      {/* Map Container with glass morphism */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(251, 191, 36, 0.08) 0%, transparent 70%)",
        }}
      >
        <svg
          viewBox={indiaMap.viewBox}
          className="w-full h-auto max-h-[600px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glow filters */}
          <defs>
            <filter
              id="stateGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter
              id="selectedGlow"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood
                floodColor="rgba(251, 191, 36, 1)"
                floodOpacity="0.6"
                result="color"
              />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>
          </defs>

          {indiaMap.locations.map((location: any) => {
            const stateData = stateDataMap.get(location.id);
            const isSelected = selectedStateId === location.id;
            const isHovered = hoveredId === location.id;
            const utilization = stateData
              ? Math.round((stateData.spent / stateData.allocated) * 100)
              : 0;

            // Amber/orange color scheme based on utilization
            let fillColor: string;
            let hoverFill: string;

            if (!stateData) {
              fillColor = "rgba(120, 113, 108, 0.3)"; // gray for no data
              hoverFill = "rgba(120, 113, 108, 0.5)";
             } else if (utilization >= 80) {
              fillColor = "rgba(34, 197, 94, 0.3)"; // green-500
              hoverFill = "rgba(34, 197, 94, 0.5)";
            } else if (utilization >= 60) {
              fillColor = "rgba(251, 191, 36, 0.3)"; // amber-400
              hoverFill = "rgba(251, 191, 36, 0.5)";
            } else if (utilization >= 50) {
              fillColor = "rgba(234, 88, 12, 0.3)"; // orange-600
              hoverFill = "rgba(234, 88, 12, 0.5)";
            } else {
              fillColor = "rgba(239, 68, 68, 0.3)"; // red-500
              hoverFill = "rgba(239, 68, 68, 0.5)";
            }

            return (
              <path
                key={location.id}
                d={location.path}
                id={location.id}
                className="transition-all duration-300 cursor-pointer"
                fill={
                  isSelected
                    ? "rgba(251, 191, 36, 0.7)"
                    : isHovered
                    ? hoverFill
                    : fillColor
                }
                stroke={
                  isSelected
                    ? "rgba(251, 191, 36, 1)"
                    : isHovered
                    ? "rgba(234, 88, 12, 0.8)"
                    : "rgba(156, 163, 175, 0.4)"
                }
                strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
                style={{
                  filter: isSelected
                    ? "url(#selectedGlow)"
                    : isHovered
                    ? "url(#stateGlow)"
                    : "none",
                  opacity: hoveredId && !isHovered && !isSelected ? 0.5 : 1,
                }}
                onMouseEnter={() => setHoveredId(location.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (stateData) onStateSelect(stateData);
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Color Legend */}
      <div className="absolute bottom-4 left-4 glass-card px-4 py-3 flex flex-col gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
        <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
          Budget Utilization
        </p>
        {[
          { color: "bg-green-500", label: "≥ 80% - Excellent" },
          { color: "bg-amber-400", label: "60–79% - Good" },
          { color: "bg-orange-600", label: "50–59% - Fair" },
          { color: "bg-red-500", label: "< 50% - Low" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className={`w-4 h-3 rounded ${item.color}`} />
            <span className="text-xs text-gray-200">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Glassmorphic Tooltip for states with data */}
      {hoveredId && hoveredState && (
        <div
          className="absolute pointer-events-none z-50 min-w-[240px]"
          style={{
            left: tooltipPos.x + 16,
            top: tooltipPos.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div
            className="glass-card px-5 py-4 border border-amber-400/40 rounded-2xl bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl"
            style={{
              boxShadow: "0 8px 32px 0 rgba(251, 191, 36, 0.2)",
            }}
          >
            <p className="text-lg font-black text-amber-300 mb-3">
              {hoveredState.name}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm gap-6">
                <span className="text-gray-400">Allocated</span>
                <span className="text-white font-bold">
                  {formatCrores(hoveredState.allocated)}
                </span>
              </div>
              <div className="flex justify-between text-sm gap-6">
                <span className="text-gray-400">Spent</span>
                <span className="text-amber-400 font-bold">
                  {formatCrores(hoveredState.spent)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-700/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Utilization</span>
                  <span
                    className={`font-black ${
                      hoveredUtilization >= 80
                        ? "text-green-400"
                        : hoveredUtilization >= 50
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {hoveredUtilization}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-700/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      hoveredUtilization >= 80
                        ? "bg-green-500"
                        : hoveredUtilization >= 50
                        ? "bg-amber-400"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${hoveredUtilization}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-amber-400/80 pt-1 font-medium">
                Click to explore districts →
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip for states without data */}
      {hoveredId && !hoveredState && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: tooltipPos.x + 16,
            top: tooltipPos.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="glass-card px-4 py-3 border border-gray-600/40 rounded-xl bg-gray-900/95 backdrop-blur-2xl">
            <p className="text-sm text-gray-400">No data available</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndiaMap;
