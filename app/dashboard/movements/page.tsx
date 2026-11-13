"use client";

import { DataTable } from "@/components/shared/DataTable";
import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/utils";
import { getMovementLogs } from "@/server/invoices";
import React from "react";
import toast from "react-hot-toast";

const movementTypeLabel: Record<string, { label: string; className: string }> = {
  IN: { label: "إضافة", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  OUT: { label: "سحب", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  TRANSFER: { label: "تحويل", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ADJUSTMENT: { label: "تسوية جرد", className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  RETURN: { label: "إرجاع", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

export default function MovementsLogPage() {
  const { user } = useAuth();
  const canView = Boolean(user && isAdmin(user));

  const [activeTab, setActiveTab] = React.useState<"stock" | "status">("stock");
  const [stockMovements, setStockMovements] = React.useState<any[]>([]);
  const [statusLogs, setStatusLogs] = React.useState<any[]>([]);
  const [stockPage, setStockPage] = React.useState(1);
  const [statusPage, setStatusPage] = React.useState(1);
  const PAGE_SIZE = 15;

  const loadData = React.useCallback(async () => {
    if (!canView) return;
    const res = await getMovementLogs();
    if (!res.success) {
      toast.error(String(res.error || "فشل في جلب سجل الحركات"));
      return;
    }

    const payload = res.data as any;
    setStockMovements(payload?.stockMovements || []);
    setStatusLogs(payload?.orderStatusLogs || []);
  }, [canView]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  if (!canView) {
    return (
      <div className="p-4" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">سجل الحركات</h1>
        <p className="mt-4 text-sm text-slate-500">لا تملك صلاحية عرض هذه الصفحة.</p>
      </div>
    );
  }

  const tabs = [
    { key: "stock" as const, label: `حركات المخزون (${stockMovements.length})` },
    { key: "status" as const, label: `تغيير حالات الطلبات (${statusLogs.length})` },
  ];

  return (
    <div className="p-4 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">سجل الحركات</h1>
        <p className="text-sm text-slate-500 mt-1">
          سجل حركات المخزون وتغيير حالات الطلبات مع الموظف الذي نفذ كل عملية
        </p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-2.5 rounded-2xl font-black text-sm transition-all ${
              activeTab === tab.key
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stock" ? (
        <DataTable
          data={stockMovements}
          totalCount={stockMovements.length}
          pageSize={PAGE_SIZE}
          currentPage={stockPage}
          onPageChange={(p) => setStockPage(p)}
          columns={[
            {
              header: "النوع",
              accessor: (row: any) => {
                const type = movementTypeLabel[String(row.type)] || movementTypeLabel.ADJUSTMENT;
                return (
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black ${type.className}`}>
                    {type.label}
                  </span>
                );
              },
            },
            { header: "المنتج", accessor: (row: any) => row.product?.name || "-" },
            { header: "المستودع", accessor: (row: any) => row.warehouse?.name || "-" },
            {
              header: "الكمية",
              accessor: (row: any) => {
                const isOut = row.type === "OUT" || row.type === "TRANSFER";
                return (
                  <span className={`font-black ${isOut ? "text-red-600" : "text-emerald-600"}`}>
                    {isOut ? "-" : "+"}
                    {row.quantity}
                  </span>
                );
              },
            },
            { header: "السبب", accessor: (row: any) => row.reason || "-" },
            {
              header: "الموظف",
              accessor: (row: any) => (
                <span className="font-bold text-slate-700 dark:text-slate-200">{row.user?.username || "غير مسجل"}</span>
              ),
            },
            {
              header: "التاريخ",
              accessor: (row: any) =>
                new Date(row.createdAt).toLocaleString("ar-EG", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
            },
          ]}
        />
      ) : (
        <DataTable
          data={statusLogs}
          totalCount={statusLogs.length}
          pageSize={PAGE_SIZE}
          currentPage={statusPage}
          onPageChange={(p) => setStatusPage(p)}
          columns={[
            {
              header: "رقم الطلب",
              accessor: (row: any) => (
                <span className="font-mono font-bold text-blue-600">
                  #{row.order?.orderNumber || row.wholesaleOrder?.orderNumber || "-"}
                </span>
              ),
            },
            {
              header: "نوع الطلب",
              accessor: (row: any) => (row.order ? "مفرد" : row.wholesaleOrder ? "جملة" : "-"),
            },
            {
              header: "الحالة السابقة",
              accessor: (row: any) => row.oldStatus || <span className="text-slate-400 italic">إنشاء</span>,
            },
            {
              header: "الحالة الجديدة",
              accessor: (row: any) => <span className="font-black text-slate-900 dark:text-white">{row.newStatus}</span>,
            },
            {
              header: "الموظف",
              accessor: (row: any) => (
                <span className="font-bold text-slate-700 dark:text-slate-200">{row.user?.username || "غير مسجل"}</span>
              ),
            },
            {
              header: "التاريخ",
              accessor: (row: any) =>
                new Date(row.createdAt).toLocaleString("ar-EG", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
            },
          ]}
        />
      )}
    </div>
  );
}
