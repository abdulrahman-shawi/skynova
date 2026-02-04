"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { success } from "zod";

export async function getCustomer() {
  const res = await prisma.customer.findMany({
    orderBy:{
      id:"desc"
    },
    include:{
      users:true
    }
  })
revalidatePath("/customers");
  return {success:true , data:res }
  
}

export async function createCustomerAction(data: any, activeTabs: string[], id: any) {
  try {
    const newCustomer = await prisma.customer.create({
      data: {
        name: data.name,
        status:data.status,
        phonestatus:data.statusphone,
        phone: data.phone,
        countryCode: data.countryCode,
        country: data.country,
        city: data.city,
        source: data.source,
        ageGroup: data.ageGroup,
        socialStatus: data.socialStatus,   
        users: {
          connect: { id: id }
        },
      },
    });

    revalidatePath("/customers"); // تحديث الصفحة لظهور العميل الجديد
    return { success: true, data: newCustomer };
  } catch (error: any) {
    console.error("Prisma Error:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء حفظ البيانات" };
  }
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