import 'product.dart';

typedef OrderStatus = String;
typedef ItemStatus = String;

class OrderItem {
  OrderItem({
    required this.id,
    required this.orderId,
    required this.productId,
    required this.requestedQty,
    this.acceptedQty,
    required this.status,
    this.vendorNote,
    this.offeredUnitPrice,
    required this.product,
    required this.raw,
  });

  final String id;
  final String orderId;
  final String productId;
  final int requestedQty;
  final int? acceptedQty;
  final ItemStatus status;
  final String? vendorNote;
  final double? offeredUnitPrice;
  final Map<String, dynamic> product;
  final Map<String, dynamic> raw;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final p = json['product'];
    return OrderItem(
      id: json['id'] as String,
      orderId: json['orderId'] as String? ?? '',
      productId: json['productId'] as String? ?? '',
      requestedQty: (json['requestedQty'] as num?)?.toInt() ?? 0,
      acceptedQty: (json['acceptedQty'] as num?)?.toInt(),
      status: json['status'] as String? ?? 'PENDING',
      vendorNote: json['vendorNote'] as String?,
      offeredUnitPrice: (json['offeredUnitPrice'] as num?)?.toDouble(),
      product: p is Map<String, dynamic> ? Map<String, dynamic>.from(p) : {},
      raw: Map<String, dynamic>.from(json),
    );
  }
}

class Order {
  Order({
    required this.id,
    required this.customerId,
    this.traderId,
    required this.status,
    this.note,
    this.orderMode,
    this.customerNeedBy,
    this.releasedToVendorsAt,
    required this.createdAt,
    required this.items,
    required this.raw,
  });

  final String id;
  final String customerId;
  final String? traderId;
  final OrderStatus status;
  final String? note;
  final String? orderMode;
  final String? customerNeedBy;
  final String? releasedToVendorsAt;
  final String createdAt;
  final List<OrderItem> items;
  final Map<String, dynamic> raw;

  factory Order.fromJson(Map<String, dynamic> json) {
    final itemsRaw = json['items'];
    final items = <OrderItem>[];
    if (itemsRaw is List) {
      for (final e in itemsRaw) {
        if (e is Map<String, dynamic>) {
          items.add(OrderItem.fromJson(e));
        }
      }
    }
    return Order(
      id: json['id'] as String,
      customerId: json['customerId'] as String? ?? '',
      traderId: json['traderId'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      note: json['note'] as String?,
      orderMode: json['orderMode'] as String?,
      customerNeedBy: json['customerNeedBy'] as String?,
      releasedToVendorsAt: json['releasedToVendorsAt'] as String?,
      createdAt: json['createdAt'] as String? ?? '',
      items: items,
      raw: Map<String, dynamic>.from(json),
    );
  }

  Product? previewProduct() {
    if (items.isEmpty) return null;
    try {
      return Product.fromJson(items.first.product);
    } catch (_) {
      return null;
    }
  }
}
