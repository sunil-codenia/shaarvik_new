'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="flex-shrink-0" />,
  error: <XCircle size={16} className="flex-shrink-0" />,
  warning: <AlertTriangle size={16} className="flex-shrink-0" />,
  info: <Info size={16} className="flex-shrink-0" />,
};

const styles: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const success = useCallback((msg: string) => toast('success', msg), [toast]);
  const error = useCallback((msg: string) => toast('error', msg), [toast]);
  const warning = useCallback((msg: string) => toast('warning', msg), [toast]);
  const info = useCallback((msg: string) => toast('info', msg), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-500 max-w-sm animate-slide-in ${styles[t.type]}`}
          >
            <span className={iconStyles[t.type]}>{icons[t.type]}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
