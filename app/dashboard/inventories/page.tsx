'use client';
import { DataTable } from '@/components/shared/DataTable';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
// تأكد من استيراد FormInput من المكان الصحيح في مكوناتك وليس من lucide-react
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/select-form';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/utils';
import { createWarehouse, deleteWarehouse, getWarehouse, getWarehouseDetails, updateWarehouse } from '@/server/warehouse';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit, Eye, Trash2 } from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';
import z from 'zod';

interface ICategoriesLayoutProps { }

const categorySchema = z.object({
    name: z.string().min(3, "اسم المستودع مطلوب"),
    location: z.string().min(3, "موقع المستودع مطلوب")
});

const locationOptions = [
    { value: 'سوريا', label: 'سوريا' },
    { value: 'تركيا', label: 'تركيا' },
];

const tabs = [
    { id: 'products', label: 'المنتجات' },
    { id: 'orders', label: 'الطلبات' },
    { id: 'wholesaleOrders', label: 'طلبات الجملة' },
    { id: 'movements', label: 'حركات المخزون' },
    { id: 'warranties', label: 'الكفالات' },
];

const formatDate = (value: any) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const CategoriesLayout: React.FunctionComponent<ICategoriesLayoutProps> = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<any>(null);
    const [category, setCategory] = React.useState<any[]>([]);
    const [detailsOpen, setDetailsOpen] = React.useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = React.useState<any>(null);
    const [details, setDetails] = React.useState<any>(null);
    const [detailsLoading, setDetailsLoading] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('products');
    const [page, setPage] = React.useState(1);
    const { user } = useAuth();

    const PAGE_SIZE = 10;

    const handleClose = () => {
        setIsOpen(false);
        setEditId(null);
        setFormData(null);
    };

    const handleDetailsClose = () => {
        setDetailsOpen(false);
        setSelectedWarehouse(null);
        setDetails(null);
        setActiveTab('products');
        setPage(1);
    };

    const handleEdit = (data: any) => {
        setEditId(data.id);
        setFormData({
            name: data.name,
            location: data.location
        });
        setIsOpen(true);
    };

    const handleViewDetails = async (warehouse: any) => {
        setSelectedWarehouse(warehouse);
        setDetailsOpen(true);
        setDetailsLoading(true);
        setDetails(null);
        setActiveTab('products');
        setPage(1);
        try {
            const res = await getWarehouseDetails(warehouse.id);
            if (res.success) {
                setDetails(res.data);
            } else {
                toast.error(res.error || "فشل في جلب تفاصيل المستودع");
            }
        } catch (error: any) {
            toast.error("حدث خطأ أثناء جلب تفاصيل المستودع");
        } finally {
            setDetailsLoading(false);
        }
    };

    const handledelete = async (data: any) => {
        const loadingToast = toast.loading('جاري حذف المستودع...');
        const confirmed = confirm("هل أنت متأكد من حذف هذا المستودع؟");
        if (confirmed) {
            try {
                const res = await deleteWarehouse(data.id);
                if (res.success) {
                    toast.success("تم حذف المستودع بنجاح");
                } else {
                    toast.error("حدث خطأ أثناء حذف المستودع: " + (res.error || "فشل في حذف المستودع، قد يكون مرتبطًا بسجلات أخرى"));
                }
            } catch (error: any) {
                toast.error("خطأ", error);
            } finally {
                toast.dismiss(loadingToast);
                getData();
            }
        }
    };
    const onSubmit = async (data: z.infer<typeof categorySchema>) => {
        const loadingToast = toast.loading(editId ? 'جاري تحديث البيانات...' : 'جاري إنشاء الحساب...');
        try {
            if (editId) {
                console.log("تعديل:", editId);
                updateWarehouse(editId, data).then((result) => {
                    if (result.success) {
                        toast.success("تم تحديث بيانات المستودع بنجاح");
                        handleClose();
                    } else {
                        toast.error(result.error || "فشل في تحديث بيانات المستودع");
                    }
                });
            } else {
                createWarehouse(data).then((result) => {
                    if (result.success) {
                        toast.success("تم إنشاء المستودع بنجاح");
                        handleClose();
                    } else {
                        toast.error(result.error || "فشل في إنشاء المستودع، يرجى التحقق من المدخلات");
                    }
                });
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع");
            console.error(error);
        } finally {
            toast.dismiss(loadingToast);
            getData();
        }
    };

    const getData = async () => {
        const cat = await getWarehouse();
        setCategory(cat);
    };

    React.useEffect(() => { getData(); }, []);

    React.useEffect(() => { setPage(1); }, [activeTab]);

    const detailCounts = React.useMemo<Record<string, number>>(() => {
        if (!details) return {};
        return {
            products: details.stocks?.length || 0,
            orders: details.orders?.length || 0,
            wholesaleOrders: details.wholesaleOrders?.length || 0,
            movements: details.movements?.length || 0,
            warranties: details.warranties?.length || 0,
        };
    }, [details]);

    const productColumns = [
        { header: 'المنتج', accessor: (row: any) => row.product?.name || '-' },
        { header: 'الكمية', accessor: 'quantity' },
        { header: 'السعر', accessor: (row: any) => Number(row.price || 0).toLocaleString('ar-EG') },
        { header: 'الخصم', accessor: (row: any) => Number(row.discount || 0).toLocaleString('ar-EG') },
    ];

    const orderColumns = [
        { header: 'رقم الطلب', accessor: (row: any) => row.orderNumber || row.id || '-' },
        { header: 'العميل', accessor: (row: any) => row.customer?.name || '-' },
        { header: 'الحالة', accessor: (row: any) => row.status || '-' },
        { header: 'الإجمالي', accessor: (row: any) => Number(row.finalAmount || row.totalAmount || 0).toLocaleString('ar-EG') },
        { header: 'التاريخ', accessor: (row: any) => formatDate(row.manualCreatedAt || row.createdAt) },
    ];

    const wholesaleOrderColumns = [
        { header: 'رقم الطلب', accessor: (row: any) => row.orderNumber || row.id || '-' },
        { header: 'العميل', accessor: (row: any) => row.wholesaleCustomer?.name || '-' },
        { header: 'الحالة', accessor: (row: any) => row.status || '-' },
        { header: 'الإجمالي', accessor: (row: any) => Number(row.finalAmount || row.totalAmount || 0).toLocaleString('ar-EG') },
        { header: 'التاريخ', accessor: (row: any) => formatDate(row.manualCreatedAt || row.createdAt) },
    ];

    const movementColumns = [
        { header: 'المنتج', accessor: (row: any) => row.product?.name || '-' },
        { header: 'النوع', accessor: (row: any) => row.type || '-' },
        { header: 'الكمية', accessor: 'quantity' },
        { header: 'الموظف', accessor: (row: any) => row.user?.username || '-' },
        { header: 'السبب', accessor: (row: any) => row.reason || '-' },
        { header: 'التاريخ', accessor: (row: any) => formatDate(row.createdAt) },
    ];

    const warrantyColumns = [
        { header: 'المنتج', accessor: (row: any) => row.product?.name || '-' },
        { header: 'النوع', accessor: (row: any) => row.type || '-' },
        { header: 'العميل', accessor: (row: any) => row.customer?.name || '-' },
        { header: 'الكمية', accessor: 'quantity' },
        { header: 'التاريخ', accessor: (row: any) => formatDate(row.createdAt) },
    ];

    const renderTabContent = () => {
        if (detailsLoading) {
            return (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
            );
        }
        if (!details) return null;

        const tabData: Record<string, { data: any[]; columns: any[] }> = {
            products: { data: details.stocks || [], columns: productColumns },
            orders: { data: details.orders || [], columns: orderColumns },
            wholesaleOrders: { data: details.wholesaleOrders || [], columns: wholesaleOrderColumns },
            movements: { data: details.movements || [], columns: movementColumns },
            warranties: { data: details.warranties || [], columns: warrantyColumns },
        };

        const { data, columns } = tabData[activeTab] || { data: [], columns: [] };

        return (
            <DataTable
                data={data}
                columns={columns}
                totalCount={data.length}
                pageSize={PAGE_SIZE}
                currentPage={page}
                onPageChange={setPage}
                isLoading={detailsLoading}
            />
        );
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">إدارة المستودعات</div>
                {
                    user && hasPermission(user, "addCategories") && (
                        <Button
                            onClick={() => { setEditId(null); setFormData(null); setIsOpen(true); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                        >
                            إضافة مستودع جديدة
                        </Button>
                    )
                }
            </div>

            <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.map((cat: any) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500 transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                        {cat.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {(cat._count?.stocks || 0)} منتج مرتبط
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {cat.location || '-'}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleViewDetails(cat)}
                                        className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-green-600 hover:bg-green-600 hover:text-white transition-all"
                                        title="عرض التفاصيل"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    {user && hasPermission(user, "editCategories") && (
                                        <button
                                            onClick={() => handleEdit(cat)}
                                            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {user && hasPermission(user, "deleteCategories") && (
                                        <button
                                            onClick={() => handledelete(cat)}
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
                title={editId ? "تعديل بيانات المستودع" : "إضافة مستودع جديدة"}
                isOpen={isOpen}
                onClose={handleClose}
            >
                <div className="p-2 max-h-[80vh]">
                    <DynamicForm
                        schema={categorySchema}
                        onSubmit={onSubmit}
                        defaultValues={formData}
                        key={editId || 'create'}
                        submitLabel={editId ? 'تحديث البيانات' : 'إرسال البيانات'}
                    >
                        {({ register, formState: { errors } }) => (
                            <div className="grid gap-4">
                                <FormInput
                                    className='text-gray-800 dark:text-white'
                                    label="اسم المستودع"
                                    {...register("name")}
                                    error={errors.name?.message as string}
                                />
                                <FormSelect
                                    options={locationOptions}
                                    className='text-gray-800 dark:text-white'
                                    label="موقع المستودع"
                                    {...register("location")}
                                    error={errors.location?.message as string}
                                />
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>

            <AppModal
                title={`تفاصيل المستودع: ${selectedWarehouse?.name || ''}`}
                description={`الموقع: ${selectedWarehouse?.location || '-'} — المنتجات المرتبطة: ${selectedWarehouse?._count?.stocks || 0}`}
                isOpen={detailsOpen}
                onClose={handleDetailsClose}
                size="xl"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {tab.label}
                                {detailCounts[tab.id] !== undefined && (
                                    <span className={`mr-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white text-blue-600' : 'bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-200'}`}>
                                        {detailCounts[tab.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[200px]">
                        {renderTabContent()}
                    </div>
                </div>
            </AppModal>
        </div>
    );
};

export default CategoriesLayout;
