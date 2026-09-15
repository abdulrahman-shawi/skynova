const GRAPH_API_VERSION = "v21.0";

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
}

// تُقرأ المتغيرات من .env — تُعاد null إن لم تُضبط بعد
export function getWhatsAppConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig() !== null;
}

// إرسال رسالة نصية عبر WhatsApp Cloud API
export async function sendWhatsAppTextMessage(
  to: string,
  body: string,
): Promise<{ success: boolean; waMessageId?: string; error?: string }> {
  const config = getWhatsAppConfig();
  if (!config) {
    return { success: false, error: "متغيرات واتساب غير مضبوطة في ملف .env" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body },
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      const code = result?.error?.code;
      // 131047 = انتهت نافذة الـ 24 ساعة من آخر رسالة من العميل
      if (code === 131047) {
        return {
          success: false,
          error: "انتهت نافذة الـ 24 ساعة — يجب أن يراسلك العميل أولاً أو استخدام قالب معتمد",
        };
      }
      console.error("WhatsApp API Error:", result?.error);
      return { success: false, error: result?.error?.message || "فشل إرسال الرسالة عبر واتساب" };
    }

    return { success: true, waMessageId: result?.messages?.[0]?.id };
  } catch (error) {
    console.error("WhatsApp API Error:", error);
    return { success: false, error: "تعذر الاتصال بخدمة واتساب" };
  }
}
