"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeVariants = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] h-[95vh]",
};

export const AppModal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: AppModalProps) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* الخلفية المظلمة */}
        <Dialog.Overlay 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
        />
        
        {/* محتوى النافذة */}
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-xl dark:bg-slate-950 dark:border-slate-800 rtl:text-right",
            sizeVariants[size],
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          {/* رأس النافذة */}
          <div className="flex flex-col space-y-1.5 text-center sm:text-right relative">
            <Dialog.Title className="text-xl font-bold leading-none tracking-tight">
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
            )}
            
            {/* زر الإغلاق */}
            <Dialog.Close className="absolute left-0 top-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 outline-none focus:ring-2 focus:ring-slate-400">
              <X className="h-5 w-5" />
              <span className="sr-only">إغلاق</span>
            </Dialog.Close>
          </div>

          {/* محتوى الـ Form أو البيانات */}
          <div className="py-4 overflow-y-auto max-h-[70vh]">
            {children}
          </div>

          {/* تذييل النافذة (أزرار الحفظ/الإلغاء) */}
          {footer && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-start gap-2 mt-4 border-t pt-4 dark:border-slate-800">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};