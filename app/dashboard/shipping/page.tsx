"use client";
import { DynamicForm } from "@/components/shared/dynamic-form";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/utils";
import { getOrderCurrencySymbol, getOrderDisplayDate, getOrderNetAmountAfterShipping, getOrderTotalShippingExpenses } from "@/orders/orderHelpers";
import { createshipping, deletshipping, getshippingWithOrders, updateshipping, getFatihOrders } from "@/server/shipping";
import { FATIH_COMPANY_NAME } from "@/lib/fatih";
import { AnimatePresence, motion } from "framer-motion";
import { Edit, Trash2 } from "lucide-react";
import React from "react";
import toast from "react-hot-toast";
import z, { set } from "zod";
import { FormInput } from "@/components/ui/form-input";

const shippingSchema = z.object({
    name: z.string().min(3, "اسم شركة الشحن مطلوب"),
    price: z.number().min(0, "السعر لا يمكن أن يكون سالب"),
    password: z.string().optional(),
});
export default function ShippingPage() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<any>(null);
    const [shipping, setshipping] = React.useState<any[]>([]);
    const [selectedShipping, setSelectedShipping] = React.useState<any>(null);
    const { user } = useAuth()

    // طلبات شركة الفاتح القادمة من الـ API الخارجي
    const isFatihSelected = (selectedShipping?.name || "").trim() === FATIH_COMPANY_NAME;
    const [fatihOrders, setFatihOrders] = React.useState<any[]>([]);
    const [fatihPagination, setFatihPagination] = React.useState<any>(null);
    const [fatihLoading, setFatihLoading] = React.useState(false);
    const [fatihPage, setFatihPage] = React.useState(1);
    const [fatihError, setFatihError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!isDetailsOpen || !isFatihSelected) return;
        const fetchFatih = async () => {
            setFatihLoading(true);
            setFatihError(null);
            try {
                const res = await getFatihOrders({ page: fatihPage });
                if (res.success) {
                    setFatihOrders(Array.isArray(res.data?.orders) ? res.data.orders : []);
                    setFatihPagination(res.data?.pagination || null);
                } else {
                    setFatihError(res.error || "حدث خطأ أثناء جلب طلبات الفاتح");
                }
            } catch (error) {
                setFatihError("حدث خطأ غير متوقع أثناء جلب طلبات الفاتح");
            } finally {
                setFatihLoading(false);
            }
        };
        fetchFatih();
    }, [isDetailsOpen, isFatihSelected, fatihPage]);

    const selectedShippingOrders = React.useMemo(() => {
        return Array.isArray(selectedShipping?.orders) ? selectedShipping.orders : [];
    }, [selectedShipping]);

    const selectedShippingStatusSummary = React.useMemo(() => {
        const summaryMap = new Map<string, { status: string; count: number; totalAmount: number }>();

        selectedShippingOrders.forEach((order: any) => {
            const status = String(order?.status || "غير محدد");
            const current = summaryMap.get(status) || { status, count: 0, totalAmount: 0 };
            current.count += 1;
            current.totalAmount += Number(order?.finalAmount || 0);
            summaryMap.set(status, current);
        });

        return Array.from(summaryMap.values()).sort((a, b) => b.count - a.count);
    }, [selectedShippingOrders]);

    const selectedShippingTotals = React.useMemo(() => {
        return selectedShippingOrders.reduce(
            (acc: { ordersCount: number; totalAmount: number; totalShippingAmount: number; totalNetAmount: number }, order: any) => {
                acc.ordersCount += 1;
                acc.totalAmount += Number(order?.finalAmount || 0);
                acc.totalShippingAmount += getOrderTotalShippingExpenses(order);
                acc.totalNetAmount += getOrderNetAmountAfterShipping(order);
                return acc;
            },
            { ordersCount: 0, totalAmount: 0, totalShippingAmount: 0, totalNetAmount: 0 }
        );
    }, [selectedShippingOrders]);


    const getData = async () => {
        try {
            const res = await getshippingWithOrders();
            if (res.success) {
                setshipping(res.data);
            } else {
                toast.error("حدث خطأ أثناء جلب بيانات شركات الشحن");
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع أثناء جلب بيانات شركات الشحن");
        }
    };
    React.useEffect(() => {
        getData();
    }, []);
    const handleClose = () => {
        setIsOpen(false);
        setEditId(null);
        setFormData(null);
    };

    const openDetailsModal = (data: any) => {
        setSelectedShipping(data);
        setFatihOrders([]);
        setFatihPagination(null);
        setFatihError(null);
        setFatihPage(1);
        setIsDetailsOpen(true);
    };

    const handleEdit = (data: any) => {
        setEditId(data.id);
        setFormData({
            name: data.name,
            price: data.price
        });
        setIsOpen(true);
    }

    const handledelete = async (data: any) => {
        const loadingToast = toast.loading('جاري حذف شركة الشحن...');
        try {
            const res = await deletshipping(data.id);
            if (res.success) {
                toast.success("تم حذف شركة الشحن بنجاح");
                getData();
            } else {
                toast.error("حدث خطأ أثناء حذف شركة الشحن");
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع أثناء حذف شركة الشحن");
        } finally {    
                            toast.dismiss(loadingToast);
        }
    };

    const onSubmit = async (data: z.infer<typeof shippingSchema>) => {
        const loadingToast = toast.loading(editId ? 'جاري تحديث البيانات...' : 'جاري إنشاء شركة الشحن...');
        try {
            if (editId) {
                const res = await updateshipping(editId, data);
                if (res.success) {
                    toast.success("تم تحديث شركة الشحن بنجاح");
                } else {
                    toast.error("حدث خطأ أثناء تحديث شركة الشحن");
                }

            } else {
                const res = await createshipping(data);
                if (res.success) {
                    toast.success("تم إنشاء شركة الشحن بنجاح");
                } else {
                    toast.error("حدث خطأ أثناء إنشاء شركة الشحن");
                }
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع");
        } finally {
            toast.dismiss(loadingToast);
            // قم بإعادة جلب بيانات شركات الشحن لتحديث القائمة
            getData();
            setIsOpen(false);
        }
    };

        return (
            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-bold">إدارة شركات الشحن</div>
                    {
                        user && hasPermission(user, "addCategories") && (
                            <Button
                                onClick={() => { setEditId(null); setFormData(null); setIsOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                            >
                                إضافة شركة شحن جديدة
                            </Button>
                        )
                    }
                </div>

                <AnimatePresence>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shipping.map((e: any) => (
                            <motion.div
                                key={e.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500 transition-all"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                            <button
                                                type="button"
                                                onClick={() => openDetailsModal(e)}
                                                className="text-right hover:text-blue-600 transition-colors"
                                            >
                                                {e.name}
                                            </button>
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {e.price} سعر الشحن
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            عدد الطلبات المرتبطة: {Array.isArray(e.orders) ? e.orders.length : 0}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        {user && hasPermission(user, "editCategories") && (
                                            <button
                                                onClick={() => handleEdit(e)}
                                                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        {user && hasPermission(user, "deleteCategories") && (
                                            <button
                                                onClick={() => handledelete(e)}
                                                className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
                <AppModal
                    title={editId ? "تعديل بيانات الفئة" : "إضافة فئة جديدة"}
                    isOpen={isOpen}
                    onClose={handleClose}
                >
                    <div className="p-2 max-h-[80vh]">
                        <DynamicForm
                            schema={shippingSchema}
                            onSubmit={onSubmit}
                            defaultValues={formData}
                            key={editId || 'create'}
                            submitLabel={editId ? 'تحديث البيانات' : 'إرسال البيانات'}
                        >
                            {({ register, formState: { errors } }) => (
                                <div className="grid gap-4">
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label="اسم الفئة"
                                        {...register("name")}
                                        error={errors.name?.message as string}
                                    />
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label="سعر الشحن"   
                                        type="number"
                                        step="0.01"
                                        {...register("price", { valueAsNumber: true })}
                                        error={errors.price?.message as string}
                                    />
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label={editId ? "كلمة السر (اتركها فارغة لعدم التغيير)" : "كلمة السر (الافتراضية 1234567)"}
                                        type="text"
                                        {...register("password")}
                                        error={errors.password?.message as string}
                                    />
                                </div>
                            )}
                        </DynamicForm>
                    </div>
                </AppModal>

                <AppModal
                    title={`تفاصيل شركة الشحن - ${selectedShipping?.name || ""}`}
                    isOpen={isDetailsOpen}
                    size="xl"
                    onClose={() => {
                        setIsDetailsOpen(false);
                        setSelectedShipping(null);
                    }}
                >
                    <div className="p-4 space-y-4" dir="rtl">
                        {!selectedShipping ? (
                            <div className="text-sm text-slate-500">لا توجد بيانات لعرضها.</div>
                        ) : (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">اسم شركة الشحن</div>
                                        <div className="mt-1 text-lg font-black text-slate-800 dark:text-white">{selectedShipping.name}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">سعر الشحن الأساسي</div>
                                        <div className="mt-1 text-lg font-black text-blue-600">{Number(selectedShipping.price || 0).toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">مجموع الطلبات</div>
                                        <div className="mt-1 text-lg font-black text-emerald-600">{selectedShippingTotals.ordersCount.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">مبلغ الطلبات الكلي</div>
                                        <div className="mt-1 text-lg font-black text-blue-600">{selectedShippingTotals.totalAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">مبلغ الشحن الكلي</div>
                                        <div className="mt-1 text-lg font-black text-amber-600">{selectedShippingTotals.totalShippingAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="text-xs text-slate-500">الفرق بين الطلب والشحن</div>
                                        <div className="mt-1 text-lg font-black text-violet-600">{selectedShippingTotals.totalNetAmount.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-3 font-black text-slate-800 dark:text-white">ملخص الحالات</div>
                                    {selectedShippingStatusSummary.length === 0 ? (
                                        <div className="text-sm text-slate-500">لا توجد طلبات مرتبطة بهذه الشركة.</div>
                                    ) : (
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                            {selectedShippingStatusSummary.map((item) => (
                                                <div key={item.status} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                                                    <div className="font-bold text-slate-800 dark:text-slate-100">{item.status}</div>
                                                    <div className="mt-1 text-xs text-slate-500">عدد الطلبات: {item.count.toLocaleString()}</div>
                                                    <div className="text-sm font-black text-blue-600">إجمالي القيمة: {item.totalAmount.toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="mb-3 font-black text-slate-800 dark:text-white">الطلبات المرتبطة</div>
                                    {selectedShippingOrders.length === 0 ? (
                                        <div className="text-sm text-slate-500">لا توجد طلبات مرتبطة بهذه الشركة.</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300">
                                                        <th className="px-3 py-2 text-right">رقم الطلب</th>
                                                        <th className="px-3 py-2 text-right">العميل</th>
                                                        <th className="px-3 py-2 text-right">البائع</th>
                                                        <th className="px-3 py-2 text-right">الحالة</th>
                                                        <th className="px-3 py-2 text-right">مبلغ الطلب الكلي</th>
                                                        <th className="px-3 py-2 text-right">مبلغ الشحن</th>
                                                        <th className="px-3 py-2 text-right">الفرق بعد طرح الشحن</th>
                                                        <th className="px-3 py-2 text-right">المدينة</th>
                                                        <th className="px-3 py-2 text-right">التاريخ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedShippingOrders.map((order: any) => (
                                                        <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800/70">
                                                            <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{order.orderNumber}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.customer?.name || "-"}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.user?.username || "-"}</td>
                                                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{order.status || "-"}</td>
                                                            <td className="px-3 py-2 font-bold text-blue-600">{Number(order.finalAmount || 0).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                                            <td className="px-3 py-2 font-bold text-amber-600">{getOrderTotalShippingExpenses(order).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                                            <td className="px-3 py-2 font-bold text-violet-600">{getOrderNetAmountAfterShipping(order).toLocaleString()} {getOrderCurrencySymbol(order)}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.city || "-"}</td>
                                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{new Date(getOrderDisplayDate(order)).toLocaleDateString("ar-EG")}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {isFatihSelected && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                        <div className="mb-3 font-black text-slate-800 dark:text-white">طلبات الفاتح (من نظام الشركة)</div>
                                        {fatihLoading ? (
                                            <div className="text-sm text-slate-500">جاري تحميل الطلبات...</div>
                                        ) : fatihError ? (
                                            <div className="text-sm text-red-500">{fatihError}</div>
                                        ) : fatihOrders.length === 0 ? (
                                            <div className="text-sm text-slate-500">لا توجد طلبات في نظام الفاتح.</div>
                                        ) : (
                                            <>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300">
                                                                <th className="px-3 py-2 text-right">رقم الشحنة</th>
                                                                <th className="px-3 py-2 text-right">الحالة</th>
                                                                <th className="px-3 py-2 text-right">المرسل</th>
                                                                <th className="px-3 py-2 text-right">المستلم</th>
                                                                <th className="px-3 py-2 text-right">من مدينة</th>
                                                                <th className="px-3 py-2 text-right">إلى مدينة</th>
                                                                <th className="px-3 py-2 text-right">التاريخ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {fatihOrders.map((order: any) => (
                                                                <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800/70">
                                                                    <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-100">{order.qr_code || order.code || order.id}</td>
                                                                    <td className="px-3 py-2">
                                                                        <span
                                                                            className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                                                                            style={{ backgroundColor: order.status?.color || "#64748b" }}
                                                                        >
                                                                            {order.status?.label || order.status?.value || "-"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.sender?.name || "-"}</td>
                                                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.receiver?.name || "-"}</td>
                                                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.source?.city?.name || "-"}</td>
                                                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.target?.city?.name || "-"}</td>
                                                                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{order.created_at ? new Date(order.created_at).toLocaleDateString("ar-EG") : "-"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {fatihPagination && fatihPagination.lastPage > 1 && (
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <button
                                                            type="button"
                                                            disabled={fatihPage <= 1}
                                                            onClick={() => setFatihPage((p) => Math.max(1, p - 1))}
                                                            className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700"
                                                        >
                                                            السابق
                                                        </button>
                                                        <span className="text-sm text-slate-500">
                                                            صفحة {fatihPagination.currentPage} من {fatihPagination.lastPage} (المجموع: {fatihPagination.total})
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={!fatihPagination.has_MorePages}
                                                            onClick={() => setFatihPage((p) => p + 1)}
                                                            className="rounded-lg border border-slate-200 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-700"
                                                        >
                                                            التالي
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </AppModal>
            </div>
        );
    }
