// نقطة استطلاع خفيفة للإشعارات الفورية: عدد الرسائل غير المقروءة + آخر رسالة لكل محادثة
import { NextRequest, NextResponse } from "next/server";
import { getChatUnreadSnapshot } from "@/server/chat";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
    try {
        const snapshot = await getChatUnreadSnapshot();

        if (!snapshot) {
            return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
        }

        return NextResponse.json({ success: true, data: snapshot });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "تعذر جلب الحالة" },
            { status: 500 }
        );
    }
}
