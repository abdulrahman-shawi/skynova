import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const convs = await prisma.whatsAppConversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { sentAt: 'asc' } },
      },
    });

    return NextResponse.json({ success: true, data: convs }, { status: 200 });
  } catch (err) {
    console.error('get conversations error', err);
    return NextResponse.json({ success: false, error: 'فشل في جلب المحادثات' }, { status: 500 });
  }
}
