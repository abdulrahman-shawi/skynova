"use client";

import React from "react";
import { cn } from "@/lib/utils";

// تعريف واجهة الخيارات
export interface SelectOption {
  label: string;
  value: string | number;
  id?:string | number;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, options, error, placeholder, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full text-right">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-all outline-none",
            "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
            error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.id? option.id : option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";