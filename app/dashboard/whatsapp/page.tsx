'use client';

import * as React from 'react';
import {
  Search, Filter, MessageSquare, Reply, UserPlus, Zap, Phone, Video,
  MoreHorizontal, Copy, MapPin, Mail, Instagram, Tag, StickyNote,
  Calendar, ShoppingCart, NotebookPen, Users, Smile, Paperclip, Send,
  Check, CheckCheck, Pencil, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

// =====================================================
// بيانات تجريبية مؤقتة — سيتم استبدالها بواجهة واتساب
// الرسمية عند الاشتراك بمزود الخدمة
// =====================================================

type ChatTab = 'الكل' | 'غير مقروءة' | 'عملاء جدد' | 'المتابعات';

interface ChatMessage {
  id: number;
  from: 'customer' | 'agent';
  text: string;
  time: string;
  status?: 'sent' | 'read';
  productCard?: {
    name: string;
    description: string;
    pdfName: string;
    pdfSize: string;
  };
}

interface Conversation {
  id: number;
  name: string;
  initials: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  unread: number;
  tags: { label: string; color: string }[];
  tab: ChatTab[];
  phone: string;
  email: string;
  city: string;
  instagram: string;
  notes: string;
  messages: ChatMessage[];
}

const conversationsSeed: Conversation[] = [
  {
    id: 1,
    name: 'نور الحسن',
    initials: 'نح',
    avatarColor: 'bg-rose-500',
    lastMessage: 'هل الجهاز مناسب للبشرة الحساسة؟',
    time: '10:24 ص',
    unread: 2,
    tags: [
      { label: 'عميل جديد', color: 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
      { label: 'SKYNOVA GLOW', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    ],
    tab: ['الكل', 'غير مقروءة', 'عملاء جدد'],
    phone: '+963 933 765 432',
    email: 'noor.alhassan@gmail.com',
    city: 'حمص',
    instagram: '@noor.hassan',
    notes: 'مهتمة جداً. تسأل عن مدى ملاءمة الجهاز للبشرة الحساسة. طلبت كتالوج.',
    messages: [
      { id: 1, from: 'customer', text: 'مرحباً 👋', time: '10:20 ص' },
      { id: 2, from: 'customer', text: 'أريد معرفة هل الجهاز مناسب للبشرة الحساسة؟', time: '10:20 ص' },
      {
        id: 3, from: 'agent', status: 'read', time: '10:21 ص',
        text: 'أهلاً نور 🌸 نعم الجهاز مناسب للبشرة الحساسة، ويتميز بتقنية التبريد لتقليل الإحساس بالحرارة أثناء الاستخدام. هل ترغبين بمعرفة المزيد من التفاصيل؟',
      },
      { id: 4, from: 'customer', text: 'نعم طبعاً', time: '10:22 ص' },
      { id: 5, from: 'customer', text: 'وهل يعطي نتائج فعالة من أول شهر؟', time: '10:22 ص' },
      {
        id: 6, from: 'agent', status: 'read', time: '10:23 ص',
        text: 'إليكِ دليل المنتج الكامل:',
        productCard: {
          name: 'SKYNOVA GLOW',
          description: 'جهاز إزالة الشعر المنزلي بتقنية IPL',
          pdfName: 'دليل المنتج',
          pdfSize: '2.4 MB',
        },
      },
      { id: 7, from: 'customer', text: 'شكراً! سأقرأ التفاصيل وأعود إليكم اليوم', time: '10:24 ص' },
    ],
  },
  {
    id: 2,
    name: 'رنا علي',
    initials: 'رع',
    avatarColor: 'bg-violet-500',
    lastMessage: 'تمام، بدي أفكر وأرد عليكم بكرا',
    time: '10:18 ص',
    unread: 1,
    tags: [
      { label: 'متابعة', color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
      { label: 'SKYNOVA GLOW', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    ],
    tab: ['الكل', 'غير مقروءة', 'المتابعات'],
    phone: '+963 944 123 456',
    email: 'rana.ali@gmail.com',
    city: 'دمشق',
    instagram: '@rana.ali',
    notes: 'تحتاج تذكير غداً بخصوص العرض الحالي.',
    messages: [
      { id: 1, from: 'agent', status: 'read', time: '10:10 ص', text: 'مرحباً رنا، العرض الحالي متاح حتى نهاية الأسبوع فقط 🎁' },
      { id: 2, from: 'customer', text: 'تمام، بدي أفكر وأرد عليكم بكرا', time: '10:18 ص' },
    ],
  },
  {
    id: 3,
    name: 'مريم خالد',
    initials: 'مخ',
    avatarColor: 'bg-emerald-500',
    lastMessage: 'شكراً على المعلومات 🙏',
    time: '09:55 ص',
    unread: 0,
    tags: [
      { label: 'مهتم', color: 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400' },
      { label: 'مجموعة العناية', color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
    ],
    tab: ['الكل'],
    phone: '+963 955 234 567',
    email: 'mariam.k@gmail.com',
    city: 'حلب',
    instagram: '@mariam.kh',
    notes: 'مهتمة بمجموعة العناية بالبشرة.',
    messages: [
      { id: 1, from: 'agent', status: 'read', time: '09:50 ص', text: 'مجموعة العناية تشمل الغسول والسيروم والكريم الليلي.' },
      { id: 2, from: 'customer', text: 'شكراً على المعلومات 🙏', time: '09:55 ص' },
    ],
  },
  {
    id: 4,
    name: 'هلا يوسف',
    initials: 'هي',
    avatarColor: 'bg-orange-500',
    lastMessage: 'هل فيه ضمان على الجهاز؟',
    time: '09:42 ص',
    unread: 3,
    tags: [
      { label: 'استفسار', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
      { label: 'SKYNOVA GLOW', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    ],
    tab: ['الكل', 'غير مقروءة'],
    phone: '+963 966 345 678',
    email: 'hala.yousef@gmail.com',
    city: 'حمص',
    instagram: '@hala.y',
    notes: 'تسأل عن الضمان ومدة الكفالة.',
    messages: [
      { id: 1, from: 'customer', text: 'مرحباً، هل فيه ضمان على الجهاز؟', time: '09:42 ص' },
    ],
  },
  {
    id: 5,
    name: 'دانا سمير',
    initials: 'دس',
    avatarColor: 'bg-pink-500',
    lastMessage: 'أريد معرفة طريقة الدفع',
    time: '09:30 ص',
    unread: 0,
    tags: [
      { label: 'مهتم', color: 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400' },
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
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
          <MessageSquare size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">WhatsApp</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">تواصل أسرع .. مبيعات أكثر</p>
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

      {/* الأعمدة الثلاثة */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_300px] gap-5">
        {/* قائمة المحادثات */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[720px]">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[720px]">
          {/* ترويسة المحادثة */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-full ${selected.avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {selected.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 dark:text-white">{selected.name}</p>
                <Pencil size={13} className="text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium" dir="ltr">
                {selected.phone} <span className="text-slate-300">|</span> {selected.city}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selected.tags.map((tag) => (
                <span key={tag.label} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${tag.color}`}>
                  {tag.label}
                </span>
              ))}
              <button className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500">
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
              className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500/30 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
            <button
              onClick={sendMessage}
              className="h-11 w-11 rounded-xl bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white transition-colors shrink-0 shadow-lg shadow-rose-500/20"
            >
              <Send size={18} className="-scale-x-100" />
            </button>
          </div>
        </div>

        {/* معلومات العميل */}
        <div className="space-y-4">
          <div className="bg-gradient-to-l from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 p-4 flex items-center gap-3">
            <Zap size={22} className="text-amber-500 shrink-0" />
            <div>
              <p className="font-black text-sm text-slate-800 dark:text-white">الرد السريع يصنع الفرق ⚡</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">حافظ على سرعة الرد</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
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
      </div>
    </div>
  );
}
