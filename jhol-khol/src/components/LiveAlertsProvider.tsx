'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  ExclamationTriangleIcon, 
  ExclamationCircleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  BellIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = API_BASE.replace('http', 'ws') + '/ws/live-feed';

interface Alert {
  id: string;
  severity: string;
  department: string;
  description: string;
  amount: number;
  type: string;
  timestamp: string;
  read: boolean;
}

export function LiveAlertsProvider({ children }: { children: React.ReactNode }) {
  const { connected, lastAlert } = useWebSocket(WS_URL);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (lastAlert) {
      const newAlert: Alert = {
        ...lastAlert,
        id: `${lastAlert.timestamp}-${Math.random()}`,
        read: false,
      };
      
      setAlerts((prev) => [newAlert, ...prev].slice(0, 50)); // Keep last 50 alerts
      setUnreadCount((prev) => prev + 1);

      // Sound notifications disabled
      // if (lastAlert.severity === 'CRITICAL' || lastAlert.severity === 'HIGH') {
      //   try {
      //     const audio = new Audio('data:audio/wav;base64,...'); 
      //     audio.volume = 0.3;
      //     audio.play().catch(() => {});
      //   } catch (error) {
      //     // Ignore audio errors
      //   }
      // }
    }
  }, [lastAlert]);

  const formatAmount = (amount: number) => {
    if (amount >= 1) return `₹${amount.toFixed(2)} Cr`;
    if (amount >= 0.1) return `₹${(amount * 10).toFixed(2)} L`;
    return `₹${(amount * 1000).toFixed(2)} K`;
  };

  const getSeverityConfig = (severity: string) => {
    const configs: Record<string, {
      icon: any;
      className: string;
      badge: string;
    }> = {
      CRITICAL: {
        icon: ShieldExclamationIcon,
        className: 'bg-red-500/20 border-red-500 text-red-400',
        badge: 'bg-red-500',
      },
      HIGH: {
        icon: ExclamationTriangleIcon,
        className: 'bg-orange-500/20 border-orange-500 text-orange-400',
        badge: 'bg-orange-500',
      },
      MEDIUM: {
        icon: ExclamationCircleIcon,
        className: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
        badge: 'bg-yellow-500',
      },
      LOW: {
        icon: InformationCircleIcon,
        className: 'bg-blue-500/20 border-blue-500 text-blue-400',
        badge: 'bg-blue-500',
      },
    };
    return configs[severity] || configs.MEDIUM;
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark all as read when opening
      setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true })));
      setUnreadCount(0);
    }
  };

  const clearAll = () => {
    setAlerts([]);
    setUnreadCount(0);
  };

  return (
    <>
      {children}
      
      {/* Notification Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleToggle}
          className="relative bg-gradient-to-br from-amber-500 to-orange-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <BellIcon className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-gray-900/95 backdrop-blur-xl border-l border-white/10 z-40 shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <BellIcon className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl font-black text-white">
                    Live Alerts ({alerts.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {alerts.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Alerts List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <BellIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-semibold">No alerts yet</p>
                    <p className="text-sm">You'll see live alerts here</p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const config = getSeverityConfig(alert.severity);
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-xl p-4 ${config.className}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.badge} text-white`}>
                                {alert.severity}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="font-semibold text-white text-sm mb-1">
                              {alert.department}
                            </p>
                            <p className="text-sm mb-2 opacity-90">
                              {alert.description}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold">
                                {formatAmount(alert.amount)}
                              </span>
                              <span className="px-2 py-1 bg-white/10 rounded">
                                {alert.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Connection Status Footer */}
              <div className="p-4 border-t border-white/10">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  connected 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-sm font-semibold">
                    {connected ? 'Connected to Live Feed' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
