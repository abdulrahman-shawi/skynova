'use server';

import { prisma } from "@/lib/prisma";


export async function getallcategory() {
  const category = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include:{
        products:true
    }
  });
  return JSON.parse(JSON.stringify(category));
}
export async function createcategory(data: any) {
  try {
    // 2. إنشاء المستخدم في قاعدة البيانات
    const category = await prisma.category.create({
      data: {
        name: data.name,
      
      },
    });

    return { success: true, data: category };
  } catch (error: any) {
    console.error("Prisma Error:", error);
    
    // معالجة خطأ تكرار البريد الإلكتروني
    if (error.code === 'P2002') {
      return { success: false, error: "هذه الفئة موجودة بالفعل" };
    }
    
    return { success: false, error: "فشل في إنشاء الفئة، يرجى التحقق من المدخلات" };
  }
}

export async function updatecategory(id: string, data: any) {
  try {
    const category = await prisma.category.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
        },
    });
    return { success: true, data: category };
  } catch (error: any) {
    console.error("Prisma Error:", error);
    return { success: false, error: "فشل في تحديث بيانات الفئة" };
  } 
}

export async function deletecategory(id: string) {  
    try {
        await prisma.category.delete({ where: { id: Number(id) } });
        return { success: true };
    } catch (error) {
        return { success: false, error: "فشل الحذف" };
    }   
}