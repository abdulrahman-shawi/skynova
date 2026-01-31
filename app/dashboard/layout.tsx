// app/dashboard/layout.tsx
"use client";
import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "next-themes";
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange // إضافة اختيارية لتحسين الأداء عند التبديل
        >
    <div 
      className="flex min-h-screen bg-[#f8fafc] dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-500" 
      dir="rtl"
    >
      {/* الستارة الخلفية للموبايل (اختياري إذا كنت ستفعل الموبايل لاحقاً) */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* تم إصلاح الـ Function لتغيير الحالة عند النقر */}
        <Navbar onMenuClick={() => setIsCollapsed(!isCollapsed)} />
        
        {/* المحتوى الرئيسي خلفية أفتح قليلاً من الخلفية الكلية لتعطي عمق */}
        <main className="p-4 md:p-8 bg-slate-50/50 dark:bg-slate-900/20 flex-1 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {children}
            <Toaster position="top-center" />
          </div>
        </main>
      </div>
    </div>
    </ThemeProvider>
  );
}