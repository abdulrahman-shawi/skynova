// إرسال إشعارات Web Push لمستخدمي النظام (خارج الصفحة / التطبيق مغلق)
// يتطلب متغيرات البيئة: VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY و (اختياري) VAPID_SUBJECT
import webPush from "web-push";
import { prisma } from "@/lib/prisma";

let vapidConfigured = false;

function ensureVapidConfigured() {
    if (vapidConfigured) return true;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return false;
    webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:admin@skynova.local",
        publicKey,
        privateKey
    );
    vapidConfigured = true;
    return true;
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
}

// إرسال إشعار لكل أجهزة المستخدمين المحددين، مع تنظيف الاشتراكات المنتهية
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
    if (!ensureVapidConfigured()) return;
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } },
        take: 200,
    });

    if (subscriptions.length === 0) return;

    const body = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/skynova-dark.png",
        tag: payload.tag || "skynova-chat",
        url: payload.url || "/dashboard/communication",
    });

    const expiredEndpoints: string[] = [];

    await Promise.all(
        subscriptions.map(async (subscription) => {
            try {
                await webPush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
                    },
                    body,
                    { TTL: 60 * 60 * 24 }
                );
            } catch (error: any) {
                const statusCode = Number(error?.statusCode || 0);
                if (statusCode === 404 || statusCode === 410) {
                    expiredEndpoints.push(subscription.endpoint);
                }
            }
        })
    );

    if (expiredEndpoints.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { endpoint: { in: expiredEndpoints } },
        });
    }
}
