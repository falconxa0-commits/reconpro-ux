'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, X, ShieldAlert } from 'lucide-react';

interface CriticalAlert {
  id: number;
  severity: 'critical' | 'high';
  title: string;
  evidence: string;
  timestamp: number;
}

export function CriticalAlertFeed() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);

  const addAlert = (severity: 'critical' | 'high', title: string, evidence: string) => {
    setAlerts(prev => {
      const newAlerts = [{ id: Date.now(), severity, title, evidence, timestamp: Date.now() }, ...prev].slice(0, 20);
      return newAlerts;
    });
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.timestamp !== Date.now()));
    }, 8000);
  };

  const dismiss = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return { alerts, addAlert, dismiss, AlertFeedUI };
}

function AlertFeedUI({ alerts, onDismiss }: { alerts: CriticalAlert[]; onDismiss: (id: number) => void }) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {alerts.slice(0, 5).map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`pointer-events-auto rounded-xl border p-3 shadow-2xl backdrop-blur-sm ${
              alert.severity === 'critical'
                ? 'bg-[rgba(244,63,94,0.15)] border-[rgba(244,63,94,0.4)]'
                : 'bg-[rgba(251,191,36,0.15)] border-[rgba(251,191,36,0.4)]'
            }`}
            style={{
              boxShadow: alert.severity === 'critical'
                ? '0 0 30px rgba(244,63,94,0.3), 0 0 60px rgba(244,63,94,0.1)'
                : '0 0 20px rgba(251,191,36,0.2)',
            }}
          >
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                alert.severity === 'critical' ? 'bg-[rgba(244,63,94,0.2)]' : 'bg-[rgba(251,191,36,0.2)]'
              }`}>
                {alert.severity === 'critical' ? (
                  <ShieldAlert className="w-4 h-4 text-[#f43f5e]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#fb923c]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    alert.severity === 'critical' ? 'text-[#f43f5e]' : 'text-[#fb923c]'
                  }`}>
                    {alert.severity === 'critical' ? 'CRITICAL' : 'HIGH'}
                  </span>
                  <Zap className={`w-3 h-3 ${alert.severity === 'critical' ? 'text-[#f43f5e]' : 'text-[#fb923c]'} animate-pulse`} />
                </div>
                <p className="text-xs font-semibold text-[#f1f5f9] mt-0.5 truncate">{alert.title}</p>
                <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{alert.evidence}</p>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="text-muted-foreground hover:text-white shrink-0 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
