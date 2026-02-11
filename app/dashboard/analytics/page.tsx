"use client"; // ضروري جداً لاستخدام Hooks

import DynamicCard from '@/components/ui/dynamicCard';
import { useAuth } from '@/context/AuthContext';
import { GetCustomerInteractions, GetSalesByCity, GetSalesByStatusAction } from '@/server/analytics';
import { TrendingUp, Package, Loader2 } from 'lucide-react';
import * as React from 'react';

const AnalyticPage: React.FC = () => {
    // تحديد الحالة الأولية بدقة لتجنب أخطاء undefined
    const [result, setResult] = React.useState<{ success: boolean, data: any[] }>({
        success: true,
        data: []
    });
    const [msg, setMsg] = React.useState<{ success: boolean, data: any[] }>({
        success: true,
        data: []
    });
    const [country, setCountry] = React.useState<{ success: boolean, data: any[] }>({
        success: true,
        data: []
    });
    const [loading, setLoading] = React.useState(true);

    const { user } = useAuth();

    React.useEffect(() => {
        const getDatas = async () => {
            if (user?.id) {
                setLoading(true);
                const res = await GetSalesByStatusAction(user.id);
                // Prisma يعيد كود قد يحتاج لتحويل بسيط أو التأكد من الهيكل
                setResult(res as any);
                setLoading(false);
            }
        };

        const getMsg = async () => {
            if (user?.id) {
                setLoading(true);
                const res = await GetCustomerInteractions(user?.id);
                // Prisma يعيد كود قد يحتاج لتحويل بسيط أو التأكد من الهيكل
                setMsg(res as any);
                setLoading(false);
            }

        }
        const getCountry = async () => {
            if (user?.id) {
                setLoading(true);
                const res = await GetSalesByCity(user?.id);
                // Prisma يعيد كود قد يحتاج لتحويل بسيط أو التأكد من الهيكل
                setCountry(res as any);
                setLoading(false);
            }

        }

        getCountry()
        getMsg()
        getDatas();
    }, [user?.id]); // إعادة الطلب إذا تغير المستخدم

    return (
        <div className="p-8">
            {/* 1. كرت إحصائيات المبيعات حسب الحالة */}
            <DynamicCard
                isLoading={loading}
                isError={!result.success}
                isEmpty={!loading && result.success && result.data?.length === 0}
                variant="glass"
            >
                <DynamicCard.Header
                    title="حالات الطلبات"
                    description="ملخص لجميع الطلبات بناءً على حالتها الحالية"
                    icon={<Package size={20} />}
                />

                <DynamicCard.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {result.data?.map((item: any) => (
                        <div
                            key={item.status}
                            className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-24"
                        /* أضفنا h-24 لتوحيد الارتفاع لجميع البطاقات */
                        >
                            <div className="flex flex-col justify-center overflow-hidden">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.status}>
                                    {item.status}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {item._count.id} طلب
                                </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                                    {item._sum.finalAmount?.toLocaleString() || 0}$
                                </span>
                            </div>
                        </div>
                    ))}
                </DynamicCard.Content>

                <DynamicCard.Footer >
                    <div className="flex flex-col justify-start w-full">
                        <div className="">
                            <div className="flex justify-between w-full items-center">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    إجمالي عدد الطلبات:
                                </span>
                                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {/* نستخدم _count.id لأننا نعد السجلات ولا نجمع قيم المعرفات */}
                                    {result.data?.reduce((sum: number, item: any) => sum + (item._count?.id || 0), 0)} طلب
                                </span>
                            </div>

                            <div className="flex justify-between w-full items-center">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    المبلغ الإجمالي المخطط:
                                </span>
                                <span className="text-md font-semibold text-green-600 dark:text-green-400">
                                    {result.data?.reduce((sum: number, item: any) => sum + (item._sum?.finalAmount || 0), 0).toLocaleString()} $
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                            * هذا المجموع يشمل جميع الحالات المعروضة أعلاه
                        </p>
                    </div>
                </DynamicCard.Footer>
            </DynamicCard>

            <DynamicCard
                isLoading={loading}
                isError={!msg.success}
                isEmpty={!loading && msg.success && msg.data?.length === 0}
                variant="glass"
                className='mt-3'
            >
                <DynamicCard.Header
                    title="تفاعلات العملاء"
                    description="أكثر العملاء تواصلاً بناءً على عدد الرسائل"
                    icon={<TrendingUp size={20} />}
                />

                <DynamicCard.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {msg.data?.map((item: any) => (
                        <div
                            key={item.name}
                            className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-24"
                        >
                            <div className="flex flex-col justify-center overflow-hidden">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.name}>
                                    {item.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    عميل نشط
                                </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">
                                        {item._count.message?.toLocaleString() || 0}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase">رسالة</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </DynamicCard.Content>

                <DynamicCard.Footer>
                    <div className="flex flex-col justify-start w-full">
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                إجمالي التفاعلات المعروضة:
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {msg.data?.reduce((sum: number, item: any) => sum + (item._count?.message || 0), 0)} تفاعل
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                            * تم عرض أعلى 10 عملاء تفاعلاً مع النظام
                        </p>
                    </div>
                </DynamicCard.Footer>
            </DynamicCard>
            
            <DynamicCard
    isLoading={loading}
    isError={!country.success}
    isEmpty={!loading && country.success && country.data?.length === 0}
    variant="glass"
    className='mt-3'
>
    <DynamicCard.Header
        title="المبيعات حسب الدول"
        description="توزيع إجمالي المبيعات والطلبات بناءً على الموقع الجغرافي"
        icon={<TrendingUp size={20} />}
    />

    <DynamicCard.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {country.data?.map((item: any) => (
            <div
                key={item.country}
                className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-24"
            >
                <div className="flex flex-col justify-center overflow-hidden">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {item.country || "غير محدد"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item._count?.id || 0} طلب
                    </span>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="flex flex-col items-end">
                        <span className="text-green-600 dark:text-green-400 font-bold text-lg">
                            {item._sum?.finalAmount?.toLocaleString() || 0}$
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">إجمالي المبيعات</span>
                    </div>
                </div>
            </div>
        ))}
    </DynamicCard.Content>

    <DynamicCard.Footer>
        <div className="flex flex-col justify-start w-full">
            <div className="flex justify-between w-full items-center">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    إجمالي مبيعات جميع الدول:
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {country.data?.reduce((sum: number, item: any) => sum + (item._sum?.finalAmount || 0), 0).toLocaleString()} $
                </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                * المبالغ المعروضة تعتمد على العملة الافتراضية للنظام
            </p>
        </div>
    </DynamicCard.Footer>
</DynamicCard>
        </div>
    );
};

export default AnalyticPage;