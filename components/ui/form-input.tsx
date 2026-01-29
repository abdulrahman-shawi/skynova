"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full text-right">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <input
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950",
            error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";