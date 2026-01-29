'use server';

import { decrypt, encrypt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";


export async function getalluser() {
  const user = await prisma.user.findMany({});
  return user;
}   


export async function getMe() {
  try {
    const session = cookies().get("skynova")?.value;
    if (!session) return null;

    const decoded = await decrypt(session);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, accountType: true },
    });

    return user;
  } catch (err) {
    return null;
  }
}

export async function login(data: { name: string; password: string; }) {
  // 1. التحقق من المستخدم
  const user = await prisma.user.findFirst({
    where: { username: data.name, password: data.password },
  });

  if (!user) return { error: "خطأ في اسم المستخدم أو كلمة المرور" };

  // 2. إنشاء التوكن (JWT)
  const expires = new Date(Date.now() + 30 * 60 * 60 * 1000); // ساعتان
  const session = await encrypt({ userId: user.id, username: user.username, email: user.email, expires });

  // 3. حفظ التوكن في الكوكيز
  cookies().set("skynova", session, { expires, httpOnly: true });

  return { success: true };
}

export async function createuser(name: string, password: string) {
  const user = await prisma.user.create({
    data: {
      username: name,
      email: `${name}@gmail.com`,
      password: password,
    },
  });
  return user;
}