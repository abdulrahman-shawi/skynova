'use client';

import React from 'react';
import Link from 'next/link';
import { NavSection } from '@/lib/type';

interface MegaMenuProps {
  sections: NavSection[];
}

export const MegaMenu = ({ sections }: MegaMenuProps) => {
  return (
    <div className="p-6 bg-white">
      <div className="grid grid-cols-3 gap-8" dir="rtl">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4 text-right">
            {/* عنوان القسم */}
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
              {section.icon && <section.icon size={18} className="text-blue-600" />}
              <h4 className="font-bold text-slate-900 text-sm">{section.title}</h4>
            </div>
            
            {/* روابط القسم */}
            <ul className="space-y-2">
              {section.links.map((link, i) => (
                <li key={i}>
                  <Link 
                    href={link.href} 
                    className="text-slate-500 text-xs hover:text-blue-600 transition-colors block"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};