import React from 'react';
import { DataTable, TableAction } from '@/components/shared/DataTable';
import {
  statusColors,
  getWholesaleAmountToCollect,
  getWholesaleOrderCurrencySymbol,
  getWholesaleNetAmountAfterShipping,
  getWholesaleOrderTotalShippingExpenses,
  getWholesaleDisplayDate,
} from '@/wholesale-orders/wholesaleHelpers';

interface WholesaleOrderTableProps {
  orders: any[];
  actions: TableAction<any>[];
  onStatusChange: (newStatus: string, orderId: string | number) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const WholesaleOrderTable: React.FC<WholesaleOrderTableProps> = ({
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
          header: "عميل الجملة",
          accessor: (e: any) => (
            <div className="flex flex-col">
              <button
                onClick={() => {
                  const rawPhone = e.wholesaleCustomer?.phone?.[0] || "";
                  const phoneNumber = rawPhone.replace(/\D/g, "");
                  if (phoneNumber) {
                    window.open(`https://wa.me/${phoneNumber}`, '_blank');
                  }
                }}
                className="text-right font-bold text-blue-600 hover:text-blue-700"
              >
                {e.wholesaleCustomer?.name}
              </button>
              <span className="text-xs text-slate-400">{e.wholesaleCustomer?.city}</span>
            </div>
          ),
        },
        {
          header: "بيعت من قبل",
          accessor: (e: any) => (
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {e.user?.username || "-"}
            </span>
          ),
        },
        {
          header: "المبلغ اللازم استلامه",
          accessor: (e: any) => (
            <span className="font-black text-blue-600">
              {getWholesaleAmountToCollect(e).toLocaleString()} {getWholesaleOrderCurrencySymbol(e)}
            </span>
          ),
        },
        {
          header: "الصافي بعد طرح الشحن",
          accessor: (e: any) => (
            <span className="font-black text-emerald-600">
              {getWholesaleNetAmountAfterShipping(e).toLocaleString()} {getWholesaleOrderCurrencySymbol(e)}
            </span>
          ),
        },
        {
          header: "مصاريف الشحن",
          accessor: (e: any) => (
            <span className="font-black text-amber-600">
              {getWholesaleOrderTotalShippingExpenses(e).toLocaleString()} {getWholesaleOrderCurrencySymbol(e)}
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

            return (
              <div className="min-w-[150px]">
                <select
                  className={`${currentColor} w-full p-2.5 rounded-xl border font-bold transition-all cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400`}
                  value={c.status}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    onStatusChange(newValue, c.id);
                  }}
                  name="wholesale-order-status"
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
              </div>
            );
          },
        },
        {
          header: "تاريخ الإنشاء",
          accessor: (e: any) => new Date(getWholesaleDisplayDate(e)).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
        },
      ]}
    />
  );
};
