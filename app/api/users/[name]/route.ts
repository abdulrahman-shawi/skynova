// import { encrypt } from "@/lib/auth";
// import { prisma } from "@/lib/prisma";
// import { cookies } from "next/headers";
// import bcrypt from "bcrypt";
// export async function GET(request: Request, { params }: { params: { email: string } }) {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { email: params.email },
//       include: {
//         permission: true, // جلب بيانات الصلاحيات المرتبطة بالمستخدم
//       },
//     });
//     // 2. التحقق من وجود المستخدم ومطابقة كلمة المرور المشفرة
//       if (!user || !(await bcrypt.compare(data.password, user.password))) { //
//         return { error: "خطأ في اسم المستخدم أو كلمة المرور" };
//       }
    
//       // 3. إكمال إجراءات الجلسة (JWT & Cookies)
//       const expires = new Date(Date.now() + 30 * 60 * 60 * 1000);
//       const session = await encrypt({ userId: user.id, username: user.username, email: user.email, expires });
//       cookies().set("skynova", session, { expires, httpOnly: true });
//     return new Response(JSON.stringify({ success: true, data: user }), { status: 200 });
//     } catch (error) {   
//     console.error("Prisma Error:", error);
//     return new Response(JSON.stringify({ success: false, error: "فشل في جلب بيانات المستخدم" }), { status: 500 });
//   }
// }

// export async function PUT(request: Request, { params }: { params: { id: string } }) {
//     try {
//     const data = await request.json();
//     const updateData: any = {
//       username: data.username,
//         email: data.email,
//         phone: data.phone || null,
//         jobTitle: data.jobTitle,
//         accountType: data.accountType,
//         permission: {
//           connect: { id: data.permissions }
//         }
//     };
//     // تحديث كلمة المرور فقط إذا تم توفير واحدة جديدة
//     if (data.password) {
//       const bcrypt = await import("bcrypt");
//       updateData.password = await bcrypt.hash(data.password, 10); //
//     }
//     const user = await prisma.user.update({
//       where: { id: params.id },
//       data: updateData,
//     });
//     return new Response(JSON.stringify({ success: true, data: user }), { status: 200 });
//   } catch (error: any) {
//     console.error("Prisma Error:", error);
//     return new Response(JSON.stringify({ success: false, error: "فشل في تحديث بيانات المستخدم" }), { status: 500 });
//   }
// }

// export async function DELETE(request: Request, { params }: { params: { id: string } }) {
//   try {
//     await prisma.user.delete({ where: { id: params.id } });
//     return new Response(JSON.stringify({ success: true }), { status: 200 });
//   } catch (error) {
//     return new Response(JSON.stringify({ success: false, error: "فشل في حذف المستخدم" }), { status: 500 });
//   }
// }   