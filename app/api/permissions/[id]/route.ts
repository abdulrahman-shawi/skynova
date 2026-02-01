import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// تعريف الواجهة لبيانات الـ Params
interface RouteParams {
  params: { id: string };
}

// دالة التحديث PUT
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const data = await req.json();
        // في الإصدارات الحديثة من Next.js، يفضل انتظار params إذا كنت تستخدم Next.js 15
        const { id } = params; 

        const updatedPermission = await prisma.permission.update({
            where: { id: id },
            data: {
                roleName: data.roleName,
                viewProducts: Boolean(data.viewProducts),
                addProducts: Boolean(data.addProducts),
                editProducts: Boolean(data.editProducts),
                deleteProducts: Boolean(data.deleteProducts),
                viewReports: Boolean(data.viewReports),
                addReports: Boolean(data.addReports),
                editReports: Boolean(data.editReports),
                deleteReports: Boolean(data.deleteReports),
                viewOrders: Boolean(data.viewOrders),
                addOrders: Boolean(data.addOrders),
                editOrders: Boolean(data.editOrders),
                deleteOrders: Boolean(data.deleteOrders),
            }
        });

        return NextResponse.json({ success: true, data: updatedPermission });
    } catch (error) {
        console.error("Update Error:", error);
        return NextResponse.json({ success: false, error: "فشل تحديث البيانات" }, { status: 500 });
    }
}

// دالة الحذف DELETE (تم إصلاحها هنا)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = params; // الوصول المباشر للمععرف id

        const deletedPermission = await prisma.permission.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true, data: deletedPermission });
    } catch (error) {
        console.error("Delete Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: "فشل الحذف، قد يكون الدور مرتبطاً بمستخدمين حاليين" 
        }, { status: 500 });
    }
}