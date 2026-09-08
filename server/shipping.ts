"use server";

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/auth";
import { BABEL_EXPRESS_API_BASE } from "@/lib/babel-express";
import { cookies } from "next/headers";

const SHIPPING_SESSION_COOKIE = "skynova_shipping";

export async function getshipping() {
    try {
        const res = await prisma.shipping.findMany({
            orderBy: {
                name: "asc",
            },
            select: {
                id: true,
                name: true,
                price: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {    success: true, data: res };
    } catch (error) {
        console.error("Error fetching shipping data:", error);
        return { success: false, data: [] };
    }   
}

export async function getshippingWithOrders() {
    try {
        const res = await prisma.shipping.findMany({
            orderBy: {
                name: "asc",
            },
            select: {
                id: true,
                name: true,
                price: true,
                createdAt: true,
                updatedAt: true,
                orders: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        id: true,
                        orderNumber: true,
                        finalAmount: true,
                        status: true,
                        city: true,
                        createdAt: true,
                        manualCreatedAt: true,
                        shippingPrice: true,
                        moneyTransferCommission: true,
                        otherCommissions: true,
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                countryCode: true,
                            },
                        },
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                        warehouse: {
                            select: {
                                id: true,
                                location: true,
                            },
                        },
                    },
                },
            },
        });
        return { success: true, data: res };
    } catch (error) {
        console.error("Error fetching shipping details:", error);
        return { success: false, data: [] };
    }
}

export async function createshipping(data: any) {
    try {
        const res = await prisma.shipping.create({
            data: {
                name: data.name,
                price: data.price,
                ...(data.password ? { password: data.password } : {}),
            }
        });
        return { success: true, data: res };
    } catch (error) {
        console.error("Error creating shipping:", error);
        return { success: false, error: "Failed to create shipping" };
    }
}

export async function updateshipping(id: string, data: any) {   
    try {
        const res = await prisma.shipping.update({
            where: { id: Number(id) },
            data: {
                name: data.name,
                price: data.price,
                // إذا تُركت كلمة السر فارغة تبقى القديمة كما هي
                ...(data.password ? { password: data.password } : {}),
            }
        });
        return { success: true, data: res };
    } catch (error) {
        console.error("Error updating shipping:", error);
        return { success: false, error: "Failed to update shipping" };
    }
}

export async function deletshipping(id: string) {
    try {
        await prisma.shipping.delete({
            where: { id: Number(id) }
        });
        return { success: true };
    } catch (error) {
        console.error("Error deleting shipping:", error);
        return { success: false, error: "Failed to delete shipping" };
    }
}

// ============================================
// بوابة شركات الشحن (تسجيل دخول + طلبات الشركة)
// ============================================

async function getShippingSession(): Promise<{ shippingId: number; name: string } | null> {
    try {
        const token = cookies().get(SHIPPING_SESSION_COOKIE)?.value;
        if (!token) return null;
        const payload = await decrypt(token);
        if (!payload?.shippingId) return null;
        return { shippingId: Number(payload.shippingId), name: String(payload.name || "") };
    } catch {
        return null;
    }
}

export async function shippingLogin(name: string, password: string) {
    try {
        const company = await prisma.shipping.findUnique({
            where: { name: name.trim() },
            select: { id: true, name: true, password: true },
        });
        if (!company || company.password !== password) {
            return { success: false, error: "خطأ في اسم الشركة أو كلمة السر" };
        }
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const session = await encrypt({ shippingId: company.id, name: company.name });
        cookies().set(SHIPPING_SESSION_COOKIE, session, { expires, httpOnly: true });
        return { success: true };
    } catch (error) {
        console.error("Error shipping login:", error);
        return { success: false, error: "فشل في تسجيل الدخول" };
    }
}

export async function shippingLogout() {
    try {
        cookies().delete(SHIPPING_SESSION_COOKIE);
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

// تجلب طلبات شركة الشحن صاحبة الجلسة الحالية فقط
export async function getMyShippingOrders() {
    try {
        const session = await getShippingSession();
        if (!session) {
            return { success: false, unauthorized: true, data: null };
        }
        const company = await prisma.shipping.findUnique({
            where: { id: session.shippingId },
            select: {
                id: true,
                name: true,
                orders: {
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        orderNumber: true,
                        finalAmount: true,
                        status: true,
                        city: true,
                        createdAt: true,
                        manualCreatedAt: true,
                        shippingPrice: true,
                        moneyTransferCommission: true,
                        otherCommissions: true,
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                countryCode: true,
                            },
                        },
                        warehouse: {
                            select: {
                                id: true,
                                location: true,
                            },
                        },
                    },
                },
            },
        });
        if (!company) {
            return { success: false, unauthorized: true, data: null };
        }
        return { success: true, data: company };
    } catch (error) {
        console.error("Error fetching shipping company orders:", error);
        return { success: false, data: null };
    }
}

// ============================================
// تكامل شركة الفاتح (API خارجي)
// ============================================

const FATIH_API_BASE = "https://fatihcargo.com/api/v1";

async function fatihFetch(path: string, init?: RequestInit) {
    const token = process.env.FATIH_API_TOKEN;
    if (!token) {
        return { success: false as const, error: "لم يتم ضبط توكن الفاتح (FATIH_API_TOKEN) في ملف .env" };
    }
    try {
        const res = await fetch(`${FATIH_API_BASE}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(init?.headers || {}),
            },
            cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
            const msg = json?.message || `فشل الاتصال بخدمة الفاتح (كود ${res.status})`;
            return { success: false as const, error: msg };
        }
        return { success: true as const, data: json };
    } catch (error) {
        console.error("Fatih API error:", error);
        return { success: false as const, error: "حدث خطأ أثناء الاتصال بخدمة الفاتح" };
    }
}

// تجلب الطلبات المرتبطة بشركة الفاتح من نظامهم الخارجي
export async function getFatihOrders(params?: { page?: number; status?: string; search?: string }) {
    const query = new URLSearchParams();
    query.set("per_page", "50");
    if (params?.page) query.set("page", String(params.page));
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    return fatihFetch(`/shipping/orders?${query.toString()}`);
}

// تجلب قوائم الإدخال اللازمة لإنشاء شحنة (المدن، الوحدات، الأوزان، الأحجام)
export async function getFatihFormOptions() {
    const [citiesRes, unitsRes, weightsRes, sizesRes] = await Promise.all([
        fatihFetch("/shipping/reference/cities"),
        fatihFetch("/shipping/reference/units"),
        fatihFetch("/shipping/reference/categories?type=weight"),
        fatihFetch("/shipping/reference/categories?type=size"),
    ]);
    if (!citiesRes.success) return citiesRes;
    const pickList = (res: any, key: string) => {
        if (!res?.success) return [];
        const d = res.data;
        return Array.isArray(d?.[key]) ? d[key] : Array.isArray(d) ? d : [];
    };
    return {
        success: true as const,
        data: {
            cities: pickList(citiesRes, "cities"),
            units: pickList(unitsRes, "units"),
            weights: pickList(weightsRes, "categories"),
            sizes: pickList(sizesRes, "categories"),
        },
    };
}

// يقدّر أجور الشحن لمدينة الوجهة قبل إنشاء الشحنة
export async function getFatihPricing(params: {
    cityId: number;
    weightId: number;
    sizeId: number;
    packageCount: number;
    orderValue: number;
    receiveAtBranch?: boolean;
    insuranceAgainstLoss?: boolean;
    insuranceAgainstBreakage?: boolean;
    currency?: string;
}) {
    const res = await fatihFetch("/shipping/pricing", {
        method: "POST",
        body: JSON.stringify({
            city_id: params.cityId,
            receive_at_branch: params.receiveAtBranch ?? false,
            order_value: params.orderValue,
            order_value_currency: params.currency || "usd",
            insurance_against_loss: params.insuranceAgainstLoss ?? false,
            insurance_against_breakage: params.insuranceAgainstBreakage ?? false,
            weight_id: params.weightId,
            size_id: params.sizeId,
            package_count: Math.max(1, Math.floor(params.packageCount) || 1),
        }),
    });
    if (!res.success) return res;
    const d = res.data || {};
    return {
        success: true as const,
        data: {
            far: Number(d.far ?? d.final_prices?.usd ?? 0),
            farTr: Number(d.far_tr ?? d.final_prices?.try ?? 0),
            farSyp: Number(d.far_syp ?? d.final_prices?.syp ?? 0),
            requiresCustomFee: Boolean(d.requires_custom_fee),
            customFeeMessage: d.custom_fee_required?.message || null,
        },
    };
}

// ينشئ شحنة في نظام الفاتح
export async function createFatihShipment(payload: Record<string, any>) {
    const res = await fatihFetch("/shipping/orders", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    if (!res.success) return res;
    const data = res.data?.data || {};
    return {
        success: true as const,
        data: {
            orderId: data.order_id ?? data.order?.id ?? null,
            qrCode: data.qr_code ?? data.order?.qr_code ?? null,
            code: data.code ?? data.order?.code ?? null,
            merged: Boolean(data.merged),
            warning: data.warning || null,
        },
    };
}

// ─── Babel Express ───

async function babelExpressFetch(path: string, init?: RequestInit) {
    const username = process.env.BABEL_EXPRESS_USERNAME;
    const password = process.env.BABEL_EXPRESS_PASSWORD;
    if (!username || !password) {
        return { success: false as const, error: "لم يتم ضبط بيانات اعتماد بابل اكسبريس (BABEL_EXPRESS_USERNAME / BABEL_EXPRESS_PASSWORD) في ملف .env" };
    }
    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
    try {
        const res = await fetch(`${BABEL_EXPRESS_API_BASE}${path}`, {
            ...init,
            headers: {
                Authorization: `Basic ${basicAuth}`,
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(init?.headers || {}),
            },
            cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
            const msg = json?.message || json?.error || `فشل الاتصال بخدمة بابل اكسبريس (كود ${res.status})`;
            return { success: false as const, error: msg };
        }
        return { success: true as const, data: json };
    } catch (error) {
        console.error("Babel Express API error:", error);
        return { success: false as const, error: "حدث خطأ أثناء الاتصال بخدمة بابل اكسبريس" };
    }
}

// يستخرج رقم البوليصة (AWB) من استجابة إنشاء الشحنة مهما كان موضعه
function extractBabelAwb(payload: any): string | null {
    const candidates = [
        payload?.awb,
        payload?.AWB,
        payload?.awb_number,
        payload?.awbNumber,
        payload?.data?.awb,
        payload?.data?.awb_number,
        payload?.shipment?.awb,
        payload?.shipment?.awb_number,
    ];
    for (const c of candidates) {
        if (c != null && String(c).trim()) return String(c).trim();
    }
    return null;
}

// ينشئ شحنة في نظام بابل اكسبريس
export async function createBabelExpressShipment(shipment: Record<string, any>) {
    const res = await babelExpressFetch("/createShipment", {
        method: "POST",
        body: JSON.stringify({ shipment }),
    });
    if (!res.success) return res;
    return {
        success: true as const,
        data: {
            awb: extractBabelAwb(res.data),
            raw: res.data,
        },
    };
}