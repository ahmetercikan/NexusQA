import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Toast Notification Component
 * Modern, auto-dismissing notifications that appear in the top-right corner
 */

const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/50',
    iconColor: 'text-emerald-400',
    progressColor: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/50',
    iconColor: 'text-rose-400',
    progressColor: 'bg-rose-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/50',
    iconColor: 'text-amber-400',
    progressColor: 'bg-amber-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    iconColor: 'text-blue-400',
    progressColor: 'bg-blue-500',
  },
};

function ToastItem({ id, type = 'info', message, duration = 4000, onClose }) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    // Progress bar animation
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    // Auto dismiss
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden
        w-80 max-w-sm
        ${config.bgColor} ${config.borderColor}
        backdrop-blur-xl border rounded-xl
        shadow-2xl shadow-black/20
        transform transition-all duration-300 ease-out
        ${isExiting
          ? 'opacity-0 translate-x-full scale-95'
          : 'opacity-100 translate-x-0 scale-100'
        }
      `}
    >
      {/* Content */}
      <div className="flex items-start gap-3 p-4">
        <div className={`shrink-0 ${config.iconColor}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition text-slate-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <div
          className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={removeToast}
          />
        </div>
      ))}
    </div>
  );
}
