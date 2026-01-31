'use client';

import React, { useEffect } from "react";
import { z } from "zod";
import { X } from "lucide-react";
import { DynamicForm } from "@/components/shared/dynamic-form";
import { FormInput } from "@/components/ui/form-input";

const productSchema = z.object({
  name: z.string().min(3, "اسم المنتج قصير جداً"),
  price: z.string().min(1, "السعر مطلوب"),
  category: z.string().min(1, "الفئة مطلوبة"),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormValues) => void;
  initialData?: ProductFormValues | null; 
  isLoading?: boolean;
}

export function ProductModal({ isOpen, onClose, onSubmit, initialData, isLoading }: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {initialData ? "تعديل بيانات المنتج" : "إضافة منتج جديد"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <DynamicForm
            schema={productSchema}
            onSubmit={onSubmit}
            isLoading={isLoading}
            submitLabel={initialData ? "تحديث المنتج" : "إنشاء منتج"}
          >
            {(methods) => {
              // استخدام useEffect لتحديث البيانات عند التغيير
              useEffect(() => {
                if (initialData) {
                  methods.reset(initialData);
                } else {
                  methods.reset({ name: "", price: "", category: "", imageUrl: "" });
                }
              }, [initialData, isOpen, methods]);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right" dir="rtl">
                  <div className="md:col-span-2">
                    <ImageUpload 
                      label="صورة المنتج"
                      value={methods.watch("imageUrl")}
                      onChange={(url) => methods.setValue("imageUrl", url)}
                    />
                  </div>

                  <FormInput
                    label="اسم المنتج"
                    placeholder="مثلاً: ايفون 15 برو"
                    error={methods.formState.errors.name?.message as string}
                    {...methods.register("name")}
                  />

                  <FormInput
                    label="السعر (USD)"
                    type="number"
                    placeholder="0.00"
                    error={methods.formState.errors.price?.message as string}
                    {...methods.register("price")}
                  />

                  <div className="md:col-span-2">
                    <FormInput
                      label="الفئة"
                      placeholder="إلكترونيات، ملابس..."
                      error={methods.formState.errors.category?.message as string}
                      {...methods.register("category")}
                    />
                  </div>
                </div>
              );
            }}
          </DynamicForm>
        </div>
      </div>
    </div>
  );
}