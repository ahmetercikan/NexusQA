import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/Toast';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdCounter;

    setToasts((prev) => [
      ...prev,
      { id, message, type, duration }
    ]);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Convenience methods
  const toast = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);
  toast.success = (message, duration) => addToast(message, 'success', duration);
  toast.error = (message, duration) => addToast(message, 'error', duration);
  toast.warning = (message, duration) => addToast(message, 'warning', duration);
  toast.info = (message, duration) => addToast(message, 'info', duration);

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}

export default ToastContext;
