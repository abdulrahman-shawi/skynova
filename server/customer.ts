"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { success } from "zod";

export async function getCustomer() {
  const res = await prisma.customer.findMany({
    orderBy:{
      name:"desc"
    },
    include:{
      users:true,
      orders:{
        include:{
          items:{
            include:{
              product:true
            }
          }
        }
      },
      message:{
        include:{
          user:true
        }
      }
    }
    
  })
revalidatePath("/customers");
  return {success:true , data:res }
  
}

export async function AssignUsers(customerId: string, userIds: string[]) {
  try {
    const assign = await prisma.customer.update({
      where: { 
        id: customerId 
      },
      data: {
        users: {
          // 'set' تقوم بإزالة الروابط القديمة ووضع القائمة الجديدة المرسلة
          // نمرر مصفوفة من الكائنات تحتوي على المعرفات [{id: '1'}, {id: '2'}]
          set: userIds.map((id) => ({ id })),
        },
      },
      include: {
        users: true, // لإرجاع البيانات الجديدة بعد التحديث
      },
    });
    
    return {success:true , data:assign};
  } catch (error) {
    console.error("Prisma Error:", error);
    throw new Error("فشل في ربط الموظفين بالعميل");
  }
}

export async function createmessage(msg:any , customer:any , user:any) {
  const res = await prisma.message.create({
    data:{
      message:msg,
      customerId:customer,
      userId:user
    }
  })
  return {success:true , data:res}
}

export async function createCustomerAction(data: any, id: string) {
  try {
    // 1. التحقق يدويًا إذا كان الرقم موجودًا مسبقًا في أي مصفوفة
    // نستخدم عامل البحث hasAny أو has لتفقد المصفوفات
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        phone: {
          hasSome: data.phone // يبحث إذا كان أي رقم في المصفوفة المرسلة موجود مسبقاً
        }
      }
    });

    if (existingCustomer) {
      return { success: false, error: "عذراً، رقم الهاتف هذا مسجل لعميل آخر بالفعل" };
    }

    // 2. إذا لم يكن موجوداً، نقوم بالإضافة
    const newCustomer = await prisma.customer.create({
      data: {
        name: data.name,
        status: "عميل محتمل",
        phonestatus: "معلق",
        phone: data.phone, // مصفوفة مثل ["05xxxx"]
        countryCode: data.countryCode,
        country: data.country,
        users: {
          connect: { id: id }
        },
      },
    });

    revalidatePath("/customers");
    return { success: true, data: newCustomer };

  } catch (error: any) {
    console.error("Prisma Error:", error);
    return { success: false, error: "حدث خطأ أثناء حفظ البيانات" };
  }
}

export async function updateCustomer(data:any , customer:any) {
  try {
    const res = await prisma.customer.update({
    where:{
      id:customer
    },
    data:{
      name: data.name,
        phone: data.phone, // مصفوفة مثل ["05xxxx"]
        countryCode: data.countryCode,
        country: data.country,
    }
  })

  return {success:true , data:res}
  } catch (error) {
    return {success:false , error:error}
  }

}

export async function UpdateStusa(customer:any , status:any) {
  const stusas = await prisma.customer.update({
    where:{
      id:customer
    },
    data:{
      status:status
    }
  })

  return {success:true , data:stusas}
}

export async function deleteCustomer(data: any) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. حذف الرسائل المرتبطة بالعميل أولاً
      await tx.message.deleteMany({
        where: { customerId: data.id }
      });

      // 2. حذف الطلبات المرتبطة بالعميل
      await tx.order.deleteMany({
        where: { customerId: data.id }
      });

      // 3. حذف العميل (سيقوم Prisma تلقائياً بفك الارتباط مع الـ Users في علاقة Many-to-Many)
      const deletedCustomer = await tx.customer.delete({
        where: { id: data.id }
      });

      return deletedCustomer;
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("خطأ أثناء الحذف:", error);
    return { success: false, error: "فشل حذف العميل بسبب وجود بيانات مرتبطة به" };
  }
}