"use client"; // ضروري جداً لاستخدام Hooks

import DynamicCard from '@/components/ui/dynamicCard';
import { useAuth } from '@/context/AuthContext';
import { GetBestSellingProducts, GetCustomerAcquisition, GetCustomerInteractions, GetLowStockProducts, GetSalesByCity, GetSalesByStatusAction, GetTopCustomers, GetTopSellingUsers } from '@/server/analytics';
import { TrendingUp, TrendingDown, Package, Loader2, Users } from 'lucide-react';
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
    const [topCustomer, setTopCustomer] = React.useState<{ success: boolean, data: any[] }>({
        success: true,
        data: []
    });
    const [topSale, setTopSale] = React.useState<{ success: boolean, data: any[] }>({
        success: true,
        data: []
    });
    const [lowStock, setLowStock] = React.useState<{ success: boolean, data: any[] }>({
        success: true,
        data: []
    });
    const [topSellingUsers, setTopSellingUsers] = React.useState<{ success: boolean, data: any[] }>({
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

        const getTopCustomer = async () => {
            if (user?.id) {
                setLoading(true);
                const res = await GetTopCustomers();
                // Prisma يعيد كود قد يحتاج لتحويل بسيط أو التأكد من الهيكل
                setTopCustomer(res as any);
                setLoading(false);
            }

        }

        const getTopSaleProduct = async () => {
            if (user?.id) {
                setLoading(true);
                const res = await GetBestSellingProducts();
                // Prisma يعيد كود قد يحتاج لتحويل بسيط أو التأكد من الهيكل
                setTopSale(res as any);
                setLoading(false);
            }

        }

        const getLowStock = async () => {
            if (user?.id) {
                setLoading(true);
                const res = await GetLowStockProducts();
                setLowStock(res as any);
                setLoading(false);
            }
        }

        const getTopSellingUsers = async () => {
            if (user?.id) {
                setLoading(true);
                const res = await GetTopSellingUsers();
                setTopSellingUsers(res as any);
                setLoading(false);
            }
        }

        getTopSaleProduct()
        getTopCustomer();
        getCountry()
        getMsg()
        getDatas();
        
        getLowStock();
        getTopSellingUsers();
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

            <DynamicCard
                isLoading={loading}
                isError={!topCustomer.success}
                isEmpty={!loading && topCustomer.success && topCustomer.data?.length === 0}
                variant="glass"
                className='mt-3'
            >
                <DynamicCard.Header
                    title="أفضل العملاء"
                    description="أكثر 10 عملاء شراءً بناءً على عدد الطلبات الإجمالي"
                    icon={<Users size={20} />} // تغيير الأيقونة لتناسب العملاء
                />

                <DynamicCard.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topCustomer.data?.map((item: any) => (
                        <div
                            key={item.id}
                            className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-24"
                        >
                            <div className="flex flex-col justify-center overflow-hidden">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.name}>
                                    {item.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {item._count?.orders || 0} طلبات منفذة
                                </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                                        {/* يمكنك إضافة إجمالي مبالغ العميل هنا إذا قمت بتعديل الـ Action */}
                                        VIP
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase">تصنيف العميل</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </DynamicCard.Content>

                <DynamicCard.Footer>
                    <div className="flex flex-col justify-start w-full">
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                إجمالي طلبات كبار العملاء:
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {topCustomer.data?.reduce((sum: number, item: any) => sum + (item._count?.orders || 0), 0)} طلب
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                            * يتم تحديث هذه القائمة بناءً على نشاط الطلبات الأخير
                        </p>
                    </div>
                </DynamicCard.Footer>
            </DynamicCard>

            <DynamicCard
                isLoading={loading}
                isError={!topSale.success}
                isEmpty={!loading && topSale.success && topSale.data?.length === 0}
                variant="glass"
                className="mt-3"
            >
                <DynamicCard.Header
                    title="المنتجات الأكثر مبيعاً"
                    description="أعلى 5 منتجات تم طلبها من حيث الكمية المباعة"
                    icon={<TrendingUp size={20} className="text-emerald-500" />}
                />
                
                <DynamicCard.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topSale.data?.map((product: any, index: number) => (
                        <div 
                            key={index}
                            className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-24"
                        >
                            {/* معلومات المنتج والترتيب */}
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-sm">
                                    #{index + 1}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={product.name}>
                                        {product.name}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        سعر الوحدة: {product.price?.toLocaleString()}$
                                    </span>
                                </div>
                            </div>

                            {/* إحصائيات المبيعات */}
                            <div className="text-right flex-shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                        {product.totalSold?.toLocaleString() || 0}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">قطعة مباعة</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </DynamicCard.Content>

                <DynamicCard.Footer>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                            * تم احتساب الكميات بناءً على الطلبات المكتملة
                        </span>
                        <div className="flex items-center gap-1 text-emerald-500 font-semibold text-sm">
                            <span>إجمالي: </span>
                            {topSale.data?.reduce((acc: number, curr: any) => acc + (curr.totalSold || 0), 0)}
                        </div>
                    </div>
                </DynamicCard.Footer>
            </DynamicCard>

            <DynamicCard
                isLoading={loading}
                isError={!lowStock.success}
                isEmpty={!loading && lowStock.success && lowStock.data?.length === 0}
                variant="glass"
                className="mt-3"
            >
                <DynamicCard.Header
                    title="المنتجات منخفضة المخزون"
                    description="المنتجات التي كميتها أقل من 5"
                    icon={<TrendingDown size={20} className="text-red-500" />}
                />
                
                <DynamicCard.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lowStock.data?.map((product: any, index: number) => (
                        <div 
                            key={index}
                            className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-24"
                        >
                            {/* معلومات المنتج والترتيب */}
                            {/* <div className="flex items-center gap-4 overflow-hidden">
                                <div className="flex-shrink-0 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 font-bold text-sm">
                                    #{index + 1}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={product.name}>
                                        {product.name}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        سعر الوحدة: {product.price?.toLocaleString()}$
                                    </span>
                                </div>
                            </div> */}

                            {/* إحصائيات المبيعات */}
                            {/* <div className="text-right flex-shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                        {product.totalSold?.toLocaleString() || 0}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">قطعة مباعة</span>
                                </div>
                            </div> */}
                            <div className="flex justify-between items-center w-full">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={product.name}>
                                    {product.name}  
                                </span>
    
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="flex flex-col items-end">
                                        <span className="text-red-600 dark:text-red-400 font-bold text-lg">
                                            {product.stock.toLocaleString() || 0}
                                        </span>
                                        <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">كمية في المخزون</span>
                                    </div>
                                </div>
                                </div>
                    ))}
                </DynamicCard.Content>

                <DynamicCard.Footer>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                            * يرجى مراجعة المخزون وإعادة الطلب في الوقت المناسب لتجنب نفاد المنتجات
                        </span>
                        
                    </div>
                </DynamicCard.Footer>
            </DynamicCard>
            
            <DynamicCard
                isLoading={loading}
                isError={!topSellingUsers.success}
                isEmpty={!loading && topSellingUsers.success && topSellingUsers.data?.length === 0}
                variant="glass"
                className="mt-3"
            >
                <DynamicCard.Header
                    title="المستخدمين الأكثر مبيعاً"
                    description="المستخدمين الذين حققوا أعلى مبيعات"
                    icon={<TrendingUp size={20} className="text-green-500" />}
                />
                
                <DynamicCard.Content className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {topSellingUsers.data?.map((user: any, index: number) => (
        <div 
            key={index}
            className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800 h-24"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                {/* إضافة رتبة بسيطة لإضفاء مظهر احترافي */}
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/10 text-red-600 text-xs font-bold">
                    {index + 1}
                </div>
                <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={user.name}>
                        {user.name} 
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">موظف مبيعات</span>
                </div>
            </div>

            <div className="text-right flex-shrink-0">
                <div className="flex flex-col items-end">
                    <span className="text-red-600 dark:text-red-400 font-bold text-lg">
                        {user.totalSold?.toLocaleString() || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">طلب مكتمل</span>
                </div>
            </div>
        </div>
    ))}
</DynamicCard.Content>

                <DynamicCard.Footer>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-xs text-slate-500 dark:text-slate-400 italic">
                            * يتم تحديث هذه القائمة بناءً على أداء المبيعات الأخير لكل مستخدم
                        </span>
                        <div className="flex items-center gap-1 text-emerald-500 font-semibold text-sm">
                            <span>إجمالي: </span>
                            {topSellingUsers.data?.reduce((acc: number, curr: any) => acc + (curr.totalSold || 0), 0)}
                        </div>
                    </div>
                </DynamicCard.Footer>
            </DynamicCard>
        </div>
    );
};

export default AnalyticPage;