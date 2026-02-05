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
      orders:true,
      message:true
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

export async function createCustomerAction(data: any, activeTabs: string[], id: any) {
  try {
    const newCustomer = await prisma.customer.create({
      data: {
        name: data.name,
        status:"عميل محتمل",
        phonestatus:"معلق",
        phone: data.phone,
        countryCode: data.countryCode,
        country: data.country,  
        users: {
          connect: { id: id }
        },
      },
    });

    revalidatePath("/customers"); // تحديث الصفحة لظهور العميل الجديد
    return { success: true, data: newCustomer };
    
  } catch (error: any) {
    console.error("Prisma Error:", error);
    if (error.code === 'P2002') {
      return { success: false, error: " الاسم أو رقم الهاتف موجودين بالفعل" };
    }
    return { success: false, error: error.message || "حدث خطأ أثناء حفظ البيانات" };
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

export async function deleteCustomer(data:any) {
  await prisma.customer.update({
  where:{id:data.id},
  data:{
    users:{
      set:[]
    }
  }
})

const res = await prisma.customer.delete({
  where:{id:data.id}
})

return {success:true , data:res}
}