import { createContext, useCallback, useContext, useState } from "react";
import Toast from "./Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => setToast({ id: Date.now(), message, type }), []);
  return <ToastContext.Provider value={showToast}>{children}{toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext) || (() => {});
}
