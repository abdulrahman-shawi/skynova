import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const NAME = "الفاتح";

try {
    const existing = await prisma.shipping.findFirst({ where: { name: NAME } });
    if (existing) {
  console.log(`شركة "${NAME}" موجودة مسبقاً (id=${existing.id})، لم يتم تغيير أي شيء.`);
    } else {
        const created = await prisma.shipping.create({
            data: { name: NAME, price: 0 },
        });
        console.log(`تم إنشاء شركة "${NAME}" بنجاح (id=${created.id}).`);
    }
} catch (err) {
    console.error("فشل تنفيذ السكربت:", err.message);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
