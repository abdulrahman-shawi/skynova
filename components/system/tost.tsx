import { motion } from "framer-motion";
import { X } from "lucide-react";

export const ToastAdd = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="fixed bottom-6 left-6 z-[200] bg-slate-900 dark:bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 dark:border-blue-500"
  >
    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
      <X size={16} />
    </div>
    <span className="font-medium text-sm">{message}</span>
    <button onClick={onClose} className="mr-4 opacity-50 hover:opacity-100 transition-opacity">
      <X size={16} />
    </button>
  </motion.div>
);

export const ToastDELETE = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="fixed bottom-6 left-6 z-[200] bg-slate-900 dark:bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 dark:border-blue-500"
  >
    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
      <X size={16} />
    </div>
    <span className="font-medium text-sm">{message}</span>
    <button onClick={onClose} className="mr-4 opacity-50 hover:opacity-100 transition-opacity">
      <X size={16} />
    </button>
  </motion.div>
);

 export const ToastEdit = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="fixed bottom-6 left-6 z-[200] bg-slate-900 dark:bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 dark:border-blue-500"
  >
    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
      <X size={16} />
    </div>
    <span className="font-medium text-sm">{message}</span>
    <button onClick={onClose} className="mr-4 opacity-50 hover:opacity-100 transition-opacity">
      <X size={16} />
    </button>
  </motion.div>
);