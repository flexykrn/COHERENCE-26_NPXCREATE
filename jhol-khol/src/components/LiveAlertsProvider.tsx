'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';
import { 
  ExclamationTriangleIcon, 
  ExclamationCircleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/solid';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = API_BASE.replace('http', 'ws') + '/ws/live-feed';

export function LiveAlertsProvider({ children }: { children: React.ReactNode }) {
  const { connected, lastAlert } = useWebSocket(WS_URL);

  useEffect(() => {
    if (lastAlert) {
      const severityConfig = {
        CRITICAL: {
          icon: ShieldExclamationIcon,
          className: 'bg-red-600 text-white',
          duration: 10000,
        },
        HIGH: {
          icon: ExclamationTriangleIcon,
          className: 'bg-orange-600 text-white',
          duration: 8000,
        },
        MEDIUM: {
          icon: ExclamationCircleIcon,
          className: 'bg-yellow-600 text-white',
          duration: 6000,
        },
        LOW: {
          icon: InformationCircleIcon,
          className: 'bg-blue-600 text-white',
          duration: 5000,
        },
      };

      const config = severityConfig[lastAlert.severity] || severityConfig.MEDIUM;
      const Icon = config.icon;

      const formatAmount = (amount: number) => {
        if (amount >= 1) return `₹${amount.toFixed(2)} Cr`;
        return `₹${(amount * 10).toFixed(2)} L`;
      };

      toast.custom(
        (t) => (
          <div className={`${config.className} rounded-lg shadow-2xl p-4 max-w-md border-2 border-white/20`}>
            <div className="flex items-start gap-3">
              <Icon className="h-6 w-6 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-sm uppercase tracking-wide">
                    {lastAlert.severity} ALERT
                  </p>
                  <span className="text-xs opacity-90">
                    {new Date(lastAlert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="font-semibold mb-1">{lastAlert.department}</p>
                <p className="text-sm opacity-95 mb-2">{lastAlert.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold">{formatAmount(lastAlert.amount)}</span>
                  <span className="px-2 py-1 bg-white/20 rounded">{lastAlert.type}</span>
                </div>
              </div>
            </div>
          </div>
        ),
        {
          duration: config.duration,
          position: 'top-right',
        }
      );

      // Play sound for high severity alerts
      if (lastAlert.severity === 'CRITICAL' || lastAlert.severity === 'HIGH') {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwPUKXh8LVhHQU2kdXyzn0vBSR2yO/ekjsKE160UvOoVRULRp/i8r1rIAUshc3y2Ig1BxpmvvDknE4MD1Ck4vC1YR0FNpHV8s5+LwUkdsjv3pI7ChNetFLzqFUVC0af4vK9aiAFLIXN8tiINQcaZr7w5JxODA9QpOLwtWEdBTaR1fLOfi8FJHbI796SOwsVXrRS86hVFAtGn+Lyu2ogBSyFzvLYhzYHGma+8OSbTgwPUKLh8LVhHQU2kdXyzn4vBSR2x+/ekjsLFV600vOoVRQLRp/i8rtrIAUshs7y2Ic2BxpmvvHkmk4MD1Ch4PC1YBwFNpHU8s59LgUjd8fv3pI7CxVftFLzqFUVC0af4vK7ayAFLIbO8tiHNgcZZr3w5JpODA9QoeDwtWAdBTaR1PLPfS4FI3fH792SOwsVXrRS86hVFQtGnuHyvGogBSyGzvLYhzYHGWa98OOZTgwPUKHg8LRgHAU2kdTyz30uBSN3x+/dkjoMFV600vOoVBQLRZ7i8rtoHwUshc7y2Ig2Bxpmv/DjmU4MD06h4O+0YRwENpHU8s9+LwUjdsjv3ZI6DBVftNLzp1QUC0We4vK6aB8FLIbO8tiHNgcZZr7w45hOCw9OoODwtGEdBTaR1PLPfi8FI3bH79yROgwVXrXR86dUFAtEnuLydGkfBSyGzvLYhzYHGWa98OOYTggOTqDg8LNgHAU1kdXyz30uBSJ1yO/dkjoMFV610PSmUxULQ57h8rtnGwUshs/z2Ig2Bxlmvf'); 
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (error) {
          // Ignore audio errors
        }
      }
    }
  }, [lastAlert]);

  return (
    <>
      {children}
      {/* Connection Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm ${
          connected 
            ? 'bg-green-500/90 text-white' 
            : 'bg-red-500/90 text-white'
        }`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-white animate-pulse' : 'bg-white'}`} />
          <span className="text-xs font-semibold">
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>
    </>
  );
}
