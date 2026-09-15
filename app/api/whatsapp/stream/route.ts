import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function sseEvent(data: any) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: Request) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const stream = new ReadableStream({
    async start(controller) {
      let lastChecked = new Date();

      // send initial ping
      controller.enqueue(sseEvent({ type: 'connected', time: new Date().toISOString() }));

      const timer = setInterval(async () => {
        try {
          const msgs = await prisma.whatsAppMessage.findMany({
            where: { createdAt: { gt: lastChecked } },
            orderBy: { createdAt: 'asc' },
            include: { conversation: true },
          });

          if (msgs.length > 0) {
            for (const m of msgs) {
              controller.enqueue(sseEvent({ type: 'message', data: m }));
            }
            lastChecked = new Date();
          }
        } catch (err) {
          console.error('sse poll error', err);
        }
      }, 2000);

      // Next.js request exposes an AbortSignal; use it to clean up when client disconnects
      try {
        req.signal.addEventListener('abort', () => {
          clearInterval(timer);
          try {
            controller.close();
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // If signal isn't available for some reason, still ensure timer will be cleaned when stream ends
      }
    },
  });

  return new Response(stream, { headers });
}
