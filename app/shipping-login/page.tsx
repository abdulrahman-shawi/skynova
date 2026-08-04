"use client";

import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { shippingLogin } from "@/server/shipping";
import { useRouter } from "next/navigation";
import React from "react";
import toast from "react-hot-toast";

export default function ShippingLoginPage() {
    const router = useRouter();
    const [name, setName] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !password) {
            toast.error("يرجى إدخال اسم الشركة وكلمة السر");
            return;
        }
        setLoading(true);
        try {
            const res = await shippingLogin(name, password);
            if (res.success) {
                toast.success("تم تسجيل الدخول بنجاح");
                router.push("/shipping-orders");
            } else {
                toast.error(res.error || "خطأ في اسم الشركة أو كلمة السر");
            }
        } catch {
            toast.error("حدث خطأ غير متوقع أثناء تسجيل الدخول");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4" dir="rtl">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <h1 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">
                    تسجيل دخول شركات الشحن
                </h1>
                <p className="text-sm text-slate-500 text-center mb-8">
                    أدخل اسم الشركة وكلمة السر لعرض طلباتك
                </p>
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <FormInput
                        className="text-gray-800 dark:text-white"
                        label="اسم الشركة"
                        type="text"
                        value={name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    />
                    <FormInput
                        className="text-gray-800 dark:text-white"
                        label="كلمة السر"
                        type="password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full mt-2"
                    >
                        {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
