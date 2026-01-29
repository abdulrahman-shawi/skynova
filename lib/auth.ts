import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = "secret"; // في الإنتاج استخدم process.env.JWT_SECRET
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // تنتهي الصلاحية بعد 30 يوم
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  return payload;
}