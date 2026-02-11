// src/components/ui/card/DynamicCard.tsx

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility لدمج كلاسات Tailwind بشكل ذكي
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Interfaces ---

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'glass';
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  errorNode?: React.ReactNode;
  emptyNode?: React.ReactNode;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

// --- Sub-Components ---

const CardHeader = ({ title, description, icon, action }: CardHeaderProps) => (
  <div className="flex items-center justify-between mb-4 gap-4">
    <div className="flex items-center gap-3">
      {icon && <div className="text-blue-600">{icon}</div>}
      <div>
        <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h3>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

const CardContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("relative", className)}>{children}</div>
);

const CardFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
    {children}
  </div>
);

// --- Main Component (Server Component by default) ---

export default function DynamicCard({
  children,
  className,
  variant = 'default',
  isLoading = false,
  isError = false,
  isEmpty = false,
  errorNode,
  emptyNode,
}: CardProps) {
  
  // Variants Styles
  const variants = {
    default: "bg-white shadow-sm border border-slate-200",
    outline: "bg-transparent border-2 border-dashed border-slate-300",
    glass: "bg-white/80 backdrop-blur-md border border-white/20 shadow-xl dark:bg-slate-900/80 dark:border-slate-800",
  };

  return (
    <div className={cn(
      "rounded-xl p-5 transition-all duration-200",
      variants[variant],
      className
    )}>
      {/* State Handling: Loading */}
      {isLoading && (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-6 w-1/3 bg-slate-200 rounded" />
          <div className="h-24 w-full bg-slate-100 rounded" />
        </div>
      )}

      {/* State Handling: Error */}
      {!isLoading && isError && (
        <div className="text-center py-6">
          {errorNode || <p className="text-red-500 text-sm">Failed to load data.</p>}
        </div>
      )}

      {/* State Handling: Empty */}
      {!isLoading && !isError && isEmpty && (
        <div className="text-center py-10">
          {emptyNode || <p className="text-slate-400">No data available.</p>}
        </div>
      )}

      {/* Actual Content Rendering */}
      {!isLoading && !isError && !isEmpty && children}
    </div>
  );
}

// Exporting sub-components for cleaner API
DynamicCard.Header = CardHeader;
DynamicCard.Content = CardContent;
DynamicCard.Footer = CardFooter;