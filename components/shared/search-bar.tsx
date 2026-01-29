"use client";

import React, { useEffect, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export const SearchBar = ({ 
  onSearch, 
  placeholder = "ابحث عن شيء ما...", 
  className,
  isLoading = false 
}: SearchBarProps) => {
  const [text, setText] = useState("");
  
  // تأخير إرسال القيمة بمقدار 500ms لتحسين الأداء
  const [query] = useDebounce(text, 500);

  useEffect(() => {
    onSearch(query);
  }, [query, onSearch]);

  const clearSearch = () => {
    setText("");
    onSearch("");
  };

  return (
    <div className={cn("relative w-full max-w-sm group", className)}>
      {/* أيقونة البحث */}
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 pr-10 pl-10 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-sm outline-none transition-all",
          "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
          "placeholder:text-slate-400"
        )}
      />

      {/* زر المسح (يظهر فقط عند وجود نص) */}
      {text && !isLoading && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 left-2 flex items-center px-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};