"use client"
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import React from "react";

export default function ViewOrderCustomer({ orders }: { orders: any[] }) {
  // حالة لتخزين معرف الطلب المفتوح حالياً لعرض منتجاته
  const [expandedOrderId, setExpandedOrderId] = React.useState<number | null>(null);

  if (!orders || orders.length === 0) return <div className="p-10 text-center font-bold">لا يوجد طلبات سابقة لهذا العميل</div>;

  const clientName = orders[0].customer?.name || "العميل";

  // دالة لتبديل حالة العرض (فتح/إغلاق)
  const toggleOrder = (id: number) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          طلبات العميل: {clientName}
          <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
            {orders.length} فواتير
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 max-h-[70vh] overflow-y-auto pr-2">
        {orders.map((order: any) => (
          <div key={order.id} className="flex flex-col gap-2">
            {/* بطاقة الطلب الرئيسية */}
            <div
              onClick={() => toggleOrder(order.id)}
              className={`flex justify-between items-center p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] hover:shadow-lg transition-all cursor-pointer border-r-4 ${expandedOrderId === order.id ? 'border-r-blue-600 shadow-md' : 'border-r-blue-500'
                }`}
            >
              <div className="space-y-1">
                <p className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  رقم المرجع: <span className="font-mono text-blue-600">#{order.orderNumber}</span>
                  {expandedOrderId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">📅 {new Date(order.createdAt).toLocaleDateString('ar-EG')}</span>
                  <span className="flex items-center gap-1">👤 بواسطة: {order.user?.name || 'Admin'}</span>
                </div>
              </div>

              <div className="text-left space-y-1">
                <p className="font-black text-lg text-slate-900 dark:text-white italic">
                  {Number(order.finalAmount).toLocaleString()} <span className="text-xs">ل.س</span>
                </p>
                <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block font-bold ${order.status === 'مدفوعة' || order.status === 'تم التسليم'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
                  }`}>
                  {order.status}
                </div>
              </div>
            </div>

            {/* قسم المنتجات (يظهر فقط عند الضغط) */}
            {expandedOrderId === order.id && (
              <div className="mx-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-[1.5rem] border-x border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-[11px] font-black text-slate-400 mb-3 flex items-center gap-2">
                  <Package size={12} /> محتويات الطلب:
                </h4>
                <div className="space-y-2">

                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {item.product?.name || item.name || "منتج غير مسمى"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono italic">
                          {item.product?.modelNumber || item.modelNumber || "بدون موديل"}
                        </span>
                      </div>
                      <div className="text-left font-bold">
                        <span className="text-blue-600">{item.quantity}</span>
                        <span className="text-[10px] text-slate-400 mr-1">×</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 ml-2">
                          {Number(item.price).toLocaleString()} ل.س
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!order.items || order.items.length === 0) && (
                    <div className="text-xs text-center text-slate-400 italic">لا توجد منتجات مسجلة لهذا الطلب</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
