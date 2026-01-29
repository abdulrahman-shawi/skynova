"use client";
// components/Navbar.tsx

import { useState, useEffect } from "react";
import { Menu, Bell, UserCircle, Clock } from "lucide-react"; // أضفنا أيقونة الساعة
import { ThemeToggle } from "./ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export const Navbar = ({ onMenuClick }: { onMenuClick: () => void }) => {

  const [time, setTime] = useState(new Date());

  const {user} = useAuth()
  // تحديث الوقت كل ثانية
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // تنسيق الوقت (ساعة:دقيقة:ثانية)
  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden text-slate-600 dark:text-slate-300 transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* الساعة الديناميكية */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <Clock size={16} className="text-blue-600 dark:text-blue-400 animate-pulse" />
          <div className="w-[100px]"> {/* عرض ثابت لمنع اهتزاز العناصر عند تغيير الأرقام */}
            <AnimatePresence mode="wait">
              <motion.span
                key={formattedTime}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums"
              >
                {formattedTime}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white dark:border-slate-950"></span>
        </button>
        
        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{user?.username}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-left">{user?.accountType}</p>
          </div>
          <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            <UserCircle size={28} className="text-slate-500 dark:text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
};