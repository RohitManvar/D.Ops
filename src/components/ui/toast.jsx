import React, { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Copy, Trash2, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext({})

export const useToast = () => useContext(ToastContext)

const icons = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  copied: <Copy className="h-4 w-4 text-blue-500" />,
  deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <AlertCircle className="h-4 w-4 text-blue-500" />,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 2500) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              {icons[toast.type] || icons.success}
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
