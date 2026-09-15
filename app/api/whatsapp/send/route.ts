import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const to = String(body.to || '').replace(/\D/g, '');
    const text = String(body.text || '').trim();

    if (!to || !text) return NextResponse.json({ success: false, error: 'رقم أو نص مفقود' }, { status: 400 });

    const res = await sendWhatsAppTextMessage(to, text);

    // upsert conversation
    const conv = await prisma.whatsAppConversation.upsert({
      where: { phone: to },
      create: { phone: to, name: null, lastMessage: text, lastMessageAt: new Date(), unreadCount: 0 },
      update: { lastMessage: text, lastMessageAt: new Date() },
    });

    // create outbound message record
    await prisma.whatsAppMessage.create({
      data: {
        waMessageId: res.waMessageId || undefined,
        conversationId: conv.id,
        direction: 'OUTBOUND',
        type: 'text',
        body: text,
        status: res.success ? 'sent' : 'failed',
        sentAt: new Date(),
      },
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || 'فشل الإرسال' }, { status: 502 });
    }

    return NextResponse.json({ success: true, waMessageId: res.waMessageId }, { status: 200 });
  } catch (err) {
    console.error('send whatsapp error', err);
    return NextResponse.json({ success: false, error: 'خطأ داخلي' }, { status: 500 });
  }
}
