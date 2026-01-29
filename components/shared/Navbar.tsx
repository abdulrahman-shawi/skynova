// components/shared/Navbar.tsx
'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { NavItem } from '@/types/navigation';
import { cn } from '@/lib/utils';
import { NavList } from '@/components/shared/NavList'; // مكون فرعي للتعامل مع الحالة

interface NavbarProps {
  logo?: React.ReactNode;
  items: NavItem[];
  actions?: React.ReactNode; // للأزرار مثل Login/Register
  variant?: 'default' | 'transparent' | 'dashboard';
}

export const Navbar = ({ 
  logo, 
  items, 
  actions, 
  variant = 'default' 
}: NavbarProps) => {
  
  const variantStyles = {
    default: "bg-white border-b border-slate-200",
    transparent: "bg-transparent",
    dashboard: "bg-slate-900 text-white"
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn(`fixed w-full z-50 transition-all duration-300 px-4 md:px-8 ${isScrolled ? "top-4" : "top-0"}`)}>
      <div className={
        `container mx-auto max-w-7xl transition-all duration-300 ${
        isScrolled 
        ? "bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-[2rem] py-3 px-6 border border-white" 
        : "bg-transparent py-6 px-0"
      }`
      }>
        <div className="flex items-center justify-between">
          {/* Logo Area */}
        <div className="flex-shrink-0">
          {logo || <Link href="/" className="text-xl font-bold italic text-blue-600">STORE.CO</Link>}
        </div>

        {/* Navigation Logic - Separated to Client Side */}
        <NavList items={items} />

        {/* Actions Area */}
        <div className="flex items-center gap-4">
          {actions}
        </div>
        </div>
      </div>
    </nav>
  );
};