"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

export const getWarehouse  = async () => {
    // من هنا يمكنك إضافة منطق الحصول على بيانات المستودع
    const warehouses = await prisma.warehouse.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: {
                    stocks: true,
                },
            },
        },
    });
    return JSON.parse(JSON.stringify(warehouses));
}

// المستودعات المسموح بها للمستخدم الحالي فقط
// (المدير أو دور بدون تحديد مستودعات = كل المستودعات)
export const getAllowedWarehouses = async () => {
    try {
        const session = cookies().get("skynova")?.value;
        if (!session) return [];

        const decoded = await decrypt(session);
        if (!decoded?.userId) return [];

        const user = await prisma.user.findUnique({
            where: { id: String(decoded.userId) },
            include: { permission: { include: { allowedWarehouses: true } } },
        });

        const allowedIds = Array.isArray(user?.permission?.allowedWarehouses)
            ? user.permission.allowedWarehouses
                .map((warehouse: any) => Number(warehouse?.id))
                .filter((id: number) => !Number.isNaN(id))
            : [];

        const restrictToAllowed = user?.accountType !== "ADMIN" && allowedIds.length > 0;

        const warehouses = await prisma.warehouse.findMany({
            where: restrictToAllowed ? { id: { in: allowedIds } } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        stocks: true,
                    },
                },
            },
        });
        return JSON.parse(JSON.stringify(warehouses));
    } catch (error) {
        console.error("getAllowedWarehouses Error:", error);
        return [];
    }
}

export const createWarehouse = async (data: any) => {
    try {
        const warehouse = await prisma.warehouse.create({
            data: {
                name: data.name,
                location: data.location,
            },
        });
        return { success: true, data: warehouse };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في إنشاء المستودع، يرجى التحقق من المدخلات" };
    }
}

export const updateWarehouse = async (id: string, data: any) => {
    try {
        const warehouse = await prisma.warehouse.update({
            where: { id: Number(id) },
            data: {
                name: data.name,
                location: data.location,
            },
        });
        return { success: true, data: warehouse };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في تحديث بيانات المستودع" };
    }   
}

export const deleteWarehouse = async (id: string) => {
    try {
        await prisma.warehouse.delete({
            where: { id: Number(id) },
        });
        return { success: true };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في حذف المستودع، قد يكون مرتبطًا بسجلات أخرى" };
    }   
}

export const getWarehouseDetails = async (id: number) => {
    try {
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: Number(id) },
            include: {
                stocks: {
                    orderBy: { id: 'desc' },
                    include: {
                        product: {
                            select: { id: true, name: true, description: true }
                        },
                    },
                },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        customer: { select: { id: true, name: true } },
                        items: {
                            include: {
                                product: { select: { id: true, name: true } }
                            }
                        },
                    },
                },
                wholesaleOrders: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        wholesaleCustomer: { select: { id: true, name: true } },
                        items: {
                            include: {
                                product: { select: { id: true, name: true } }
                            }
                        },
                    },
                },
                movements: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        product: { select: { id: true, name: true } },
                        user: { select: { id: true, username: true } },
                    },
                },
                warranties: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        product: { select: { id: true, name: true } },
                        customer: { select: { id: true, name: true } },
                        order: { select: { id: true, orderNumber: true } },
                    },
                },
            },
        });

        if (!warehouse) {
            return { success: false, error: "المستودع غير موجود" };
        }

        return { success: true, data: JSON.parse(JSON.stringify(warehouse)) };
    } catch (error: any) {
        console.error("Prisma Error:", error);
        return { success: false, error: "فشل في جلب تفاصيل المستودع" };
    }
}