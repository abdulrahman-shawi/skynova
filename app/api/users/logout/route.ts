import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        // حذف الكوكيز الخاصة بالجلسة
        // ملاحظة: في Next.js 15+ يفضل استخدام await cookies()
        const cookieStore = cookies();
        cookieStore.delete("skynova");

        return NextResponse.json({ 
            success: true, 
            message: "تم تسجيل الخروج بنجاح" 
        }, { status: 200 });
        
    } catch (error) {
        console.error("Logout Error:", error);
        return NextResponse.json({ 
            success: false, 
            error: "فشل في تسجيل الخروج" 
        }, { status: 500 });
    }
}