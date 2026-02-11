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
    take: 10, // أعلى 5 عملاء
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

export async function GetBestSellingProducts() {
  const bestSellers = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 5, // جلب أفضل 5 منتجات فقط
  });

  // جلب تفاصيل أسماء المنتجات بعد الحصول على الـ IDs
  const productsWithDetails = await Promise.all(
    bestSellers.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, price: true }
      });
      return {
        ...product,
        totalSold: item._sum.quantity,
      };
    })
  );

  return { success: true, data: productsWithDetails };
}

export async function GetLowStockProducts() {
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      quantity: true,
    }
  });

  // تصفية المنتجات التي كميتها أقل من 5
  // نقوم بتحويل النص إلى رقم للمقارنة
  const lowStock = allProducts
    .filter(p => p.quantity !== null && parseInt(p.quantity) <= 5)
    .map(p => ({
      name: p.name,
      stock: parseInt(p.quantity || "0"),
    }));

  return { success: true, data: lowStock };
}

// المستخدمين الأكثر مبيعا

export async function GetTopSellingUsers() {
  // 1. جلب أعلى المستخدمين مبيعاً (كأرقام معرفات فقط)
  const topUsersGrouped = await prisma.order.groupBy({
    by: ['userId'],
    _count: { id: true },
    orderBy: {
      _count: { id: 'desc' }
    },
    take: 5
  });

  // 2. جلب تفاصيل المستخدمين (الأسماء) بناءً على المعرفات
  const userDetails = await prisma.user.findMany({
    where: {
      id: { in: topUsersGrouped.map(u => u.userId).filter(Boolean) as string[] }
    },
    select: {
      id: true,
      username: true
    }
  });

  // 3. دمج البيانات (الاسم مع عدد المبيعات)
  const finalData = topUsersGrouped.map(group => {
    const user = userDetails.find(u => u.id === group.userId);
    return {
      name: user?.username || "مستخدم غير معروف",
      totalSold: group._count.id
    };
  });

  return { success: true, data: finalData };
}