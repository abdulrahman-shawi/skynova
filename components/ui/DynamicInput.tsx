'use client';

import React from 'react';

interface DynamicInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  containerClassName?: string; // لتنسيق الحاوية الخارجية
  labelClassName?: string;     // لتنسيق التسمية
  inputClassName?: string;     // لتنسيق الحقل نفسه
  error?: string;
}

export const DynamicInput: React.FC<DynamicInputProps> = ({
  label,
  name,
  value,
  onChange,
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  error,
  type = 'text',
  ...props // باقي الخصائص مثل placeholder, required, disabled
}) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${containerClassName}`}>
      {/* Label الديناميكي */}
      <label 
        htmlFor={name} 
        className={`text-sm font-medium text-gray-700 ${labelClassName}`}
      >
        {label}
      </label>

      {/* Input الديناميكي */}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={`
          w-full px-4 py-2 border rounded-lg transition-all outline-none text-gray-800 dark:text-gray-200
          ${error ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'}
          ${inputClassName} 
        `}
        {...props}
      />

      {/* حالة الخطأ إن وجدت */}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};