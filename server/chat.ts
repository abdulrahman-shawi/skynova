"use server";

// مركز التواصل الداخلي — Internal Communication Hub
// محادثات فردية ومجموعات (حسب الأقسام) بين موظفي النظام

import { put } from '@vercel/blob';
import { decrypt } from '@/lib/auth';
import { hasPermission, isAdmin } from '@/lib/utils';
import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers';

const CHAT_DIRECT = "DIRECT";
const CHAT_GROUP = "GROUP";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB
const MESSAGES_PAGE_SIZE = 500;

const userSelect = {
    id: true,
    username: true,
    avatar: true,
    jobTitle: true,
    accountType: true,
} as const;

async function getCurrentSessionUser() {
    try {
        const session = cookies().get('skynova')?.value;
        if (!session) return null;

        const decoded = await decrypt(session);
        if (!decoded?.userId) return null;

        return await prisma.user.findUnique({
            where: { id: String(decoded.userId) },
            include: { permission: true },
        });
    } catch {
        return null;
    }
}

function canViewMessages(user: any) {
    return isAdmin(user) || hasPermission(user, "viewMessages");
}

function canSendMessages(user: any) {
    return isAdmin(user) || hasPermission(user, "addMessages");
}

function canCreateGroup(user: any) {
    return isAdmin(user) || user?.accountType === "MANAGER";
}

// المستخدمون المؤهلون للمشاركة في التواصل الداخلي
function isChatEligibleUser(user: any) {
    if (!user || user.accountType === "AFFILIATE") return false;
    return isAdmin(user) || hasPermission(user, "viewMessages");
}

function serialize(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

async function getMyParticipant(conversationId: string, userId: string) {
    return prisma.chatParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    });
}

async function buildConversationSummary(conversation: any, myUserId: string) {
    const myParticipant = Array.isArray(conversation.participants)
        ? conversation.participants.find((p: any) => p.userId === myUserId)
        : null;

    const lastMessage = Array.isArray(conversation.messages) ? conversation.messages[0] : null;
    const unreadCount = myParticipant
        ? await prisma.chatMessage.count({
            where: {
                conversationId: conversation.id,
                senderId: { not: myUserId },
                createdAt: { gt: myParticipant.lastReadAt },
            },
        })
        : 0;

    let title = conversation.name || "محادثة";
    let subtitle = conversation.department || "";
    let peer: any = null;

    if (conversation.type === CHAT_DIRECT) {
        peer = conversation.participants?.find((p: any) => p.userId !== myUserId)?.user || null;
        title = peer?.username || "مستخدم محذوف";
        subtitle = peer?.jobTitle || (peer?.accountType === "MANAGER" ? "مدير" : peer?.accountType === "ADMIN" ? "مدير النظام" : "موظف");
    } else {
        subtitle = subtitle
            ? `${subtitle} • ${conversation.participants?.length || 0} أعضاء`
            : `${conversation.participants?.length || 0} أعضاء`;
    }

    return {
        id: conversation.id,
        type: conversation.type,
        title,
        subtitle,
        peer,
        department: conversation.department || null,
        isGroup: conversation.type === CHAT_GROUP,
        memberCount: conversation.participants?.length || 0,
        unreadCount,
        lastMessageAt: conversation.lastMessageAt,
        lastMessage: lastMessage
            ? {
                type: lastMessage.type,
                content: lastMessage.content,
                fileName: lastMessage.fileName || null,
                senderName: lastMessage.sender?.username || "مستخدم محذوف",
                createdAt: lastMessage.createdAt,
            }
            : null,
    };
}

// البيانات الأولية للصفحة: محادثاتي + جهات الاتصال المتاحة
export async function getChatBootstrap() {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser || !canViewMessages(currentUser)) {
            return { success: false, error: "لا تملك صلاحية استخدام مركز التواصل" };
        }

        const conversations = await prisma.chatConversation.findMany({
            where: { participants: { some: { userId: currentUser.id } } },
            orderBy: { lastMessageAt: 'desc' },
            include: {
                participants: { include: { user: { select: userSelect } } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { sender: { select: userSelect } },
                },
            },
        });

        const conversationSummaries = await Promise.all(
            conversations.map((conversation) => buildConversationSummary(conversation, currentUser.id))
        );

        const allUsers = await prisma.user.findMany({
            select: { ...userSelect, permission: true },
            orderBy: { username: 'asc' },
        });

        const contacts = allUsers
            .filter((user) => user.id !== currentUser.id && isChatEligibleUser(user))
            .map((user) => ({
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                jobTitle: user.jobTitle,
                accountType: user.accountType,
            }));

        return {
            success: true,
            data: {
                me: { id: currentUser.id, username: currentUser.username, avatar: currentUser.avatar },
                canSend: canSendMessages(currentUser),
                canCreateGroup: canCreateGroup(currentUser),
                conversations: serialize(conversationSummaries),
                contacts: serialize(contacts),
            },
        };
    } catch (error: any) {
        return { success: false, error: error?.message || "تعذر تحميل بيانات التواصل" };
    }
}

// محادثة فردية: إرجاع الموجودة أو إنشاء جديدة
export async function getOrCreateDirectConversation(targetUserId: string) {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser || !canSendMessages(currentUser)) {
            return { success: false, error: "لا تملك صلاحية إنشاء محادثة" };
        }

        const target = await prisma.user.findUnique({
            where: { id: String(targetUserId || '') },
            include: { permission: true },
        });

        if (!target || target.id === currentUser.id || !isChatEligibleUser(target)) {
            return { success: false, error: "لا يمكن التواصل مع هذا المستخدم" };
        }

        const existing = await prisma.chatConversation.findFirst({
            where: {
                type: CHAT_DIRECT,
                AND: [
                    { participants: { some: { userId: currentUser.id } } },
                    { participants: { some: { userId: target.id } } },
                ],
            },
        });

        if (existing) {
            return { success: true, conversationId: existing.id };
        }

        const conversation = await prisma.chatConversation.create({
            data: {
                type: CHAT_DIRECT,
                createdById: currentUser.id,
                participants: {
                    create: [
                        { userId: currentUser.id, role: "ADMIN" },
                        { userId: target.id, role: "ADMIN" },
                    ],
                },
            },
        });

        return { success: true, conversationId: conversation.id };
    } catch (error: any) {
        return { success: false, error: error?.message || "تعذر إنشاء المحادثة" };
    }
}

// مجموعة جديدة حسب القسم — للمدراء ومدير النظام
export async function createGroupConversation(name: string, department: string, memberIds: string[]) {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser || !canCreateGroup(currentUser)) {
            return { success: false, error: "إنشاء المجموعات متاح للمدراء ومدير النظام فقط" };
        }

        const trimmedName = String(name || '').trim();
        if (!trimmedName) {
            return { success: false, error: "يرجى إدخال اسم المجموعة" };
        }

        const uniqueIds = Array.from(new Set((Array.isArray(memberIds) ? memberIds : []).map(String).filter(Boolean)));
        const otherIds = uniqueIds.filter((id) => id !== currentUser.id);

        if (otherIds.length === 0) {
            return { success: false, error: "اختر عضواً واحداً على الأقل للمجموعة" };
        }

        const members = await prisma.user.findMany({
            where: { id: { in: otherIds } },
            include: { permission: true },
        });

        const eligibleMembers = members.filter(isChatEligibleUser).map((user) => user.id);
        if (eligibleMembers.length === 0) {
            return { success: false, error: "لا يوجد أعضاء مؤهلون للانضمام" };
        }

        const conversation = await prisma.chatConversation.create({
            data: {
                type: CHAT_GROUP,
                name: trimmedName,
                department: String(department || '').trim() || null,
                createdById: currentUser.id,
                participants: {
                    create: [
                        { userId: currentUser.id, role: "ADMIN" },
                        ...eligibleMembers.map((userId) => ({ userId, role: "MEMBER" })),
                    ],
                },
            },
        });

        return { success: true, conversationId: conversation.id };
    } catch (error: any) {
        return { success: false, error: error?.message || "تعذر إنشاء المجموعة" };
    }
}

// رسائل محادثة + البحث داخلها
export async function getChatMessages(conversationId: string, search?: string) {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser || !canViewMessages(currentUser)) {
            return { success: false, error: "لا تملك صلاحية عرض الرسائل" };
        }

        const participant = await getMyParticipant(conversationId, currentUser.id);
        if (!participant) {
            return { success: false, error: "أنت لست عضواً في هذه المحادثة" };
        }

        const query = String(search || '').trim();
        const messages = await prisma.chatMessage.findMany({
            where: {
                conversationId,
                ...(query ? { content: { contains: query, mode: 'insensitive' } } : {}),
            },
            orderBy: { createdAt: 'asc' },
            take: MESSAGES_PAGE_SIZE,
            include: { sender: { select: userSelect } },
        });

        return { success: true, data: serialize(messages) };
    } catch (error: any) {
        return { success: false, error: error?.message || "تعذر تحميل الرسائل" };
    }
}

// إرسال رسالة نصية أو بصورة/ملف مرفق
export async function sendChatMessage(
    conversationId: string,
    content: string,
    attachment?: { url: string; fileName: string; fileSize: number; mimeType: string } | null
) {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser || !canSendMessages(currentUser)) {
            return { success: false, error: "لا تملك صلاحية إرسال الرسائل" };
        }

        const participant = await getMyParticipant(conversationId, currentUser.id);
        if (!participant) {
            return { success: false, error: "أنت لست عضواً في هذه المحادثة" };
        }

        const text = String(content || '').trim();
        const hasAttachment = Boolean(attachment?.url);

        if (!text && !hasAttachment) {
            return { success: false, error: "الرسالة فارغة" };
        }

        const type = hasAttachment
            ? (String(attachment?.mimeType || '').startsWith('image/') ? "IMAGE" : "FILE")
            : "TEXT";

        const [message] = await prisma.$transaction([
            prisma.chatMessage.create({
                data: {
                    conversationId,
                    senderId: currentUser.id,
                    type,
                    content: text,
                    fileUrl: attachment?.url || null,
                    fileName: attachment?.fileName || null,
                    fileSize: attachment?.fileSize ?? null,
                    mimeType: attachment?.mimeType || null,
                },
                include: { sender: { select: userSelect } },
            }),
            prisma.chatConversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() },
            }),
            prisma.chatParticipant.update({
                where: { id: participant.id },
                data: { lastReadAt: new Date() },
            }),
        ]);

        return { success: true, data: serialize(message) };
    } catch (error: any) {
        return { success: false, error: error?.message || "تعذر إرسال الرسالة" };
    }
}

// تعليم المحادثة كمقروءة
export async function markConversationRead(conversationId: string) {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser) return { success: false };

        const participant = await getMyParticipant(conversationId, currentUser.id);
        if (!participant) return { success: false };

        await prisma.chatParticipant.update({
            where: { id: participant.id },
            data: { lastReadAt: new Date() },
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || "تعذر تحديث حالة القراءة" };
    }
}

// رفع مرفق (صورة/ملف) إلى Vercel Blob
export async function uploadChatAttachment(formData: FormData) {
    try {
        const currentUser = await getCurrentSessionUser();
        if (!currentUser || !canSendMessages(currentUser)) {
            return { success: false, error: "لا تملك صلاحية إرفاق الملفات" };
        }

        const file = formData.get('file');
        if (!(file instanceof File) || file.size === 0) {
            return { success: false, error: "الملف غير صالح" };
        }

        if (file.size > MAX_ATTACHMENT_BYTES) {
            return { success: false, error: "حجم الملف يتجاوز الحد الأقصى (25MB)" };
        }

        const safeName = String(file.name || 'file').replace(/[^\w.\-]/g, '_');
        const blob = await put(`chat/${Date.now()}-${safeName}`, file, { access: 'public' });

        return {
            success: true,
            data: {
                url: blob.url,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
            },
        };
    } catch (error: any) {
        return { success: false, error: error?.message || "تعذر رفع الملف" };
    }
}

// مجموعة عناوين المحادثات لجهة الاستعلام (تُستخدم أيضاً من مسار الاستطلاع)
export async function getChatUnreadSnapshot() {
    const currentUser = await getCurrentSessionUser();
    if (!currentUser || !canViewMessages(currentUser)) return null;

    const conversations = await prisma.chatConversation.findMany({
        where: { participants: { some: { userId: currentUser.id } } },
        select: {
            id: true,
            lastMessageAt: true,
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                    type: true,
                    content: true,
                    fileName: true,
                    createdAt: true,
                    sender: { select: { username: true } },
                },
            },
        },
    });

    const myParticipations = await prisma.chatParticipant.findMany({
        where: { userId: currentUser.id },
    });
    const readMap = new Map(myParticipations.map((p) => [p.conversationId, p.lastReadAt]));

    let unreadTotal = 0;
    const items = await Promise.all(conversations.map(async (conversation) => {
        const lastReadAt = readMap.get(conversation.id) || new Date(0);
        const unread = await prisma.chatMessage.count({
            where: {
                conversationId: conversation.id,
                senderId: { not: currentUser.id },
                createdAt: { gt: lastReadAt },
            },
        });
        unreadTotal += unread;
        const last = conversation.messages[0];
        return {
            id: conversation.id,
            unread,
            lastMessageAt: conversation.lastMessageAt,
            lastMessage: last
                ? {
                    type: last.type,
                    content: last.content,
                    fileName: last.fileName || null,
                    senderName: last.sender?.username || "مستخدم محذوف",
                    createdAt: last.createdAt,
                }
                : null,
        };
    }));

    return { unreadTotal, conversations: serialize(items) };
}
