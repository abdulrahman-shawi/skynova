import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Helper to normalize phone numbers (digits only)
const normalizePhone = (s?: string) => (s ? s.replace(/\D/g, '') : '');

// GET: webhook verification (responds to Meta challenge)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expected = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token && token === expected) {
      return new NextResponse(challenge || 'ok', { status: 200 });
    }

    return NextResponse.json({ success: false, error: 'Invalid verify token' }, { status: 403 });
  } catch (err) {
    console.error('WhatsApp webhook GET error', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// POST: receive webhook events from Meta (WhatsApp Cloud API)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Typical shape: { entry: [ { changes: [ { value: { messages: [...], contacts: [...], metadata: {...} } } ] } ] }
    const entries = Array.isArray(body.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value || change.field || {};

        const messages = Array.isArray(value.messages) ? value.messages : [];
        const contacts = Array.isArray(value.contacts) ? value.contacts : [];

        for (const msg of messages) {
          const from = normalizePhone(msg.from || (contacts[0] && contacts[0].wa_id) || '');
          if (!from) continue;

          // conversation name/profile
          const profileName = (contacts[0] && contacts[0].profile && contacts[0].profile.name) || null;

          // upsert conversation
          const conv = await prisma.whatsAppConversation.upsert({
            where: { phone: from },
            create: {
              phone: from,
              name: profileName,
              lastMessage: msg.text?.body || (msg.type === 'text' && msg.text?.body) || null,
              lastMessageAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
              unreadCount: 1,
            },
            update: {
              name: profileName || undefined,
              lastMessage: msg.text?.body || undefined,
              lastMessageAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : undefined,
              unreadCount: { increment: 1 },
            },
          });

          // avoid duplicate messages by waMessageId
          const waMessageId = msg.id || null;
          if (waMessageId) {
            const exists = await prisma.whatsAppMessage.findUnique({ where: { waMessageId } });
            if (exists) continue;
          }

          const bodyText = msg.text?.body || (msg.type === 'text' && msg.text?.body) || null;

          await prisma.whatsAppMessage.create({
            data: {
              waMessageId: waMessageId,
              conversationId: conv.id,
              direction: 'INBOUND',
              type: msg.type || 'text',
              body: bodyText,
              status: 'sent',
              sentAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('WhatsApp webhook POST error', err, 'body may be:', req);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
