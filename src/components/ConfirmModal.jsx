import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

/**
 * Custom Confirmation Modal Component
 * Replaces native window.confirm() with a themed modal
 */

const CONFIRM_TYPES = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-400',
    confirmBtnClass: 'bg-rose-600 hover:bg-rose-500 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    confirmBtnClass: 'bg-amber-600 hover:bg-amber-500 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    confirmBtnClass: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Onay',
  message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
  confirmText = 'Tamam',
  cancelText = 'İptal',
  type = 'danger',
}) {
  const [isExiting, setIsExiting] = useState(false);
  const config = CONFIRM_TYPES[type] || CONFIRM_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen) {
      setIsExiting(false);
      // ESC tuşu ile kapatma
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    setIsExiting(true);
    setTimeout(() => {
      onConfirm();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`
          relative z-10
          w-full max-w-md
          bg-slate-900 border border-slate-700
          rounded-2xl shadow-2xl shadow-black/50
          transform transition-all duration-200
          ${isExiting
            ? 'opacity-0 scale-95'
            : 'opacity-100 scale-100'
          }
        `}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${config.iconBg}`}>
              <Icon size={32} className={config.iconColor} />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-white text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-slate-400 text-center text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-slate-800">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${config.confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
