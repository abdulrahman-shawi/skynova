"use client";

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type WaMessage = {
  id: string;
  waMessageId?: string | null;
  direction: 'INBOUND' | 'OUTBOUND' | string;
  type: string;
  body?: string | null;
  status?: string | null;
  sentAt?: string | null;
};

type WaConversation = {
  id: string;
  phone: string;
  name?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  messages?: WaMessage[];
};

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<WaConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WaConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [composeText, setComposeText] = useState('');

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.data || []);
        if (!selectedConv && data.data && data.data.length > 0) setSelectedConv(data.data[0]);
      } else {
        toast.error(data.error || 'فشل في جلب المحادثات');
      }
    } catch (e) {
      console.error(e);
      toast.error('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // SSE connection
    const es = new EventSource('/api/whatsapp/stream');
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type === 'message' && payload.data) {
          const m = payload.data;
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === m.conversationId);
            if (idx >= 0) {
              const copy = [...prev];
              const conv = copy[idx];
              conv.lastMessage = m.body || conv.lastMessage;
              conv.lastMessageAt = m.sentAt || conv.lastMessageAt;
              conv.messages = conv.messages ? [...conv.messages, m] : [m];
              copy[idx] = conv;
              return copy;
            }
            // new conversation
            const newConv: WaConversation = {
              id: m.conversationId,
              phone: m.conversation?.phone || 'unknown',
              name: m.conversation?.name || null,
              lastMessage: m.body || null,
              lastMessageAt: m.sentAt || null,
              unreadCount: 1,
              messages: [m],
            };
            return [newConv, ...prev];
          });
        }
      } catch (e) {
        // ignore
      }
    };

    es.onerror = (err) => {
      console.error('SSE error', err);
      es.close();
      // fallback to polling
      const id = setInterval(fetchConversations, 5000);
      return () => clearInterval(id);
    };

    return () => es.close();
  }, []);

  const sendMessage = async () => {
    if (!selectedConv) return toast.error('اختر محادثة أولاً');
    const to = String(selectedConv.phone || '').replace(/\D/g, '');
    if (!to) return toast.error('رقم غير صالح');
    const text = composeText.trim();
    if (!text) return;

    try {
      const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, text }) });
      const data = await res.json();
      if (data.success) {
        // optimistic UI: append to messages
        const now = new Date().toISOString();
        const out = { id: `local-${Date.now()}`, waMessageId: data.waMessageId || null, conversationId: selectedConv.id, direction: 'OUTBOUND', type: 'text', body: text, status: 'sent', sentAt: now };
        setConversations((prev) => prev.map((c) => (c.id === selectedConv.id ? { ...c, messages: c.messages ? [...c.messages, out] : [out], lastMessage: text, lastMessageAt: now } : c)));
        setComposeText('');
        toast.success('تم الإرسال');
      } else {
        toast.error(data.error || 'فشل في الإرسال');
      }
    } catch (e) {
      console.error(e);
      toast.error('خطأ في الإرسال');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border p-3 h-[640px] overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black">محادثات واتساب</h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-xs text-slate-400">جارٍ التحميل...</span>}
          </div>
        </div>

        <div className="space-y-2">
          {conversations.length === 0 && <p className="text-sm text-slate-500">لا توجد محادثات حتى الآن.</p>}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedConv(c)}
              className={`w-full text-right p-3 rounded-md border ${selectedConv?.id === c.id ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{c.name || c.phone}</p>
                  <p className="text-xs text-slate-500 truncate">{c.lastMessage}</p>
                </div>
                <div className="text-xs text-slate-400">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ''}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border p-4 h-[640px] overflow-auto">
        {!selectedConv ? (
          <p className="text-sm text-slate-500">اختر محادثة لعرض الرسائل</p>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <h3 className="font-black text-lg">{selectedConv.name || selectedConv.phone}</h3>
              <p className="text-xs text-slate-500">آخر رسالة: {selectedConv.lastMessage}</p>
            </div>

            <div className="flex-1 overflow-auto space-y-3">
              {(selectedConv.messages || []).map((m) => (
                <div key={m.id} className={`p-2 rounded-lg max-w-[70%] ${m.direction === 'INBOUND' ? 'bg-slate-100 self-start' : 'bg-rose-50 self-end'}`}>
                  <p className="text-sm">{m.body}</p>
                  <div className="text-xs text-slate-400 mt-1">{m.sentAt ? new Date(m.sentAt).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <textarea value={composeText} onChange={(e) => setComposeText(e.target.value)} rows={3} className="w-full p-2 rounded-md bg-slate-100 dark:bg-slate-800" placeholder="اكتب رسالة..."></textarea>
              <div className="flex gap-2 mt-2">
                <button onClick={sendMessage} className="px-4 py-2 bg-rose-500 text-white rounded-lg">إرسال</button>
                <button onClick={() => setComposeText('')} className="px-4 py-2 bg-gray-200 rounded-lg">مسح</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
