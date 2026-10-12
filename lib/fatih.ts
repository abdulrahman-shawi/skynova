export const FATIH_COMPANY_NAME = "الفاتح";

// رسائل تحذيرات إنشاء الشحنة لدى الفاتح (POST /shipments — warnings[])
export const FATIH_WARNING_MESSAGES: Record<string, string> = {
    duplicate_active_shipment: "للمستلم شحنات فعّالة أخرى من حسابكم لدى الفاتح",
    recipient_under_watch: "المستلم قيد المراقبة لدى الفاتح بسبب مرتجعات سابقة",
    recipient_blocked: "رقم المستلم محظور لدى الفاتح (مستلم وهمي محتمل) — تأكد منه قبل التسليم",
    manual_pricing_required: "ستُحدد أجور الشحن يدوياً عند الاستلام",
    merged_with_existing_sticker: "رقم التتبع المرسل كان ملصقاً مسجلاً بلا بيانات وأُكملت بياناته بهذه الشحنة",
};
