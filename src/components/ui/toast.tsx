'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, X, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container - fixed in top right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm min-w-[280px] max-w-[400px]
                ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
                ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
                ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
              `}
            >
              {toast.type === 'success' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Info className="h-4 w-4 text-white" />
                </div>
              )}

              <span className="text-sm font-medium flex-1">{toast.message}</span>

              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
              >
                <X className="h-4 w-4 opacity-60" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
