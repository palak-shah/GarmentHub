import { PrismaClient, Role, ProductStatus, OrderStatus, ItemStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.savedProduct.deleteMany();
  await prisma.curatedShare.deleteMany();
  await prisma.userProductState.deleteMany();
  await prisma.connection.deleteMany();
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
      role: Role.ADMIN,
      businessName: 'GarmentHub Admin',
    },
  });

  const vendor1 = await prisma.user.create({
    data: {
      phone: '9999900001',
      name: 'Rajesh Textiles',
      role: Role.VENDOR,
      businessName: 'Rajesh Textiles Pvt Ltd',
      address: '123 Textile Market, Surat',
    },
  });

  const vendor2 = await prisma.user.create({
    data: {
      phone: '9999900002',
      name: 'Priya Fabrics',
      role: Role.VENDOR,
      businessName: 'Priya Fabrics & Co',
      address: '456 Cloth Lane, Mumbai',
    },
  });

  const trader1 = await prisma.user.create({
    data: {
      phone: '9999900005',
      name: 'Vikram Trading',
      role: Role.TRADER,
      businessName: 'Vikram Garment Trading Co',
      address: '55 Trade Center, Ahmedabad',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      phone: '9999900003',
      name: 'Amit Kumar',
      role: Role.CUSTOMER,
      businessName: 'Amit Fashion Store',
      address: '789 Market Road, Delhi',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      phone: '9999900004',
      name: 'Sneha Retail',
      role: Role.CUSTOMER,
      businessName: 'Sneha Retail Outlet',
      address: '321 Shop Street, Bangalore',
    },
  });

  const vendor3 = await prisma.user.create({
    data: {
      phone: '9999900011',
      name: 'Meera Handlooms',
      role: Role.VENDOR,
      businessName: 'Meera Handlooms Studio',
      address: '12 Loom Street, Jaipur',
    },
  });

  const vendor4 = await prisma.user.create({
    data: {
      phone: '9999900012',
      name: 'Southloom Exports',
      role: Role.VENDOR,
      businessName: 'Southloom Exports Pvt Ltd',
      address: '88 Export Zone, Coimbatore',
    },
  });

  const trader2 = await prisma.user.create({
    data: {
      phone: '9999900013',
      name: 'Ananya Sourcing',
      role: Role.TRADER,
      businessName: 'Ananya Garment Sourcing',
      address: '22 Commercial St, Chennai',
    },
  });

  const trader3 = await prisma.user.create({
    data: {
      phone: '9999900014',
      name: 'Rahul Merchants',
      role: Role.TRADER,
      businessName: 'Rahul Textile Merchants',
      address: '9 Ring Road, Indore',
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      phone: '9999900015',
      name: 'Kiran Boutique',
      role: Role.CUSTOMER,
      businessName: 'Kiran Boutique Chain',
      address: '45 Fashion Ave, Hyderabad',
    },
  });

  const customer4 = await prisma.user.create({
    data: {
      phone: '9999900016',
      name: 'Metro Mart',
      role: Role.CUSTOMER,
      businessName: 'Metro Mart Wholesale',
      address: '77 Trade Park, Pune',
    },
  });

  const customer5 = await prisma.user.create({
    data: {
      phone: '9999900017',
      name: 'Lakshmi Stores',
      role: Role.CUSTOMER,
      businessName: 'Lakshmi Department Stores',
      address: '3 High Street, Kochi',
    },
  });

  // Brands for vendor1
  const v1BrandPremium = await prisma.brand.create({ data: { vendorId: vendor1.id, name: 'Rajesh Premium' } });
  const v1BrandEconomy = await prisma.brand.create({ data: { vendorId: vendor1.id, name: 'Rajesh Economy' } });
  const v1BrandHeritage = await prisma.brand.create({ data: { vendorId: vendor1.id, name: 'Heritage Weaves' } });

  // Brands for vendor2
  const v2BrandElite = await prisma.brand.create({ data: { vendorId: vendor2.id, name: 'Priya Elite' } });
  const v2BrandBasics = await prisma.brand.create({ data: { vendorId: vendor2.id, name: 'Priya Basics' } });

  const v3BrandStudio = await prisma.brand.create({ data: { vendorId: vendor3.id, name: 'Meera Studio' } });
  const v4BrandSouth = await prisma.brand.create({ data: { vendorId: vendor4.id, name: 'Southloom' } });

  const categories = await Promise.all(
    ['Shirts', 'Sarees', 'Kurtas', 'Fabric', 'Trousers', 'Dresses'].map((name) =>
      prisma.category.create({ data: { name } })
    )
  );

  const catMap: Record<string, string> = {};
  categories.forEach((c) => (catMap[c.name] = c.id));

  const defaultAttrRows: { categoryId: string; name: string; sortOrder: number }[] = [];
  for (const name of ['Shirts', 'Sarees', 'Kurtas', 'Trousers', 'Dresses'] as const) {
    defaultAttrRows.push(
      { categoryId: catMap[name], name: 'Fabric', sortOrder: 0 },
      { categoryId: catMap[name], name: 'Pattern', sortOrder: 1 },
      { categoryId: catMap[name], name: 'Color', sortOrder: 2 },
    );
  }
  for (const name of ['Fabric'] as const) {
    defaultAttrRows.push(
      { categoryId: catMap[name], name: 'Width', sortOrder: 3 },
      { categoryId: catMap[name], name: 'GSM', sortOrder: 4 },
    );
  }
  await prisma.categoryAttribute.createMany({ data: defaultAttrRows });

  await prisma.vendorCategoryAttribute.createMany({
    data: [
      { vendorId: vendor1.id, categoryId: catMap['Shirts'], name: 'Fit', sortOrder: 0 },
      { vendorId: vendor2.id, categoryId: catMap['Dresses'], name: 'Occasion', sortOrder: 0 },
      { vendorId: vendor3.id, categoryId: catMap['Kurtas'], name: 'Neckline', sortOrder: 0 },
      { vendorId: vendor4.id, categoryId: catMap['Sarees'], name: 'Border style', sortOrder: 0 },
    ],
  });

  const productData = [
    { name: 'Premium Cotton Shirt', vendorId: vendor1.id, traderId: trader1.id, brandId: v1BrandPremium.id, categoryId: catMap['Shirts'], pattern: 'Solid', fabric: 'Cotton', color: 'White', price: 450, moq: 50, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400'] },
    { name: 'Linen Casual Shirt', vendorId: vendor1.id, traderId: trader1.id, brandId: v1BrandPremium.id, categoryId: catMap['Shirts'], pattern: 'Striped', fabric: 'Linen', color: 'Blue', price: 550, moq: 30, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400'] },
    { name: 'Silk Banarasi Saree', vendorId: vendor1.id, traderId: trader1.id, brandId: v1BrandHeritage.id, categoryId: catMap['Sarees'], pattern: 'Woven', fabric: 'Silk', color: 'Red', price: 2500, moq: 10, images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400'] },
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
    { name: 'Hand Block Kurtas', vendorId: vendor3.id, traderId: trader2.id, brandId: v3BrandStudio.id, categoryId: catMap['Kurtas'], pattern: 'Block print', fabric: 'Cotton', color: 'Indigo', price: 520, moq: 30, images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400'] },
    { name: 'Bandhani Dupatta Set', vendorId: vendor3.id, traderId: trader2.id, brandId: v3BrandStudio.id, categoryId: catMap['Kurtas'], pattern: 'Bandhani', fabric: 'Cotton', color: 'Orange', price: 680, moq: 20, images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400'] },
    { name: 'Jacquard Yardage', vendorId: vendor3.id, brandId: v3BrandStudio.id, categoryId: catMap['Fabric'], pattern: 'Jacquard', fabric: 'Polyester blend', color: 'Burgundy', price: 190, moq: 80, images: ['https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400'] },
    { name: 'Kanjivaram Style Saree', vendorId: vendor4.id, traderId: trader3.id, brandId: v4BrandSouth.id, categoryId: catMap['Sarees'], pattern: 'Zari border', fabric: 'Art silk', color: 'Royal blue', price: 2200, moq: 8, images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400'] },
    { name: 'Mens Formal Shirt Premium', vendorId: vendor4.id, brandId: v4BrandSouth.id, categoryId: catMap['Shirts'], pattern: 'Solid', fabric: 'Cotton', color: 'Light blue', price: 480, moq: 40, images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400'] },
  ];

  const products = await Promise.all(
    productData.map((p) => prisma.product.create({ data: { ...p, status: ProductStatus.ACTIVE } }))
  );

  const order1 = await prisma.order.create({
    data: {
      customerId: customer1.id,
      status: OrderStatus.PENDING,
      items: {
        create: [
          { productId: products[0].id, vendorId: vendor1.id, requestedQty: 100, status: ItemStatus.PENDING },
          { productId: products[6].id, vendorId: vendor2.id, requestedQty: 200, status: ItemStatus.PENDING },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      customerId: customer1.id,
      status: OrderStatus.PARTIALLY_ACCEPTED,
      items: {
        create: [
          { productId: products[1].id, vendorId: vendor1.id, requestedQty: 50, acceptedQty: 50, status: ItemStatus.ACCEPTED, respondedAt: new Date() },
          { productId: products[7].id, vendorId: vendor2.id, requestedQty: 300, acceptedQty: 200, status: ItemStatus.ALTERED, vendorNote: 'Can only supply 200 units at this time', respondedAt: new Date() },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      customerId: customer2.id,
      status: OrderStatus.ACCEPTED,
      items: {
        create: [
          { productId: products[2].id, vendorId: vendor1.id, requestedQty: 20, acceptedQty: 20, status: ItemStatus.ACCEPTED, respondedAt: new Date() },
        ],
      },
    },
  });

  /** Extra pending lines so vendors can exercise Incoming Orders (filters, accept / offer qty). */
  const order4 = await prisma.order.create({
    data: {
      customerId: customer2.id,
      status: OrderStatus.PENDING,
      note: 'Seed: pending lines for vendor1',
      items: {
        create: [
          { productId: products[3].id, vendorId: vendor1.id, requestedQty: 80, status: ItemStatus.PENDING },
          { productId: products[4].id, vendorId: vendor1.id, requestedQty: 60, status: ItemStatus.PENDING },
          { productId: products[9].id, vendorId: vendor1.id, requestedQty: 40, status: ItemStatus.PENDING },
        ],
      },
    },
  });

  const order5 = await prisma.order.create({
    data: {
      customerId: customer1.id,
      status: OrderStatus.PENDING,
      note: 'Seed: pending lines for vendor2',
      items: {
        create: [
          { productId: products[8].id, vendorId: vendor2.id, requestedQty: 150, status: ItemStatus.PENDING },
          { productId: products[11].id, vendorId: vendor2.id, requestedQty: 45, status: ItemStatus.PENDING },
          { productId: products[14].id, vendorId: vendor2.id, requestedQty: 12, status: ItemStatus.PENDING },
        ],
      },
    },
  });

  /** Follow graph: traders follow vendors (feed); customers follow traders (and optionally vendors). */
  await prisma.connection.createMany({
    data: [
      { followerId: trader1.id, followingId: vendor3.id },
      { followerId: trader1.id, followingId: vendor4.id },
      { followerId: trader2.id, followingId: vendor1.id },
      { followerId: trader2.id, followingId: vendor2.id },
      { followerId: trader2.id, followingId: vendor3.id },
      { followerId: trader3.id, followingId: vendor2.id },
      { followerId: trader3.id, followingId: vendor4.id },
      { followerId: customer1.id, followingId: trader1.id },
      { followerId: customer2.id, followingId: trader1.id },
      { followerId: customer3.id, followingId: trader1.id },
      { followerId: customer3.id, followingId: trader2.id },
      { followerId: customer4.id, followingId: trader2.id },
      { followerId: customer4.id, followingId: trader3.id },
      { followerId: customer5.id, followingId: trader1.id },
      { followerId: customer5.id, followingId: trader3.id },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: vendor1.id, type: 'ORDER_PLACED', title: 'New Order Received', body: 'You have a new order request', referenceId: order1.id },
      { userId: vendor2.id, type: 'ORDER_PLACED', title: 'New Order Received', body: 'You have a new order request', referenceId: order1.id },
      { userId: vendor1.id, type: 'ORDER_PLACED', title: 'New Order Received', body: 'You have a new order request', referenceId: order4.id },
      { userId: vendor2.id, type: 'ORDER_PLACED', title: 'New Order Received', body: 'You have a new order request', referenceId: order5.id },
      { userId: customer1.id, type: 'VENDOR_RESPONSE', title: 'Vendor Responded', body: 'A vendor has responded to your order', referenceId: order2.id },
    ],
  });

  console.log('Seed completed successfully');
  console.log(
    `Users: admin(${admin.phone}); vendors ${vendor1.phone}, ${vendor2.phone}, ${vendor3.phone}, ${vendor4.phone}; traders ${trader1.phone}, ${trader2.phone}, ${trader3.phone}; customers ${customer1.phone}, ${customer2.phone}, ${customer3.phone}, ${customer4.phone}, ${customer5.phone}`,
  );
  console.log(`Brands: V1(3), V2(2), V3(${v3BrandStudio.name}), V4(${v4BrandSouth.name})`);
  console.log(`Products: ${products.length} · Connections: traders→vendors + customers→traders`);
  console.log(`Orders: 5 (${order1.id.slice(-6)} pending mixed, ${order4.id.slice(-6)} vendor1 pending, ${order5.id.slice(-6)} vendor2 pending, + 2 responded)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
