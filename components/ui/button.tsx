"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot"; // مفيد جداً لدعم خاصية "asChild"
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react"; // أيقونة التحميل
import { cn } from "@/lib/utils";

// تعريف الأنماط المتغيرة (Variants)
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 active:scale-95 gap-2",
  {
    variants: {
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        outline: "border border-slate-200 bg-transparent hover:bg-slate-100 text-slate-900 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100",
        ghost: "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10", // للأزرار التي تحتوي على أيقونة فقط
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean; // حالة التحميل
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {/* عرض أيقونة التحميل عند تفعيل isLoading */}
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        
        {/* عرض الأيقونة اليسرى إذا لم نكن في حالة تحميل */}
        {!isLoading && leftIcon && <span className="flex">{leftIcon}</span>}
        
        {children}
        
        {/* عرض الأيقونة اليمنى */}
        {!isLoading && rightIcon && <span className="flex">{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };