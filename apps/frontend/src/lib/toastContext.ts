import { createContext } from 'react';

export type ToastTone = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastContextValue {
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
