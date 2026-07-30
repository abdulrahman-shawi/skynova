import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ExportPayload = {
  version: string;
  exportedAt: string;
  data: {
    permissions: any[];
    users: any[];
    categories: any[];
    products: any[];
    productImages: any[];
    warehouses: any[];
    productStocks: any[];
    stockMovements: any[];
    userTargets: any[];
    userActivityTargets: any[];
    targetProducts: any[];
    trackingCompanies: any[];
    generalSettings: any[];
    customers: any[];
    customerUserLinks: Array<{ customerId: string; userId: string }>;
    permissionWarehouseLinks: Array<{ permissionId: string; warehouseId: number }>;
    messages: any[];
    orders: any[];
    orderItems: any[];
    shippings: any[];
    expenses: any[];
    employeeSalaryAdjustments: any[];
    warranties: any[];
    wholesaleCustomers: any[];
    wholesaleVisits: any[];
    productWholesalePriceTiers: any[];
    wholesaleOrders: any[];
    wholesaleOrderItems: any[];
    adPageVisits: any[];
    productLandingPages: any[];
    reviews: any[];
    pages: any[];
    heroSlides: any[];
    affiliateLinks: any[];
    offers: any[];
    offerDiscounts: any[];
    commissions: any[];
    affiliateWalletTransfers: any[];
  };
};

const toArray = (value: unknown): any[] => (Array.isArray(value) ? value : []);

async function resetSerialSequence(tx: any, tableName: string) {
  await tx.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), true);`
  );
}

export async function GET() {
  try {
    const [
      permissions,
      users,
      categories,
      products,
      productImages,
      warehouses,
      productStocks,
      stockMovements,
      userTargets,
      userActivityTargets,
      targetProducts,
      trackingCompanies,
      generalSettings,
      customers,
      messages,
      orders,
      orderItems,
      shippings,
      expenses,
      employeeSalaryAdjustments,
      warranties,
      wholesaleCustomers,
      wholesaleVisits,
      productWholesalePriceTiers,
      wholesaleOrders,
      wholesaleOrderItems,
      adPageVisits,
      productLandingPages,
      reviews,
      pages,
      heroSlides,
      affiliateLinks,
      offers,
      offerDiscounts,
      commissions,
      affiliateWalletTransfers,
      customerLinkRows,
      permissionLinkRows,
    ] = await Promise.all([
      prisma.permission.findMany(),
      prisma.user.findMany(),
      prisma.category.findMany(),
      prisma.product.findMany(),
      prisma.productImage.findMany(),
      prisma.warehouse.findMany(),
      prisma.productStock.findMany(),
      prisma.stockMovement.findMany(),
      prisma.userTarget.findMany(),
      prisma.userActivityTarget.findMany(),
      prisma.targetProduct.findMany(),
      prisma.trakingCompany.findMany(),
      prisma.generalSetting.findMany(),
      prisma.customer.findMany(),
      prisma.message.findMany(),
      prisma.order.findMany(),
      prisma.orderItem.findMany(),
      prisma.shipping.findMany(),
      prisma.expense.findMany(),
      prisma.employeeSalaryAdjustment.findMany(),
      prisma.warranty.findMany(),
      prisma.wholesaleCustomer.findMany(),
      prisma.wholesaleVisit.findMany(),
      prisma.productWholesalePriceTier.findMany(),
      prisma.wholesaleOrder.findMany(),
      prisma.wholesaleOrderItem.findMany(),
      prisma.adPageVisit.findMany(),
      prisma.productLandingPage.findMany(),
      prisma.review.findMany(),
      prisma.page.findMany(),
      prisma.heroSlide.findMany(),
      prisma.affiliateLink.findMany(),
      prisma.offer.findMany(),
      prisma.offerDiscount.findMany(),
      prisma.commission.findMany(),
      prisma.affiliateWalletTransfer.findMany(),
      prisma.customer.findMany({
        select: {
          id: true,
          users: { select: { id: true } },
        },
      }),
      prisma.permission.findMany({
        select: {
          id: true,
          allowedWarehouses: { select: { id: true } },
        },
      }),
    ]);

    const customerUserLinks = customerLinkRows.flatMap((row) =>
      row.users.map((user) => ({ customerId: row.id, userId: user.id }))
    );

    const permissionWarehouseLinks = permissionLinkRows.flatMap((row) =>
      row.allowedWarehouses.map((warehouse) => ({ permissionId: row.id, warehouseId: warehouse.id }))
    );

    const payload: ExportPayload = {
      version: "1.1.0",
      exportedAt: new Date().toISOString(),
      data: {
        permissions,
        users,
        categories,
        products,
        productImages,
        warehouses,
        productStocks,
        stockMovements,
        userTargets,
        userActivityTargets,
        targetProducts,
        trackingCompanies,
        generalSettings,
        customers,
        customerUserLinks,
        permissionWarehouseLinks,
        messages,
        orders,
        orderItems,
        shippings,
        expenses,
        employeeSalaryAdjustments,
        warranties,
        wholesaleCustomers,
        wholesaleVisits,
        productWholesalePriceTiers,
        wholesaleOrders,
        wholesaleOrderItems,
        adPageVisits,
        productLandingPages,
        reviews,
        pages,
        heroSlides,
        affiliateLinks,
        offers,
        offerDiscounts,
        commissions,
        affiliateWalletTransfers,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Data export failed:", error);
    return NextResponse.json({ success: false, error: "فشل في تصدير البيانات" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const replaceExisting = String(formData.get("replace") ?? "true") !== "false";

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "ملف الاستيراد غير صالح" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = JSON.parse(text);
    const data = parsed?.data ?? parsed;

    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        // حذف الجداول التابعة أولاً ثم الجداول الأساسية (ترتيب يحترم العلاقات)
        await tx.commission.deleteMany();
        await tx.orderItem.deleteMany();
        await tx.order.deleteMany();

        await tx.wholesaleOrderItem.deleteMany();
        await tx.wholesaleOrder.deleteMany();
        await tx.wholesaleVisit.deleteMany();
        await tx.wholesaleCustomer.deleteMany();
        await tx.productWholesalePriceTier.deleteMany();

        await tx.warranty.deleteMany();
        await tx.message.deleteMany();
        await tx.adPageVisit.deleteMany();
        await tx.review.deleteMany();
        await tx.productLandingPage.deleteMany();

        await tx.targetProduct.deleteMany();
        await tx.userTarget.deleteMany();
        await tx.userActivityTarget.deleteMany();

        await tx.stockMovement.deleteMany();
        await tx.productImage.deleteMany();
        await tx.productStock.deleteMany();

        await tx.offerDiscount.deleteMany();
        await tx.affiliateLink.deleteMany();

        await tx.expense.deleteMany();
        await tx.employeeSalaryAdjustment.deleteMany();
        await tx.affiliateWalletTransfer.deleteMany();

        await tx.product.deleteMany();
        await tx.category.deleteMany();

        await tx.offer.deleteMany();
        await tx.page.deleteMany();
        await tx.heroSlide.deleteMany();

        await tx.shipping.deleteMany();
        await tx.trakingCompany.deleteMany();
        await tx.generalSetting.deleteMany();
        await tx.warehouse.deleteMany();

        await tx.customer.deleteMany();
        await tx.user.deleteMany();
        await tx.permission.deleteMany();
      }

      const permissions = toArray(data?.permissions);
      const users = toArray(data?.users);
      const categories = toArray(data?.categories);
      const products = toArray(data?.products);
      const productImages = toArray(data?.productImages);
      const warehouses = toArray(data?.warehouses);
      const productStocks = toArray(data?.productStocks);
      const stockMovements = toArray(data?.stockMovements);
      const userTargets = toArray(data?.userTargets);
      const userActivityTargets = toArray(data?.userActivityTargets);
      const targetProducts = toArray(data?.targetProducts);
      const trackingCompanies = toArray(data?.trackingCompanies);
      const generalSettings = toArray(data?.generalSettings);
      const customers = toArray(data?.customers);
      const customerUserLinks = toArray(data?.customerUserLinks);
      const permissionWarehouseLinks = toArray(data?.permissionWarehouseLinks);
      const messages = toArray(data?.messages);
      const orders = toArray(data?.orders);
      const orderItems = toArray(data?.orderItems);
      const shippings = toArray(data?.shippings);
      const expenses = toArray(data?.expenses);
      const employeeSalaryAdjustments = toArray(data?.employeeSalaryAdjustments);
      const warranties = toArray(data?.warranties);
      const wholesaleCustomers = toArray(data?.wholesaleCustomers);
      const wholesaleVisits = toArray(data?.wholesaleVisits);
      const productWholesalePriceTiers = toArray(data?.productWholesalePriceTiers);
      const wholesaleOrders = toArray(data?.wholesaleOrders);
      const wholesaleOrderItems = toArray(data?.wholesaleOrderItems);
      const adPageVisits = toArray(data?.adPageVisits);
      const productLandingPages = toArray(data?.productLandingPages);
      const reviews = toArray(data?.reviews);
      const pages = toArray(data?.pages);
      const heroSlides = toArray(data?.heroSlides);
      const affiliateLinks = toArray(data?.affiliateLinks);
      const offers = toArray(data?.offers);
      const offerDiscounts = toArray(data?.offerDiscounts);
      const commissions = toArray(data?.commissions);
      const affiliateWalletTransfers = toArray(data?.affiliateWalletTransfers);

      // إدخال الجداول الأساسية أولاً ثم التابعة (ترتيب يحترم العلاقات)
      if (permissions.length) await tx.permission.createMany({ data: permissions, skipDuplicates: true });
      if (users.length) await tx.user.createMany({ data: users, skipDuplicates: true });

      if (categories.length) await tx.category.createMany({ data: categories, skipDuplicates: true });
      if (products.length) await tx.product.createMany({ data: products, skipDuplicates: true });
      if (productImages.length) await tx.productImage.createMany({ data: productImages, skipDuplicates: true });

      if (warehouses.length) await tx.warehouse.createMany({ data: warehouses, skipDuplicates: true });

      for (const link of permissionWarehouseLinks) {
        const permissionId = String(link?.permissionId || "");
        const warehouseId = Number(link?.warehouseId);
        if (!permissionId || !Number.isFinite(warehouseId)) continue;

        await tx.permission.update({
          where: { id: permissionId },
          data: { allowedWarehouses: { connect: { id: warehouseId } } },
        });
      }

      if (productStocks.length) await tx.productStock.createMany({ data: productStocks, skipDuplicates: true });
      if (stockMovements.length) await tx.stockMovement.createMany({ data: stockMovements, skipDuplicates: true });

      if (userTargets.length) await tx.userTarget.createMany({ data: userTargets, skipDuplicates: true });
      if (targetProducts.length) await tx.targetProduct.createMany({ data: targetProducts, skipDuplicates: true });
      if (userActivityTargets.length) await tx.userActivityTarget.createMany({ data: userActivityTargets, skipDuplicates: true });

      if (trackingCompanies.length) await tx.trakingCompany.createMany({ data: trackingCompanies, skipDuplicates: true });
      if (generalSettings.length) await tx.generalSetting.createMany({ data: generalSettings, skipDuplicates: true });
      if (shippings.length) await tx.shipping.createMany({ data: shippings, skipDuplicates: true });

      if (customers.length) await tx.customer.createMany({ data: customers, skipDuplicates: true });

      for (const link of customerUserLinks) {
        const customerId = String(link?.customerId || "");
        const userId = String(link?.userId || "");
        if (!customerId || !userId) continue;

        await tx.customer.update({
          where: { id: customerId },
          data: { users: { connect: { id: userId } } },
        });
      }

      if (messages.length) await tx.message.createMany({ data: messages, skipDuplicates: true });

      if (affiliateLinks.length) await tx.affiliateLink.createMany({ data: affiliateLinks, skipDuplicates: true });

      if (orders.length) await tx.order.createMany({ data: orders, skipDuplicates: true });
      if (orderItems.length) await tx.orderItem.createMany({ data: orderItems, skipDuplicates: true });
      if (commissions.length) await tx.commission.createMany({ data: commissions, skipDuplicates: true });

      if (warranties.length) await tx.warranty.createMany({ data: warranties, skipDuplicates: true });
      if (expenses.length) await tx.expense.createMany({ data: expenses, skipDuplicates: true });
      if (employeeSalaryAdjustments.length) await tx.employeeSalaryAdjustment.createMany({ data: employeeSalaryAdjustments, skipDuplicates: true });
      if (affiliateWalletTransfers.length) await tx.affiliateWalletTransfer.createMany({ data: affiliateWalletTransfers, skipDuplicates: true });

      if (wholesaleCustomers.length) await tx.wholesaleCustomer.createMany({ data: wholesaleCustomers, skipDuplicates: true });
      if (wholesaleVisits.length) await tx.wholesaleVisit.createMany({ data: wholesaleVisits, skipDuplicates: true });
      if (productWholesalePriceTiers.length) await tx.productWholesalePriceTier.createMany({ data: productWholesalePriceTiers, skipDuplicates: true });
      if (wholesaleOrders.length) await tx.wholesaleOrder.createMany({ data: wholesaleOrders, skipDuplicates: true });
      if (wholesaleOrderItems.length) await tx.wholesaleOrderItem.createMany({ data: wholesaleOrderItems, skipDuplicates: true });

      if (adPageVisits.length) await tx.adPageVisit.createMany({ data: adPageVisits, skipDuplicates: true });
      if (productLandingPages.length) await tx.productLandingPage.createMany({ data: productLandingPages, skipDuplicates: true });
      if (reviews.length) await tx.review.createMany({ data: reviews, skipDuplicates: true });

      if (pages.length) await tx.page.createMany({ data: pages, skipDuplicates: true });
      if (heroSlides.length) await tx.heroSlide.createMany({ data: heroSlides, skipDuplicates: true });
      if (offers.length) await tx.offer.createMany({ data: offers, skipDuplicates: true });
      if (offerDiscounts.length) await tx.offerDiscount.createMany({ data: offerDiscounts, skipDuplicates: true });

      await resetSerialSequence(tx, "Category");
      await resetSerialSequence(tx, "Product");
      await resetSerialSequence(tx, "ProductImage");
      await resetSerialSequence(tx, "Warehouse");
      await resetSerialSequence(tx, "ProductStock");
      await resetSerialSequence(tx, "Order");
      await resetSerialSequence(tx, "OrderItem");
      await resetSerialSequence(tx, "GeneralSetting");
      await resetSerialSequence(tx, "shipping");
      await resetSerialSequence(tx, "Expense");
      await resetSerialSequence(tx, "ProductWholesalePriceTier");
      await resetSerialSequence(tx, "WholesaleOrder");
      await resetSerialSequence(tx, "WholesaleOrderItem");
    });

    return NextResponse.json({ success: true, message: "تم استيراد البيانات بنجاح" });
  } catch (error) {
    console.error("Data import failed:", error);
    return NextResponse.json({ success: false, error: "فشل في استيراد البيانات" }, { status: 500 });
  }
}
