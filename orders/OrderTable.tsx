import React from 'react';
import { AlertCircle } from 'lucide-react';
import { DataTable, TableAction } from '@/components/shared/DataTable';
import {
  statusColors,
  getOrderAmountToCollect,
  getOrderCurrencySymbol,
  getOrderNetAmountAfterShipping,
  getOrderShippingName,
  getOrderTotalShippingExpenses,
  getOrderDisplayDate,
  openWhatsAppByPhone,
} from '@/orders/orderHelpers';

interface OrderTableProps {
  orders: any[];
  actions: TableAction<any>[];
  onStatusChange: (newStatus: string, orderId: string | number) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const REASON_STATUSES = new Set(["تم الغاء الطلب", "تم إلغاء الطلب", "معلق / نقص معلومات", "فشل التسليم مرتجع"]);

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  actions,
  onStatusChange,
  page,
  pageSize,
  totalCount,
  onPageChange,
  isLoading = false,
}) => {
  return (
    <DataTable
      data={orders}
      actindir={true}
      isLoading={isLoading}
      totalCount={totalCount}
      pageSize={pageSize}
      currentPage={page}
      onPageChange={onPageChange}
      actions={actions}
      columns={[
        {
          header: "رقم الطلب",
          accessor: 'orderNumber',
        },
        {
          header: "العميل",
          accessor: (e: any) => (
            <div className="flex flex-col">
              <button
                onClick={() => {
                  const rawPhone = e.customer?.phone?.[0] || "";
                  const phoneNumber = rawPhone.replace(/\D/g, "");
                  const countryCode = (e.customer?.countryCode || "").replace(/\D/g, "");
                  if (phoneNumber) {
                    window.open(`https://wa.me/${countryCode}${phoneNumber}`, '_blank');
                  }
                }}
                className="text-right font-bold text-blue-600 hover:text-blue-700"
              >
                {e.customer?.name}
              </button>
            </div>
          ),
        },
        {
          header: "بيعت من قبل",
          accessor: (e: any) => {
            const employeeName = e.user?.username || e.user?.name || "-";
            const employeePhone = e.user?.phone || "";
            const hasPhone = String(employeePhone).trim().length > 0;

            return (
              <button
                type="button"
                onClick={() => openWhatsAppByPhone(employeePhone)}
                className={`font-bold ${
                  hasPhone
                    ? "text-emerald-600 hover:text-emerald-700"
                    : "text-slate-400 cursor-not-allowed"
                }`}
                disabled={!hasPhone}
                title={hasPhone ? "فتح واتساب" : "لا يوجد رقم هاتف"}
              >
                {employeeName}
              </button>
            );
          },
        },
        {
          header: "المبلغ اللازم استلامه",
          accessor: (e: any) => (
            <span className="font-black text-blue-600">
              {getOrderAmountToCollect(e).toLocaleString()} {getOrderCurrencySymbol(e)}
            </span>
          ),
        },
        {
          header: "الصافي بعد طرح الشحن",
          accessor: (e: any) => (
            <span className="font-black text-emerald-600">
              {getOrderNetAmountAfterShipping(e).toLocaleString()} {getOrderCurrencySymbol(e)}
            </span>
          ),
        },
        {
          header: "شركة الشحن",
          accessor: (e: any) => (
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {getOrderShippingName(e)}
            </span>
          ),
        },
        {
          header: "مصاريف الشحن",
          accessor: (e: any) => (
            <span className="font-black text-amber-600">
              {getOrderTotalShippingExpenses(e).toLocaleString()} {getOrderCurrencySymbol(e)}
            </span>
          ),
        },
        {
          header: "المدينة",
          accessor: (e: any) => (
            <span className="font-bold text-gray-600 dark:text-gray-300">
              {e.city || "-"}
            </span>
          ),
        },
        {
          header: "حالة الطلب",
          accessor: (c: any) => {
            const currentColor = statusColors[c.status] || "bg-slate-50 text-slate-500 border-slate-200";
            const reason = String(c.cancelReason || "").trim();
            const showReason = REASON_STATUSES.has(String(c.status || "").trim());
            const tooltipText = reason || "لا يوجد سبب مسجل";

            return (
              <div className="min-w-[150px] flex items-center gap-1.5">
                <select
                  className={`${currentColor} flex-1 w-full p-2.5 rounded-xl border font-bold transition-all cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400`}
                  value={c.status}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    onStatusChange(newValue, c.id);
                  }}
                  name="order-status"
                >
                  <option value="" disabled>
                    اختر الحالة
                  </option>
                  <option value="طلب جديد" className="bg-white text-black">
                    طلب جديد
                  </option>
                  <option value="تم استلام الطلب" className="bg-white text-black">
                    تم استلام الطلب
                  </option>
                  <option value="تم ارسال الطلب" className="bg-white text-black">
                    تم ارسال الطلب
                  </option>
                  <option value="تم تسليم الطلب" className="bg-white text-black">
                    تم تسليم الطلب
                  </option>
                  <option value="فشل التسليم مرتجع" className="bg-white text-black">
                    فشل التسليم مرتجع
                  </option>
                  <option value="تم الغاء الطلب" className="bg-white text-black">
                    تم الغاء الطلب
                  </option>
                  <option value="معلق / نقص معلومات" className="bg-white text-black">
                    معلق / نقص معلومات
                  </option>
                  <option value="المتجر" className="bg-white text-black">
                    المتجر
                  </option>
                </select>
                {showReason && (
                  <div className="relative group shrink-0">
                    <span
                      title={tooltipText}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800 cursor-help"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <div className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-bold leading-relaxed text-slate-700 dark:text-slate-200 shadow-lg whitespace-pre-wrap break-words">
                      {tooltipText}
                    </div>
                  </div>
                )}
              </div>
            );
          },
        },
        {
          header: "تاريخ الإنشاء",
          accessor: (e: any) => new Date(getOrderDisplayDate(e)).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
        },
      ]}
    />
  );
};
