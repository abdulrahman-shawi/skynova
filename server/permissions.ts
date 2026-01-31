// @/server/permissions.ts
'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { u } from 'framer-motion/client';

export async function GetRoles() {
    const roles = await prisma.permission.findMany({
        orderBy: { roleName: 'asc' },
        include:{
            users:true
        }
    });
    return JSON.parse(JSON.stringify(roles));
}

export async function createRole(formData: FormData) {
    try {
        const roleName = formData.get("roleName") as string;
        const newPermission = await prisma.permission.create({
            data: { roleName: roleName }
        });
        revalidatePath("/dashboard/permissions");
        return { success: true, data: newPermission };
    } catch (error) {
        return { success: false, error: "فشل في إنشاء الدور" };
    }
}

export async function updateRolePermissions(formData: FormData) {
    try {
        const id = formData.get("id") as string;
        const toBool = (key: string) => formData.get(key) === "true";

        const updated = await prisma.permission.update({
            where: { id: id },
            data: {
                roleName: formData.get("roleName") as string,
                viewProducts: toBool("viewProducts"),
                addProducts: toBool("addProducts"),
                editProducts: toBool("editProducts"),
                deleteProducts: toBool("deleteProducts"),
                viewReports: toBool("viewReports"),
                addReports: toBool("addReports"),
                editReports: toBool("editReports"),
                deleteReports: toBool("deleteReports"),
                viewOrders: toBool("viewOrders"),
                addOrders: toBool("addOrders"),
                editOrders: toBool("editOrders"),
                deleteOrders: toBool("deleteOrders"),
            }
        });
        revalidatePath("/dashboard/permissions");
        return { success: true, data: updated };
    } catch (error) {
        return { success: false, error: "حدث خطأ أثناء التحديث" };
    }
}

export async function deleteRole(id: string) {
    try {
        await prisma.permission.delete({ where: { id: id } });
        revalidatePath("/dashboard/permissions");
        return { success: true };
    } catch (error) {
        return { success: false, error: "فشل الحذف" };
    }
}