// components/shared/NavList.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { NavItem } from '@/lib/type';
import { MegaMenu } from '@/components/ui/MegaMenu';
import { cn } from '@/lib/utils';

export const NavList = ({ items }: { items: NavItem[] }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <ul className="hidden md:flex items-center space-x-2 h-full">
      {items.map((item) => (
        <li 
          key={item.title}
          className="relative h-16 flex items-center" // h-16 يضمن أن الماوس لا يزال في الـ li
          onMouseEnter={() => item.isMega && setActiveMenu(item.title)}
          onMouseLeave={() => setActiveMenu(null)}
        >
          {item.href ? (
            <Link href={item.href} className="px-4 py-2 text-sm font-medium hover:text-blue-600 transition-colors">
              {item.title}
            </Link>
          ) : (
            <button className="px-4 py-2 flex items-center gap-1 text-sm font-medium hover:text-blue-600 transition-colors">
              {item.title}
              {item.isMega && (
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", activeMenu === item.title && "rotate-180")} />
              )}
            </button>
          )}

          {/* الحاوية هنا تبدأ من حافة الـ Navbar العلوية أو السفلية بدون فجوات */}
          {item.isMega && item.sections && (
  <div className={cn(
    "absolute top-[60px] -left-48 w-[800px] transition-all duration-300 z-[100]",
    activeMenu === item.title 
      ? "opacity-100 visible translate-y-0" 
      : "opacity-0 invisible translate-y-2 pointer-events-none"
  )}>
    <div className="h-4 w-full bg-transparent" /> {/* جسر لمنع انغلاق القائمة */}
    <div className="bg-white border rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
      <MegaMenu sections={item.sections} />
    </div>
  </div>
)}
        </li>
      ))}
    </ul>
  );
};