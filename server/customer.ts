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
        phone: data.phone,
        countryCode: data.countryCode,
        country: data.country,
        city: data.city,
        source: data.source,
        ageGroup: data.ageGroup,
        socialStatus: data.socialStatus,

        // حقول البشرة
        skinType: data.skinType,
        gender: data.gender,
        // تأكد أن skinProblems دائماً مصفوفة حتى لو لم يتم اختيار شيء
        skinProblems: Array.isArray(data.skinProblems) ? data.skinProblems : [],

        // حقول الليزر
        skinColor: data.skinColor,
        hairColor: data.hairColor,
        genderlaser: data.genderlaser,
        laserPurpose: data.laserPurpose,

        // حقول التنحيف - تحويل آمن للأرقام
        bodyType: data.bodyType,
        weight: data.weight ? parseFloat(String(data.weight)) : null,
        height: data.height ? parseFloat(String(data.height)) : null,
        mainProblem: data.mainProblem,
        genderfit: data.genderfit,
        users: {
          connect: { id: id }
        },

        // الحالات الصحية
        isDiabetic: Boolean(data.isDiabetic),
        hasHypertension: Boolean(data.hasHypertension),
        isPregnant: Boolean(data.isPregnant),
        isBreastfeeding: Boolean(data.isBreastfeeding),
        hormonalTherapy: Boolean(data.hormonalTherapy),
        followsDiet: Boolean(data.followsDiet),
        regularExercise: Boolean(data.regularExercise),
        interestedInAds: Boolean(data.interestedInAds),
        isTargetClient: Boolean(data.isTargetClient),
        inquiresForElse: Boolean(data.inquiresForElse),

        // التعامل مع Enum الاهتمامات
        // ملاحظة: إذا كان الحقل في البريزما enum[] استخدم set مباشرة
        // أما إذا كانت علاقة Many-to-Many فالتنسيق يختلف قليلاً
        interests: activeTabs.map(tab => {
          if (tab === 'skin') return 'SKIN_PRODUCTS';
          if (tab === 'laser') return 'LASER_DEVICES';
          return 'SLIMMING_PROG';
        }) as any, // 'as any' لتخطي تعارض الأنواع مؤقتاً إذا لزم الأمر
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