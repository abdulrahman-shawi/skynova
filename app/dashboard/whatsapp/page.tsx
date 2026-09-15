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
            <button onClick={fetchConversations} className="text-sm px-3 py-1 bg-slate-100 rounded">تحديث</button>
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
    ],
    tab: ['الكل'],
    phone: '+963 977 456 789',
    email: 'dana.samir@gmail.com',
    city: 'اللاذقية',
    instagram: '@dana.s',
    notes: 'جاهزة للشراء، تحتاج تفاصيل الدفع.',
    messages: [
      { id: 1, from: 'customer', text: 'أريد معرفة طريقة الدفع', time: '09:30 ص' },
    ],
  },
  {
    id: 6,
    name: 'ليان محمد',
    initials: 'لم',
    avatarColor: 'bg-cyan-500',
    lastMessage: 'تم الطلب، شكراً لكم',
    time: '09:12 ص',
    unread: 0,
    tags: [
      { label: 'مهتم', color: 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400' },
    ],
    tab: ['الكل'],
    phone: '+963 988 567 890',
    email: 'layan.m@gmail.com',
    city: 'دمشق',
    instagram: '@layan.mhd',
    notes: 'أتمت الطلب بنجاح.',
    messages: [
      { id: 1, from: 'customer', text: 'تم الطلب، شكراً لكم', time: '09:12 ص' },
    ],
  },
  {
    id: 7,
    name: 'شهد علي',
    initials: 'شع',
    avatarColor: 'bg-fuchsia-500',
    lastMessage: 'كم مدة التوصيل إلى حلب؟',
    time: 'أمس',
    unread: 0,
    tags: [
      { label: 'استفسار', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
    ],
    tab: ['الكل'],
    phone: '+963 999 678 901',
    email: 'shahd.ali@gmail.com',
    city: 'حلب',
    instagram: '@shahd.a',
    notes: '',
    messages: [
      { id: 1, from: 'customer', text: 'كم مدة التوصيل إلى حلب؟', time: 'أمس' },
    ],
  },
  {
    id: 8,
    name: 'بتول عمران',
    initials: 'بع',
    avatarColor: 'bg-lime-600',
    lastMessage: 'هل هناك عرض خاص؟',
    time: 'أمس',
    unread: 0,
    tags: [
      { label: 'عميل جديد', color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
    ],
    tab: ['الكل', 'عملاء جدد'],
    phone: '+963 910 789 012',
    email: 'batoul.o@gmail.com',
    city: 'طرطوس',
    instagram: '@batoul.omran',
    notes: '',
    messages: [
      { id: 1, from: 'customer', text: 'هل هناك عرض خاص؟', time: 'أمس' },
    ],
  },
];

const stats = [
  { label: 'محادثات نشطة', value: 42, icon: MessageSquare, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' },
  { label: 'ردود تنتظر', value: 7, icon: Reply, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  { label: 'عملاء جدد اليوم', value: 12, icon: UserPlus, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
];

const tabs: { key: ChatTab; count: number }[] = [
  { key: 'الكل', count: 42 },
  { key: 'غير مقروءة', count: 7 },
  { key: 'عملاء جدد', count: 12 },
  { key: 'المتابعات', count: 11 },
];

export default function WhatsAppPage() {
  const [conversations, setConversations] = React.useState(conversationsSeed);
  const [selectedId, setSelectedId] = React.useState(conversationsSeed[0].id);
  const [activeTab, setActiveTab] = React.useState<ChatTab>('الكل');
  const [search, setSearch] = React.useState('');
  const [messageText, setMessageText] = React.useState('');
  const [notes, setNotes] = React.useState(conversationsSeed[0].notes);
  const [showInfo, setShowInfo] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId)!;

  const filtered = conversations.filter((c) => {
    const matchesTab = activeTab === 'الكل' || c.tab.includes(activeTab);
    const matchesSearch = !search || c.name.includes(search) || c.lastMessage.includes(search);
    return matchesTab && matchesSearch;
  });

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId, selected.messages.length]);

  const selectConversation = (conv: Conversation) => {
    setSelectedId(conv.id);
    setNotes(conv.notes);
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
  };

  const sendMessage = () => {
    const text = messageText.trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
    const message: ChatMessage = { id: Date.now(), from: 'agent', text, time, status: 'sent' };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId ? { ...c, messages: [...c.messages, message], lastMessage: text, time } : c,
      ),
    );
    setMessageText('');
  };

  const copyToClipboard = (value: string) => {
    navigator.clipboard?.writeText(value);
    toast.success('تم النسخ');
  };

  const mockAction = (label: string) => toast(`${label} — ستتوفر عند ربط خدمة واتساب`, { icon: '⏳' });

  return (
    <div className="space-y-5">
      {/* الترويسة */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
            <MessageSquare size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">WhatsApp</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">تواصل أسرع .. مبيعات أكثر</p>
          </div>
        </div>
        <div className="bg-gradient-to-l from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 px-4 py-2.5 flex items-center gap-3">
          <Zap size={20} className="text-amber-500 shrink-0" />
          <div>
            <p className="font-black text-sm text-slate-800 dark:text-white">الرد السريع يصنع الفرق</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">حافظ على سرعة الرد</p>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4"
          >
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* منطقة المحادثات — تظهر لوحة معلومات العميل أسفل البطاقات عند تفعيلها */}
      <div
        className={`grid grid-cols-1 gap-5 transition-all duration-300 ${
          showInfo ? 'xl:grid-cols-[300px_minmax(0,1fr)_300px]' : 'xl:grid-cols-[300px_minmax(0,1fr)]'
        }`}
      >
        {/* قائمة المحادثات */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[640px]">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في المحادثات ..."
                  className="w-full h-10 rounded-xl bg-slate-100 dark:bg-slate-800 pr-9 pl-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
              <button
                onClick={() => mockAction('الفلاتر المتقدمة')}
                className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors shrink-0"
              >
                <Filter size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap px-3 h-8 rounded-lg text-xs font-bold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.key} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-right rounded-xl p-3 flex items-start gap-3 transition-colors ${
                  conv.id === selectedId
                    ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className={`h-11 w-11 rounded-full ${conv.avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {conv.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{conv.name}</p>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{conv.time}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{conv.lastMessage}</p>
                    {conv.unread > 0 && (
                      <span className="h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {conv.tags.map((tag) => (
                      <span key={tag.label} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${tag.color}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10 font-medium">لا توجد محادثات مطابقة</p>
            )}
          </div>
        </div>

        {/* نافذة المحادثة */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[640px] min-w-0">
          {/* ترويسة المحادثة */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-full ${selected.avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {selected.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 dark:text-white truncate">{selected.name}</p>
                <Pencil size={13} className="text-slate-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                <span dir="ltr" className="whitespace-nowrap">{selected.phone}</span>
                <span className="text-slate-300 dark:text-slate-600"> | </span>
                {selected.city}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selected.tags.slice(0, 2).map((tag) => (
                <span key={tag.label} className={`hidden md:inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${tag.color}`}>
                  {tag.label}
                </span>
              ))}
              {/* زر إظهار / إخفاء معلومات العميل */}
              <button
                onClick={() => setShowInfo(!showInfo)}
                title={showInfo ? 'إخفاء معلومات العميل' : 'إظهار معلومات العميل'}
                className={`h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors ${
                  showInfo
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {showInfo ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                <span className="hidden sm:inline">{showInfo ? 'إخفاء المعلومات' : 'معلومات العميل'}</span>
              </button>
              <button className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:flex items-center justify-center text-slate-500">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* الرسائل */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-slate-950/30">
            {selected.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'agent' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    msg.from === 'agent'
                      ? 'bg-green-100 dark:bg-green-500/15 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tr-sm border border-slate-100 dark:border-slate-700'
                  }`}
                >
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{msg.text}</p>
                  {msg.productCard && (
                    <div className="mt-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-rose-100 to-pink-200 dark:from-rose-500/20 dark:to-pink-500/20 flex items-center justify-center shrink-0">
                          <Package size={22} className="text-rose-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-sm text-slate-800 dark:text-white">{msg.productCard.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{msg.productCard.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => mockAction('تحميل المرفقات')}
                        className="w-full flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-black">PDF</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-1 text-right">{msg.productCard.pdfName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{msg.productCard.pdfSize}</span>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">{msg.time}</span>
                    {msg.from === 'agent' &&
                      (msg.status === 'read' ? (
                        <CheckCheck size={13} className="text-sky-500" />
                      ) : (
                        <Check size={13} className="text-slate-400" />
                      ))}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* حقل الإدخال */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <button onClick={() => mockAction('الملصقات والرموز')} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <Smile size={20} />
            </button>
            <button onClick={() => mockAction('إرفاق الملفات')} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <Paperclip size={20} />
            </button>
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب رسالتك هنا ..."
              className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/30 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-w-0"
            />
            <button
              onClick={sendMessage}
              className="h-11 w-11 rounded-xl bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white transition-colors shrink-0 shadow-lg shadow-rose-500/20"
            >
              <Send size={18} className="-scale-x-100" />
            </button>
          </div>
        </div>

        {/* لوحة معلومات العميل — مخفية افتراضياً وتظهر أسفل بطاقات الإحصائيات */}
        {showInfo && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-black text-sm text-slate-800 dark:text-white">معلومات العميل</p>
                <button
                  onClick={() => setShowInfo(false)}
                  title="إخفاء المعلومات"
                  className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className={`h-20 w-20 rounded-full ${selected.avatarColor} flex items-center justify-center text-white font-black text-2xl`}>
                  {selected.initials}
                </div>
                <p className="font-black text-slate-800 dark:text-white">{selected.name}</p>
                {selected.tags[0] && (
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${selected.tags[0].color}`}>
                    {selected.tags[0].label}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => mockAction('المكالمات الصوتية')} className="h-9 w-9 rounded-xl bg-green-50 dark:bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors">
                    <Phone size={16} />
                  </button>
                  <button onClick={() => mockAction('مكالمات الفيديو')} className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <Video size={16} />
                  </button>
                  <button className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                {[
                  { icon: Phone, value: selected.phone, ltr: true },
                  { icon: Mail, value: selected.email, ltr: true },
                  { icon: MapPin, value: selected.city, ltr: false },
                  { icon: Instagram, value: selected.instagram, ltr: true },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <row.icon size={15} className="text-slate-400 shrink-0" />
                    <span className="flex-1 font-medium text-slate-700 dark:text-slate-200 truncate" dir={row.ltr ? 'ltr' : 'rtl'} style={row.ltr ? { textAlign: 'right' } : undefined}>
                      {row.value}
                    </span>
                    <button onClick={() => copyToClipboard(row.value)} className="text-slate-300 hover:text-blue-500 transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 text-sm">
                  <Tag size={15} className="text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">SKYNOVA GLOW</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <StickyNote size={15} className="text-slate-400" /> ملاحظات
                </p>
                <button onClick={() => toast.success('تم حفظ الملاحظة')} className="text-slate-400 hover:text-blue-500 transition-colors">
                  <Pencil size={14} />
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="أضف ملاحظة عن العميل ..."
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <p className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Zap size={15} className="text-slate-400" /> إجراءات سريعة
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'تحديد متابعة', icon: Calendar },
                  { label: 'إنشاء طلب', icon: ShoppingCart },
                  { label: 'إضافة ملاحظة', icon: NotebookPen },
                  { label: 'إسناد لزميل', icon: Users },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => mockAction(action.label)}
                    className="flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-rose-300 hover:text-rose-500 dark:hover:border-rose-500/40 transition-colors"
                  >
                    <action.icon size={14} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
