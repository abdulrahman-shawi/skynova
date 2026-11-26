"use client";

// مركز التواصل الداخلي — Communication Hub
// محادثات فردية ومجموعات بين الموظفين مع دعم النصوص والصور والملفات والإشعارات الفورية

import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/utils";
import {
  createGroupConversation,
  getChatBootstrap,
  getChatMessages,
  getOrCreateDirectConversation,
  markConversationRead,
  sendChatMessage,
  uploadChatAttachment,
} from "@/server/chat";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessagesSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import * as React from "react";
import toast from "react-hot-toast";

const POLL_INTERVAL_MS = 5000;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

type Conversation = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  isGroup: boolean;
  memberCount: number;
  unreadCount: number;
  lastMessageAt: string;
  peer?: { avatar?: string | null } | null;
  lastMessage?: {
    type: string;
    content: string;
    fileName: string | null;
    senderName: string;
    createdAt: string;
  } | null;
};

type ChatMessageItem = {
  id: string;
  type: string;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  sender?: { id: string; username: string; avatar: string | null; jobTitle: string | null } | null;
};

function formatMessageTime(value: string | Date | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatLastMessageAt(value: string | Date | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatMessageTime(date);
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function formatFileSize(bytes: number | null | undefined) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function previewText(message: Conversation["lastMessage"]) {
  if (!message) return "لا توجد رسائل بعد";
  if (message.type === "IMAGE") return "صورة";
  if (message.type === "FILE") return `ملف: ${message.fileName || ""}`;
  return message.content || "";
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" }) {
  const classes = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
  if (url) {
    return <img src={url} alt={name} className={`${classes} rounded-full object-cover border border-slate-200 dark:border-slate-700`} />;
  }
  return (
    <div className={`${classes} rounded-full bg-blue-600 text-white flex items-center justify-center font-bold`}>
      {(name || "؟").trim().charAt(0)}
    </div>
  );
}

export default function CommunicationHubPage() {
  const { user } = useAuth();
  const canView = Boolean(user && (user.accountType === "ADMIN" || hasPermission(user, "viewMessages")));

  const [loading, setLoading] = React.useState(true);
  const [me, setMe] = React.useState<{ id: string; username: string; avatar: string | null } | null>(null);
  const [canSend, setCanSend] = React.useState(false);
  const [canCreateGroup, setCanCreateGroup] = React.useState(false);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [contacts, setContacts] = React.useState<any[]>([]);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [messageSearch, setMessageSearch] = React.useState("");
  const [listSearch, setListSearch] = React.useState("");

  const [draft, setDraft] = React.useState("");
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [sending, setSending] = React.useState(false);

  const [isDirectOpen, setIsDirectOpen] = React.useState(false);
  const [directTarget, setDirectTarget] = React.useState<string>("");
  const [isGroupOpen, setIsGroupOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [groupDepartment, setGroupDepartment] = React.useState("");
  const [groupMembers, setGroupMembers] = React.useState<string[]>([]);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const activeIdRef = React.useRef<string | null>(null);
  activeIdRef.current = activeId;
  const messagesRef = React.useRef<ChatMessageItem[]>([]);
  messagesRef.current = messages;

  const loadBootstrap = React.useCallback(async () => {
    const res = await getChatBootstrap();
    if (!res.success) {
      toast.error(String(res.error || "فشل تحميل مركز التواصل"));
      setLoading(false);
      return;
    }
    const data = res.data as any;
    setMe(data.me || null);
    setCanSend(Boolean(data.canSend));
    setCanCreateGroup(Boolean(data.canCreateGroup));
    setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (canView) void loadBootstrap();
  }, [canView, loadBootstrap]);

  const openConversation = React.useCallback(async (conversationId: string, search: string = "") => {
    setActiveId(conversationId);
    setLoadingMessages(true);
    setMessageSearch(search);
    const res = await getChatMessages(conversationId, search || undefined);
    if (!res.success) {
      toast.error(String(res.error || "تعذر تحميل الرسائل"));
      setLoadingMessages(false);
      return;
    }
    setMessages((Array.isArray(res.data) ? res.data : []) as ChatMessageItem[]);
    setLoadingMessages(false);
    await markConversationRead(conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  // استطلاع الإشعارات الفورية
  React.useEffect(() => {
    if (!canView) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/chat/poll", { cache: "no-store" });
        const payload = await res.json();
        if (cancelled || !payload?.success || !payload?.data) return;

        const snapshot = payload.data;
        const byId = new Map<string, any>((snapshot.conversations || []).map((c: any) => [c.id, c]));

        setConversations((prev) => {
          // محادثة جديدة أنشأها شخص آخر معي → إعادة تحميل كامل
          const unknown = (snapshot.conversations || []).find((c: any) => !prev.some((p) => p.id === c.id));
          if (unknown) {
            void loadBootstrap();
            return prev;
          }
          const next = prev.map((c) => {
            const s = byId.get(c.id);
            if (!s) return c;
            const isActive = activeIdRef.current === c.id;
            return {
              ...c,
              unreadCount: isActive ? 0 : s.unread,
              lastMessageAt: s.lastMessageAt || c.lastMessageAt,
              lastMessage: s.lastMessage || c.lastMessage,
            };
          });
          next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          return next;
        });

        // تحديث تلقائي لرسائل المحادثة المفتوحة عند وصول رسالة جديدة
        const active = activeIdRef.current;
        if (active) {
          const s = byId.get(active);
          const latestLocal = messagesRef.current[messagesRef.current.length - 1];
          const remoteTime = s?.lastMessage?.createdAt ? new Date(s.lastMessage.createdAt).getTime() : 0;
          const localTime = latestLocal ? new Date(latestLocal.createdAt).getTime() : 0;
          if (s && s.unread > 0 && remoteTime > localTime) {
            const msgRes = await getChatMessages(active);
            if (msgRes.success && !cancelled) {
              setMessages((Array.isArray(msgRes.data) ? msgRes.data : []) as ChatMessageItem[]);
              await markConversationRead(active);
            }
          }
        }

        document.title = snapshot.unreadTotal > 0 ? `(${snapshot.unreadTotal}) SKYNOVA CRM` : "SKYNOVA CRM";
      } catch {
        // تجاهل أخطاء الشبكة المؤقتة
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canView, loadBootstrap]);

  const handleSend = async () => {
    if (!activeId || sending) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;

    setSending(true);
    try {
      let attachment: { url: string; fileName: string; fileSize: number; mimeType: string } | null = null;

      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);
        const uploadRes = await uploadChatAttachment(formData);
        if (!uploadRes.success || !uploadRes.data) {
          throw new Error(String(uploadRes.error || "فشل رفع الملف"));
        }
        attachment = uploadRes.data as any;
      }

      const res = await sendChatMessage(activeId, text, attachment);
      if (!res.success) {
        throw new Error(String(res.error || "فشل إرسال الرسالة"));
      }

      const sentMessage = res.data as ChatMessageItem;
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id)) return prev;
        return [...prev, sentMessage];
      });
      setDraft("");
      setPendingFile(null);
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  lastMessageAt: sentMessage.createdAt,
                  lastMessage: {
                    type: sentMessage.type,
                    content: sentMessage.content,
                    fileName: sentMessage.fileName,
                    senderName: me?.username || "أنا",
                    createdAt: sentMessage.createdAt,
                  },
                }
              : c
          )
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      );
    } catch (error: any) {
      toast.error(error?.message || "حدث خطأ أثناء الإرسال");
    } finally {
      setSending(false);
    }
  };

  const handlePickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("حجم الملف يتجاوز الحد الأقصى (25MB)");
      return;
    }
    setPendingFile(file);
  };

  const handleCreateDirect = async () => {
    if (!directTarget) {
      toast.error("اختر المستخدم أولاً");
      return;
    }
    const res = await getOrCreateDirectConversation(directTarget);
    if (!res.success || !res.conversationId) {
      toast.error(String(res.error || "تعذر إنشاء المحادثة"));
      return;
    }
    setIsDirectOpen(false);
    setDirectTarget("");
    await loadBootstrap();
    void openConversation(res.conversationId);
  };

  const handleCreateGroup = async () => {
    const res = await createGroupConversation(groupName, groupDepartment, groupMembers);
    if (!res.success || !res.conversationId) {
      toast.error(String(res.error || "تعذر إنشاء المجموعة"));
      return;
    }
    toast.success("تم إنشاء المجموعة بنجاح");
    setIsGroupOpen(false);
    setGroupName("");
    setGroupDepartment("");
    setGroupMembers([]);
    await loadBootstrap();
    void openConversation(res.conversationId);
  };

  const toggleGroupMember = (userId: string) => {
    setGroupMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const filteredConversations = React.useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(query) || (c.subtitle || "").toLowerCase().includes(query)
    );
  }, [conversations, listSearch]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const contactOptions = contacts.map((contact) => ({
    value: String(contact.id),
    label: contact.jobTitle ? `${contact.username} (${contact.jobTitle})` : contact.username,
  }));

  if (!canView) {
    return (
      <div className="p-4" dir="rtl">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">مركز التواصل</h1>
        <p className="mt-4 text-sm text-slate-500">لا تملك صلاحية الوصول إلى مركز التواصل الداخلي.</p>
      </div>
    );
  }

  return (
    <div className="p-4 h-[calc(100vh-90px)] flex flex-col gap-4" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <MessagesSquare className="text-blue-600" />
            مركز التواصل
          </h1>
          <p className="text-sm text-slate-500 mt-1">تواصل داخلي فوري بين الموظفين والمدراء — نصوص وصور وملفات</p>
        </div>
        {canSend && (
          <div className="flex gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsDirectOpen(true)}>
              <Plus size={16} className="ml-1" />
              محادثة جديدة
            </Button>
            {canCreateGroup && (
              <Button variant="outline" onClick={() => setIsGroupOpen(true)}>
                <Users size={16} className="ml-1" />
                مجموعة جديدة
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* قائمة المحادثات */}
        <div className="w-full md:w-80 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search size={16} className="absolute top-3 right-3 text-slate-400" />
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="ابحث في المحادثات..."
                className="w-full h-10 pr-9 pl-3 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10 text-slate-400">
                <Loader2 className="animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-10">
                {listSearch ? "لا توجد نتائج مطابقة" : "لا توجد محادثات — ابدأ محادثة جديدة"}
              </p>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => void openConversation(conversation.id)}
                  className={`w-full flex items-center gap-3 p-3 text-right transition-colors border-b border-slate-50 dark:border-slate-800/60 ${
                    activeId === conversation.id
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <Avatar name={conversation.title} url={conversation.peer?.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {conversation.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatLastMessageAt(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conversation.lastMessage ? `${conversation.lastMessage.senderName}: ` : ""}
                        {previewText(conversation.lastMessage)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{conversation.subtitle}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* نافذة المحادثة */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden min-w-0">
          {!activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <MessagesSquare className="w-16 h-16 stroke-[1.2]" />
              <p className="font-bold">اختر محادثة من القائمة لبدء التواصل</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={activeConversation.title} url={activeConversation.peer?.avatar} />
                  <div>
                    <h2 className="font-bold text-slate-800 dark:text-slate-100">{activeConversation.title}</h2>
                    <p className="text-xs text-slate-400">{activeConversation.subtitle}</p>
                  </div>
                </div>
                <div className="relative w-full max-w-xs">
                  <Search size={14} className="absolute top-2.5 right-3 text-slate-400" />
                  <input
                    value={messageSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMessageSearch(value);
                      void openConversation(activeConversation.id, value);
                    }}
                    placeholder="ابحث في المحادثة..."
                    className="w-full h-9 pr-8 pl-3 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
                {loadingMessages ? (
                  <div className="flex justify-center py-10 text-slate-400">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-10">
                    {messageSearch ? "لا توجد رسائل مطابقة للبحث" : "ابدأ المحادثة بأول رسالة"}
                  </p>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender?.id === me?.id;
                    return (
                      <div key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        {!isMine && activeConversation.isGroup && (
                          <span className="text-[10px] font-bold text-slate-400 mb-1 mr-1">
                            {message.sender?.username || "مستخدم محذوف"}
                          </span>
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMine
                              ? "bg-blue-600 text-white rounded-bl-sm"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-br-sm"
                          }`}
                        >
                          {message.type === "IMAGE" && message.fileUrl ? (
                            <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img
                                src={message.fileUrl}
                                alt={message.fileName || "صورة"}
                                className="max-w-full max-h-72 rounded-xl mb-1"
                              />
                            </a>
                          ) : message.type === "FILE" && message.fileUrl ? (
                            <a
                              href={message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={message.fileName || true}
                              className={`flex items-center gap-2 underline font-bold ${
                                isMine ? "text-white" : "text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              <Download size={16} />
                              <span className="truncate max-w-[220px]">{message.fileName || "ملف"}</span>
                              <span className="text-[10px] opacity-80">{formatFileSize(message.fileSize)}</span>
                            </a>
                          ) : null}
                          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                          <span className={`block text-[10px] mt-1 ${isMine ? "text-blue-100" : "text-slate-400"}`}>
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {canSend && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                  {pendingFile && (
                    <div className="mb-2 inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      {pendingFile.type.startsWith("image/") ? <ImageIcon size={14} /> : <FileText size={14} />}
                      <span className="max-w-[220px] truncate">{pendingFile.name}</span>
                      <span className="text-slate-400">({formatFileSize(pendingFile.size)})</span>
                      <button onClick={() => setPendingFile(null)} className="text-red-500 hover:text-red-700">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handlePickFile} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
                      title="إرفاق صورة أو ملف"
                    >
                      <Paperclip size={18} />
                    </button>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder="اكتب رسالتك... (Enter للإرسال)"
                      rows={1}
                      className="flex-1 resize-none h-12 py-3 px-4 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-5"
                      onClick={() => void handleSend()}
                      disabled={sending || (!draft.trim() && !pendingFile)}
                    >
                      {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* نافذة محادثة فردية جديدة */}
      <AppModal title="محادثة جديدة" isOpen={isDirectOpen} onClose={() => setIsDirectOpen(false)}>
        <div className="p-4 space-y-4">
          <SearchableSelect
            label="اختر الموظف"
            placeholder="اسم الموظف..."
            searchPlaceholder="ابحث بالاسم..."
            options={contactOptions}
            value={directTarget}
            onChange={(value) => setDirectTarget(String(value))}
          />
          <div className="flex justify-end gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleCreateDirect()}>
              فتح المحادثة
            </Button>
            <Button variant="outline" onClick={() => setIsDirectOpen(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      </AppModal>

      {/* نافذة مجموعة جديدة */}
      <AppModal title="مجموعة جديدة" isOpen={isGroupOpen} onClose={() => setIsGroupOpen(false)} size="lg">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="اسم المجموعة"
              value={groupName}
              onChange={(e: any) => setGroupName(e.target.value)}
              placeholder="مثال: فريق المبيعات"
            />
            <FormInput
              label="القسم (اختياري)"
              value={groupDepartment}
              onChange={(e: any) => setGroupDepartment(e.target.value)}
              placeholder="مثال: المبيعات"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 block mb-2">أعضاء المجموعة</label>
            <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {contacts.length === 0 ? (
                <p className="p-4 text-sm text-slate-400 text-center">لا يوجد موظفون متاحون</p>
              ) : (
                contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <input
                      type="checkbox"
                      checked={groupMembers.includes(contact.id)}
                      onChange={() => toggleGroupMember(contact.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <Avatar name={contact.username} url={contact.avatar} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{contact.username}</p>
                      <p className="text-xs text-slate-400">{contact.jobTitle || "—"}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void handleCreateGroup()}>
              إنشاء المجموعة
            </Button>
            <Button variant="outline" onClick={() => setIsGroupOpen(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      </AppModal>
    </div>
  );
}
