"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.notification.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.brand.deleteMany();
    await prisma.vendorCategoryAttribute.deleteMany();
    await prisma.categoryAttribute.deleteMany();
    await prisma.category.deleteMany();
    await prisma.otpStore.deleteMany();
    await prisma.user.deleteMany();
    const admin = await prisma.user.create({
        data: {
            phone: '9999900000',
            name: 'Admin User',
            role: client_1.Role.ADMIN,
            businessName: 'GarmentHub Admin',
        },
    });
    const vendor1 = await prisma.user.create({
        data: {
            phone: '9999900001',
            name: 'Rajesh Textiles',
            role: client_1.Role.VENDOR,
            businessName: 'Rajesh Textiles Pvt Ltd',
            address: '123 Textile Market, Surat',
        },
    });
    const vendor2 = await prisma.user.create({
        data: {
            phone: '9999900002',
            name: 'Priya Fabrics',
            role: client_1.Role.VENDOR,
            businessName: 'Priya Fabrics & Co',
            address: '456 Cloth Lane, Mumbai',
        },
    });
    const customer1 = await prisma.user.create({
        data: {
            phone: '9999900003',
            name: 'Amit Kumar',
            role: client_1.Role.CUSTOMER,
            businessName: 'Amit Fashion Store',
            address: '789 Market Road, Delhi',
        },
    });
    const customer2 = await prisma.user.create({
        data: {
            phone: '9999900004',
            name: 'Sneha Retail',
            role: client_1.Role.CUSTOMER,
            businessName: 'Sneha Retail Outlet',
            address: '321 Shop Street, Bangalore',
        },
    });
    // Brands for vendor1
    const v1BrandPremium = await prisma.brand.create({ data: { vendorId: vendor1.id, name: 'Rajesh Premium' } });
    const v1BrandEconomy = await prisma.brand.create({ data: { vendorId: vendor1.id, name: 'Rajesh Economy' } });
    const v1BrandHeritage = await prisma.brand.create({ data: { vendorId: vendor1.id, name: 'Heritage Weaves' } });
    // Brands for vendor2
    const v2BrandElite = await prisma.brand.create({ data: { vendorId: vendor2.id, name: 'Priya Elite' } });
    const v2BrandBasics = await prisma.brand.create({ data: { vendorId: vendor2.id, name: 'Priya Basics' } });
    const categories = await Promise.all(['Shirts', 'Sarees', 'Kurtas', 'Fabric', 'Trousers', 'Dresses'].map((name) => prisma.category.create({ data: { name } })));
    const catMap = {};
    categories.forEach((c) => (catMap[c.name] = c.id));
    const defaultAttrRows = [];
    for (const name of ['Shirts', 'Sarees', 'Kurtas', 'Trousers', 'Dresses']) {
        defaultAttrRows.push({ categoryId: catMap[name], name: 'Fabric', sortOrder: 0 }, { categoryId: catMap[name], name: 'Pattern', sortOrder: 1 }, { categoryId: catMap[name], name: 'Color', sortOrder: 2 });
    }
    for (const name of ['Fabric']) {
        defaultAttrRows.push({ categoryId: catMap[name], name: 'Width', sortOrder: 3 }, { categoryId: catMap[name], name: 'GSM', sortOrder: 4 });
    }
    await prisma.categoryAttribute.createMany({ data: defaultAttrRows });
    await prisma.vendorCategoryAttribute.createMany({
        data: [
            { vendorId: vendor1.id, categoryId: catMap['Shirts'], name: 'Fit', sortOrder: 0 },
            { vendorId: vendor2.id, categoryId: catMap['Dresses'], name: 'Occasion', sortOrder: 0 },
        ],
    });
    const productData = [
        { name: 'Premium Cotton Shirt', vendorId: vendor1.id, brandId: v1BrandPremium.id, categoryId: catMap['Shirts'], pattern: 'Solid', fabric: 'Cotton', color: 'White', price: 450, moq: 50, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400'] },
        { name: 'Linen Casual Shirt', vendorId: vendor1.id, brandId: v1BrandPremium.id, categoryId: catMap['Shirts'], pattern: 'Striped', fabric: 'Linen', color: 'Blue', price: 550, moq: 30, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400'] },
        { name: 'Silk Banarasi Saree', vendorId: vendor1.id, brandId: v1BrandHeritage.id, categoryId: catMap['Sarees'], pattern: 'Woven', fabric: 'Silk', color: 'Red', price: 2500, moq: 10, images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400'] },
        { name: 'Chiffon Printed Saree', vendorId: vendor1.id, brandId: v1BrandHeritage.id, categoryId: catMap['Sarees'], pattern: 'Printed', fabric: 'Chiffon', color: 'Pink', price: 800, moq: 20, images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400'] },
        { name: 'Cotton Kurta Set', vendorId: vendor1.id, brandId: v1BrandEconomy.id, categoryId: catMap['Kurtas'], pattern: 'Embroidered', fabric: 'Cotton', color: 'Green', price: 650, moq: 25, images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400'] },
        { name: 'Rayon Printed Kurta', vendorId: vendor2.id, brandId: v2BrandBasics.id, categoryId: catMap['Kurtas'], pattern: 'Printed', fabric: 'Rayon', color: 'Yellow', price: 350, moq: 40, images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400'] },
        { name: 'Raw Silk Fabric', vendorId: vendor2.id, brandId: v2BrandElite.id, categoryId: catMap['Fabric'], pattern: 'Plain', fabric: 'Silk', color: 'Gold', price: 300, moq: 100, images: ['https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400'] },
        { name: 'Cotton Poplin Fabric', vendorId: vendor2.id, brandId: v2BrandBasics.id, categoryId: catMap['Fabric'], pattern: 'Solid', fabric: 'Cotton', color: 'White', price: 120, moq: 200, images: ['https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400'] },
        { name: 'Denim Fabric Roll', vendorId: vendor2.id, brandId: v2BrandBasics.id, categoryId: catMap['Fabric'], pattern: 'Solid', fabric: 'Denim', color: 'Indigo', price: 250, moq: 100, images: ['https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400'] },
        { name: 'Formal Trouser Fabric', vendorId: vendor1.id, brandId: v1BrandPremium.id, categoryId: catMap['Trousers'], pattern: 'Solid', fabric: 'Polyester', color: 'Black', price: 380, moq: 50, images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400'] },
        { name: 'Casual Chinos', vendorId: vendor2.id, brandId: v2BrandElite.id, categoryId: catMap['Trousers'], pattern: 'Solid', fabric: 'Cotton', color: 'Khaki', price: 420, moq: 30, images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400'] },
        { name: 'Georgette Party Dress', vendorId: vendor2.id, brandId: v2BrandElite.id, categoryId: catMap['Dresses'], pattern: 'Printed', fabric: 'Georgette', color: 'Maroon', price: 900, moq: 15, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400'] },
        { name: 'Crepe A-Line Dress', vendorId: vendor2.id, brandId: v2BrandElite.id, categoryId: catMap['Dresses'], pattern: 'Solid', fabric: 'Crepe', color: 'Navy', price: 750, moq: 20, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400'] },
        { name: 'Check Shirt Bulk', vendorId: vendor1.id, brandId: v1BrandEconomy.id, categoryId: catMap['Shirts'], pattern: 'Check', fabric: 'Cotton', color: 'Multi', price: 380, moq: 100, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400'] },
        { name: 'Tussar Silk Saree', vendorId: vendor2.id, brandId: v2BrandElite.id, categoryId: catMap['Sarees'], pattern: 'Woven', fabric: 'Tussar Silk', color: 'Beige', price: 1800, moq: 10, images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400'] },
    ];
    const products = await Promise.all(productData.map((p) => prisma.product.create({ data: { ...p, status: client_1.ProductStatus.ACTIVE } })));
    const order1 = await prisma.order.create({
        data: {
            customerId: customer1.id,
            status: client_1.OrderStatus.PENDING,
            items: {
                create: [
                    { productId: products[0].id, vendorId: vendor1.id, requestedQty: 100, status: client_1.ItemStatus.PENDING },
                    { productId: products[6].id, vendorId: vendor2.id, requestedQty: 200, status: client_1.ItemStatus.PENDING },
                ],
            },
        },
    });
    const order2 = await prisma.order.create({
        data: {
            customerId: customer1.id,
            status: client_1.OrderStatus.PARTIALLY_ACCEPTED,
            items: {
                create: [
                    { productId: products[1].id, vendorId: vendor1.id, requestedQty: 50, acceptedQty: 50, status: client_1.ItemStatus.ACCEPTED, respondedAt: new Date() },
                    { productId: products[7].id, vendorId: vendor2.id, requestedQty: 300, acceptedQty: 200, status: client_1.ItemStatus.ALTERED, vendorNote: 'Can only supply 200 units at this time', respondedAt: new Date() },
                ],
            },
        },
    });
    const order3 = await prisma.order.create({
        data: {
            customerId: customer2.id,
            status: client_1.OrderStatus.ACCEPTED,
            items: {
                create: [
                    { productId: products[2].id, vendorId: vendor1.id, requestedQty: 20, acceptedQty: 20, status: client_1.ItemStatus.ACCEPTED, respondedAt: new Date() },
                ],
            },
        },
    });
    await prisma.notification.createMany({
        data: [
            { userId: vendor1.id, type: 'ORDER_PLACED', title: 'New Order Received', body: 'You have a new order request', referenceId: order1.id },
            { userId: vendor2.id, type: 'ORDER_PLACED', title: 'New Order Received', body: 'You have a new order request', referenceId: order1.id },
            { userId: customer1.id, type: 'VENDOR_RESPONSE', title: 'Vendor Responded', body: 'A vendor has responded to your order', referenceId: order2.id },
        ],
    });
    console.log('Seed completed successfully');
    console.log(`Users: admin(${admin.phone}), vendor1(${vendor1.phone}), vendor2(${vendor2.phone}), customer1(${customer1.phone}), customer2(${customer2.phone})`);
    console.log(`Brands: Vendor1(${v1BrandPremium.name}, ${v1BrandEconomy.name}, ${v1BrandHeritage.name}), Vendor2(${v2BrandElite.name}, ${v2BrandBasics.name})`);
    console.log(`Products: ${products.length}`);
    console.log(`Orders: 3`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map