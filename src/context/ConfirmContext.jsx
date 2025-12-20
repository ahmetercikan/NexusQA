import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: 'Onay',
    message: '',
    type: 'danger',
    confirmText: 'Tamam',
    cancelText: 'İptal',
    resolve: null,
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      if (typeof options === 'string') {
        // Simple usage: confirm('message')
        setConfirmState({
          isOpen: true,
          title: 'Onay',
          message: options,
          type: 'danger',
          confirmText: 'Tamam',
          cancelText: 'İptal',
          resolve,
        });
      } else {
        // Advanced usage: confirm({ title, message, type, ... })
        setConfirmState({
          isOpen: true,
          title: options.title || 'Onay',
          message: options.message || '',
          type: options.type || 'danger',
          confirmText: options.confirmText || 'Tamam',
          cancelText: options.cancelText || 'İptal',
          resolve,
        });
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    confirmState.resolve?.(false);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, [confirmState.resolve]);

  const handleConfirm = useCallback(() => {
    confirmState.resolve?.(true);
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, [confirmState.resolve]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export default ConfirmContext;
