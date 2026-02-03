"use client";

import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Edit2, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// --- تعريف الإجراءات (Actions Interface) ---
export interface TableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: "default" | "danger";
}

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
}


// تحديث الـ Props الخاصة بالجدول
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[]; // تم اختصارها هنا للتركيز على الـ Actions
  actions?: TableAction<T>[]; // إضافة دعم الإجراءات
  isLoading?: boolean;
  // ... بقية الـ props السابقة
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  actions,
  // ... 
}: DataTableProps<T>) {
  
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={cn("p-4 font-semibold text-slate-700 whitespace-nowrap dark:text-slate-300", col.className)}>
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && <ArrowUpDown className="w-3 h-3 cursor-pointer hover:text-primary" />}
                  </div>
                </th>
              ))}
              <th className="p-4 w-10">الاجراءات</th> {/* عمود الـ Actions */}
            </tr>
          </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.map((item) => (
            <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
              {/* ... (Columns mapping) */}
              {columns.map((col, idx) => (
                  <td key={idx} className={cn("p-4 text-slate-600 whitespace-nowrap dark:text-slate-400", col.className)}>
                    {typeof col.accessor === "function" 
                      ? col.accessor(item) 
                      : (item[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              {/* عمود الإجراءات (The Actions Column) */}
              {actions && (
                <td className="p-4 w-12 text-center">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all outline-none">
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                      <DropdownMenu.Content 
                        align="center" 
                        className="min-w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-xl z-50 animate-in fade-in zoom-in-95"
                      >
                        {actions.map((action, idx) => (
                          <DropdownMenu.Item
                            key={idx}
                            onClick={() => action.onClick(item)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded-md outline-none transition-colors",
                              action.variant === "danger" 
                                ? "text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30" 
                                : "text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800"
                            )}
                          >
                            {action.icon && <span className="w-4 h-4">{action.icon}</span>}
                            {action.label}
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}