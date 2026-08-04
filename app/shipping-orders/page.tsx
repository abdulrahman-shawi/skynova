"use client";

import { Button } from "@/components/ui/button";
import { getOrderCurrencySymbol, getOrderDisplayDate, getOrderTotalShippingExpenses } from "@/orders/orderHelpers";
import { getMyShippingOrders, shippingLogout } from "@/server/shipping";
import { useRouter } from "next/navigation";
import React from "react";
import toast from "react-hot-toast";

export default function ShippingOrdersPage() {
    const router = useRouter();
    const [company, setCompany] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const load = async () => {
            try {
                const res = await getMyShippingOrders();
                if (res.success && res.data) {
                    setCompany(res.data);
                } else {
                    router.replace("/shipping-login");
                }
            } catch {
                router.replace("/shipping-login");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    const handleLogout = async () => {
        await shippingLogout();
        router.replace("/shipping-login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500" dir="rtl">
                جاري تحميل الطلبات...
            </div>
        );
    }

    if (!company) return null;

    const orders = Array.isArray(company.orders) ? company.orders : [];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8" dir="rtl">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <h1 className="text-xl font-black text-slate-900 dark:text-white">
                        طلبات شركة {company.name}
                    </h1>
                    <Button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white px-4"
                    >
                        تسجيل الخروج
                    </Button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    {orders.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-8">
                            لا توجد طلبات مرتبطة بهذه الشركة.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300">
                                        <th className="px-3 py-2 text-right">رقم الطلب</th>
                                        <th className="px-3 py-2 text-right">العميل</th>
                                        <th className="px-3 py-2 text-right">هاتف العميل</th>
                                        <th className="px-3 py-2 text-right">الحالة</th>
                                        <th className="px-3 py-2 text-right">مبلغ الطلب الكلي</th>
                                        <th className="px-3 py-2 text-right">مبلغ الشحن</th>
                                        <th className="px-3 py-2 text-right">المدينة</th>
                                        <th className="px-3 py-2 text-right">التاريخ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order: any) => (
                                        <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800/70">
                                            <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{order.orderNumber}</td>
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.customer?.name || "-"}</td>
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                                                {order.customer?.phone ? `${order.customer.countryCode || ""}${order.customer.phone}` : "-"}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{order.status || "-"}</td>
                                            <td className="px-3 py-2 font-bold text-blue-600">{Number(order.finalAmount || 0).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                            <td className="px-3 py-2 font-bold text-amber-600">{getOrderTotalShippingExpenses(order).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.city || "-"}</td>
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{new Date(getOrderDisplayDate(order)).toLocaleDateString("ar-EG")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
