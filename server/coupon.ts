'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCoupons() {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: JSON.parse(JSON.stringify(coupons)) };
  } catch (error) {
    console.error("Prisma Error:", error);
    return { success: false, error: "فشل في جلب الكوبونات" };
  }
}

function parseCouponForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const code = String(formData.get('code') || '').trim().toUpperCase();
  const discountType = String(formData.get('discountType') || 'PERCENTAGE') === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
  const discountValue = Number(formData.get('discountValue'));
  const usageLimit = Number(formData.get('usageLimit'));
  const isActive = String(formData.get('isActive') || '').toLowerCase() === 'true';

  if (!name) {
    return { error: "اسم الكوبون مطلوب" };
  }
  if (!code) {
    return { error: "كود الكوبون مطلوب" };
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "قيمة الخصم يجب أن تكون أكبر من صفر" };
  }
  if (discountType === 'PERCENTAGE' && discountValue > 100) {
    return { error: "نسبة الخصم لا يمكن أن تتجاوز 100%" };
  }
  if (!Number.isInteger(usageLimit) || usageLimit < 1) {
    return { error: "عدد مرات الاستخدام يجب أن يكون رقماً صحيحاً أكبر من صفر" };
  }

  return {
    data: { name, code, discountType, discountValue, usageLimit, isActive } as const,
  };
}

export async function createCoupon(formData: FormData) {
  try {
    const parsed = parseCouponForm(formData);
    if ('error' in parsed) {
      return { success: false, error: parsed.error };
    }

    const coupon = await prisma.coupon.create({ data: parsed.data });

    revalidatePath('/dashboard/coupons');
    return { success: true, data: JSON.parse(JSON.stringify(coupon)) };
  } catch (error: any) {
    console.error("Prisma Error:", error);

    if (error.code === 'P2002') {
      return { success: false, error: "كود الكوبون موجود بالفعل" };
    }

    return { success: false, error: "فشل في إنشاء الكوبون، يرجى التحقق من المدخلات" };
  }
}

export async function updateCoupon(id: string, formData: FormData) {
  try {
    const parsed = parseCouponForm(formData);
    if ('error' in parsed) {
      return { success: false, error: parsed.error };
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath('/dashboard/coupons');
    return { success: true, data: JSON.parse(JSON.stringify(coupon)) };
  } catch (error: any) {
    console.error("Prisma Error:", error);

    if (error.code === 'P2002') {
      return { success: false, error: "كود الكوبون موجود بالفعل" };
    }

    return { success: false, error: "فشل في تحديث بيانات الكوبون" };
  }
}

export async function deleteCoupon(id: string) {
  try {
    await prisma.coupon.delete({ where: { id } });
    revalidatePath('/dashboard/coupons');
    return { success: true };
  } catch (error) {
    console.error("Prisma Error:", error);
    return { success: false, error: "فشل في حذف الكوبون" };
  }
}
