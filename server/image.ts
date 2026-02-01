'use server';

import fs from 'fs/promises';
import path from 'path';
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * دالة مساعدة لتنظيف اسم الملف من الحروف الخاصة والعربية لضمان عدم حدوث خطأ في المسار
 */
function sanitizeFileName(fileName: string) {
    return fileName
        .replace(/[^a-z0-9.]/gi, '_') // استبدال أي حرف غير إنجليزي أو رقم بـ "_"
        .toLowerCase();
}

async function uploadSingleFile(file: File) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // استخدام المسار المطلق لضمان الوصول للمجلد في بيئات التشغيل المختلفة
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    try { 
        await fs.access(uploadDir); 
    } catch { 
        await fs.mkdir(uploadDir, { recursive: true }); 
    }

    // إضافة طابع زمني + اسم منظف لتجنب تكرار الأسماء أو أخطاء الحروف العربية
    const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const uploadPath = path.join(uploadDir, fileName);
    
    await fs.writeFile(uploadPath, buffer);
    
    return {
        url: `/uploads/${fileName}`,
        type: file.type
    };
}

export async function saveProductWithFiles(formData: FormData) {
    try {
        // تحويل البيانات مع إضافة قيم افتراضية للحماية من null
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const discount = parseFloat(formData.get('discount') as string) || 0;
        const categoryId = parseInt(formData.get('categoryId') as string);
        const description = (formData.get('description') as string) || null;
        
        // جلب الملفات والتأكد أنها من نوع File فعلاً
        const allEntries = formData.getAll('files');
        const files = allEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

        // 1. رفع الملفات بالتوازي
        const fileDataArray = await Promise.all(files.map(uploadSingleFile));

        // 2. حفظ البيانات في Prisma
        // تم استخدام transaction لضمان عدم إنشاء منتج إذا فشلت عملية ربط الصور (اختياري ولكن أفضل)
        const product = await prisma.product.create({
            data: {
                name,
                price,
                discount,
                description,
                // التأكد من إرسالcategoryId فقط إذا كان رقماً صحيحاً
                ...(categoryId ? { categoryId } : {}),
                images: {
                    create: fileDataArray.map(file => ({
                        url: file.url,
                        type: file.type,
                    }))
                }
            },
            include: { images: true }
        });

        revalidatePath('/dashboard/products');

        return { success: true, product };
    } catch (error: any) {
        console.error("Critical Error during product save:", error);
        // إرجاع رسالة خطأ أكثر تفصيلاً للمطور
        return { 
            success: false, 
            error: error.message || "حدث خطأ أثناء حفظ المنتج" 
        };
    }
}

export async function updateProductWithFiles(productId: number, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const discount = parseFloat(formData.get('discount') as string) || 0;
        const categoryId = parseInt(formData.get('categoryId') as string);
        const description = (formData.get('description') as string) || null;

        // 1. جلب الملفات الجديدة من الـ FormData
        const allEntries = formData.getAll('files');
        const files = allEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);

        let fileDataArray: any[] = [];

        // 2. إذا وجد ملفات جديدة، نقوم بعملية التنظيف والإضافة
        if (files.length > 0) {
            // أ. رفع الملفات الجديدة أولاً
            fileDataArray = await Promise.all(files.map(uploadSingleFile));

            // ب. جلب بيانات الصور القديمة لحذف الملفات الفيزيائية
            const currentProduct = await prisma.product.findUnique({
                where: { id: productId },
                include: { images: true }
            });

            if (currentProduct?.images) {
                for (const img of currentProduct.images) {
                    try {
                        // بناء المسار المطلق للملف في مجلد public
                        const filePath = path.join(process.cwd(), 'public', img.url);
                        // حذف الملف من الهارد ديسك
                        await fs.unlink(filePath);
                    } catch (err) {
                        console.error(`Could not delete file: ${img.url}`, err);
                        // نكمل العملية حتى لو فشل حذف ملف واحد (ربما الملف غير موجود أصلاً)
                    }
                }
            }
        }

        // 3. تحديث البيانات في Prisma
        const product = await prisma.product.update({
            where: { id: productId },
            data: {
                name,
                price,
                discount,
                description,
                ...(categoryId ? { categoryId } : {}),
                // تحديث الصور فقط إذا تم رفع صور جديدة
                ...(files.length > 0 ? {
                    images: {
                        deleteMany: {}, // حذف السجلات القديمة من قاعدة البيانات
                        create: fileDataArray.map(file => ({
                            url: file.url,
                            type: file.type,
                        }))
                    }
                } : {})
            },
            include: { images: true }
        });

        revalidatePath('/dashboard/products');
        return { success: true, product };

    } catch (error: any) {
        console.error("Critical Error during product update:", error);
        return { 
            success: false, 
            error: error.message || "حدث خطأ أثناء تحديث المنتج" 
        };
    }
}