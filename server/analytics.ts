// src/actions/analytics.ts
"use server"
import { prisma } from "@/lib/prisma";

// src/actions/analytics.ts
export async function GetSalesByStatusAction(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { permission: true }
    });

    if (!user) return { success: false, error: "User not found" };

    // المنطق: إذا كان ADMIN أو لديه صلاحية viewOrders، لا نضع قيود (يرى الكل)
    // غير ذلك، نجببره على رؤية طلباته فقط عبر مساواة الـ userId
    const canViewAll = user.accountType === "ADMIN" || user.permission?.viewOrders === true;
    
    const whereClause = canViewAll ? {} : { userId: userId };

    const salesByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: whereClause, 
      _count: { id: true },
      _sum: { finalAmount: true },
    });

    return { success: true, data: salesByStatus };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Internal Server Error" };
  }
}

// server/analytics.ts
export async function GetCustomerAcquisition() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newCustomers = await prisma.customer.groupBy({
    by: ['createdAt'],
    _count: { id: true },
    where: {
      createdAt: { gte: thirtyDaysAgo }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  return { success: true, data: newCustomers };
}

export async function GetTopCustomers() {
  const topCustomers = await prisma.customer.findMany({
    take: 5, // أعلى 5 عملاء
    include: {
      _count: { select: { orders: true } }, // عدد الطلبات
    },
    orderBy: {
      orders: { _count: 'desc' }
    }
  });
  return { success: true, data: topCustomers };
}

export async function GetSalesByCity(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { permission: true }
    });
    
    const canViewAll = user?.accountType === "ADMIN" || user?.permission?.viewOrders === true;
    const whereClause = canViewAll ? {} : { userId: userId };

    const citySales = await prisma.order.groupBy({
      by: ['country'],
      where: whereClause,
      _count: { id: true },
      _sum: { finalAmount: true },
      orderBy: {
        _sum: { finalAmount: 'desc' }
      }
    });
    return { success: true, data: citySales };
  } catch (error) {
    return { success: false, data: [] };
  }
}

// src/actions/analytics.ts

export async function GetCustomerInteractions(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { permission: true }
    });

    if (!user) return { success: false, error: "User not found" };

    const canViewAll = user.accountType === "ADMIN" || user.permission?.viewAnalytics === true;

    // 1. فلترة العملاء
    const whereClause = canViewAll 
      ? {} 
      : { users: { some: { id: userId } } };

    // 2. فلترة الرسائل داخل العد (للإحصاء الدقيق)
    // إذا كان الموظف عادياً، نعد رسائله فقط مع هذا العميل
    const messageFilter = canViewAll ? {} : { userId: userId };

    const interactions = await prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        _count: {
          select: { 
            message: { where: messageFilter } // الفلترة هنا مهمة جداً
          }
        }
      },
      orderBy: {
        message: { _count: 'desc' }
      },
      take: 10
    });

    return { success: true, data: interactions };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}