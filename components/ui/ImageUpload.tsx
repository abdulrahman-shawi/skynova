'use client';

import React, { useState, ChangeEvent } from 'react';
import { ImageIcon, X, UploadCloud } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label: string;
}

export const ImageUpload = ({ value, onChange, label }: ImageUploadProps) => {
  const [preview, setPreview] = useState(value || "");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // في الحقيقة هنا ترفع الصورة للسيرفر، ولكن للمثال سنستخدم Local URL
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(url);
    }
  };

  return (
    <div className="space-y-2 w-full text-right">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <div className="relative flex items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 transition-all hover:bg-slate-100 dark:hover:bg-slate-900">
        {preview ? (
          <div className="relative w-full h-full p-2">
            <Image src={preview} alt="Preview" fill className="object-contain rounded-lg" />
            <button 
              type="button"
              onClick={() => { setPreview(""); onChange(""); }}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center cursor-pointer">
            <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs text-slate-500">انقر لرفع صورة المنتج</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  );
};