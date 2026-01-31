'use client';

import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { MultiFileUpload, FileItem } from '@/components/ui/ImageUpload';
import { getallcategory } from '@/server/category';
import { saveProductWithFiles } from '@/server/image';
import { getProduct } from '@/server/product';
import { image } from 'framer-motion/client';
import * as React from 'react';
import { Controller } from 'react-hook-form';
import z from 'zod';
import { ta } from 'zod/v4/locales';

const productschama = z.object({
    name: z.string().min(3, "اسم المنتج مطلوب"),
    description: z.string().optional().nullable(),
    price: z.coerce.number().min(0, "السعر يجب أن يكون رقم موجب"),
    categoryId: z.coerce.number().min(1, "يرجى اختيار فئة"),
    discount: z.coerce.number().min(0, "الخصم يجب أن يكون رقم موجب").optional().default(0),
    files: z.array(z.any()).optional().default([]), // استخدام any هنا لتسهيل التعامل مع File objects
});

const ProductLayout = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | number | null>(null);
    const [categories, setCategories] = React.useState<any[]>([]);
    const [products, setProducts] = React.useState<any[]>([]);
    const [tab, setTab] = React.useState<'table' | "grid">('grid');

    React.useEffect(() => {
        getallcategory().then(setCategories).catch(console.error);
        getProduct().then((products) => {
            setProducts(products);
            console.log("Products loaded:", products);
        }).catch(console.error);

    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setEditId(null);
    };

    const onSubmit = async (data: z.infer<typeof productschama>) => {
        try {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('price', data.price.toString());
            formData.append('categoryId', data.categoryId.toString());
            formData.append('description', data.description || '');
            formData.append('discount', (data.discount || 0).toString());

            // معالجة الملفات - استخراج الملف الحقيقي rawFile
            if (data.files && data.files.length > 0) {
                data.files.forEach((fileItem: any) => {
                    if (fileItem.rawFile instanceof File) {
                        formData.append('files', fileItem.rawFile);
                    }
                });
            }

            // طباعة للتأكد من المحتوى قبل الإرسال
            console.log("Files to upload:", formData.getAll('files'));

            const result = await saveProductWithFiles(formData);

            if (result.success) {
                alert("تم الحفظ بنجاح!");
                handleClose();
            } else {
                alert("خطأ: " + result.error);
            }
        } catch (error) {
            console.error("Submission Error:", error);
        }
    };

    return (
        <div className="p-4" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">إدارة المنتجات</h1>
                <Button onClick={() => setIsOpen(true)}>إضافة منتج جديد</Button>
            </div>
            <div className="flex gap-4 mb-4">
                <div onClick={() => setTab("grid")} className="flex justify-center items-center w-[150px] h-16 bg-slate-200 dark:bg-slate-800 rounded-md cursor-pointer">grid</div>
                <div onClick={() => setTab("table")} className="flex justify-center items-center w-[150px] h-16 bg-slate-200 dark:bg-slate-800 rounded-md cursor-pointer">table</div>
            </div>
            {tab === 'grid' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                        <div key={product.id} className="rounded-sm shadow-md border border-slate-900/20 flex flex-col gap-3 rounded-tl-xl rounded-tr-xl">
                            {product.images.length !== 0 ? (
                                <div className="h-64">
                                    {product.images.filter((e: any) => e.type === "image/jpeg").map((e: any) => (
                                        <div className="w-full h-full">
                                            <img src={`${e.url}`} alt="" className='w-full h-full rounded-tl-xl rounded-tr-xl' />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-64">
                                    <div className="w-full h-full">
                                            <img src="/uploads/icon.png" alt="" className='w-full h-full rounded-tl-xl rounded-tr-xl' />
                                        </div>
                                </div>
                            )}
                            <h2 className="font-bold mb-2">{product.name}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">السعر: {product.price} ريال</p>
                        </div>
                    ))}
                </div>
            )}
            {tab === 'table' && (
                <div>عرض المنتجات على شكل جدول</div>
            )}

            <AppModal title={editId ? "تعديل منتج" : "منتج جديد"} isOpen={isOpen} onClose={handleClose}>
                <div className="p-4">
                    <DynamicForm
                        schema={productschama}
                        onSubmit={onSubmit}
                        defaultValues={{ files: [], name: '', price: 0, discount: 0 }}
                        submitLabel="حفظ المنتج"
                    >
                        {({ register, control, formState: { errors } }) => (
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormInput className='text-slate-900 dark:text-slate-100' label="اسم المنتج" {...register("name")} error={errors.name?.message as string} />

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm text-right font-medium text-slate-800 dark:text-slate-200">التصنيف</label>
                                    <select
                                        {...register("categoryId")}
                                        className="h-10 border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    >
                                        <option value="">اختر التصنيف</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                    {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message as string}</p>}
                                </div>

                                <FormInput type="number" label="السعر" {...register("price")} error={errors.price?.message as string} />
                                <FormInput type="number" label="الخصم" {...register("discount")} error={errors.discount?.message as string} />
                                <textarea {...register("description")} placeholder='h' className='col-span-2 border border-slate-400/30 ' rows={5}></textarea>
                                <div className="md:col-span-2 border-t pt-4">
                                    <Controller
                                        name="files"
                                        control={control}
                                        render={({ field }) => (
                                            <MultiFileUpload
                                                label="صور وملفات المنتج"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
        </div>
    );
};

export default ProductLayout;