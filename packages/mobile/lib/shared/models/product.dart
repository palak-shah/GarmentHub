import '../../core/config/environment.dart';

/// Subset of `Product` from `packages/frontend/src/types/index.ts`.
class Product {
  Product({
    required this.id,
    required this.name,
    required this.images,
    this.price,
    this.moq,
    this.vendorName,
    this.brandName,
    required this.raw,
  });

  final String id;
  final String name;
  final List<String> images;
  final double? price;
  final int? moq;
  final String? vendorName;
  final String? brandName;
  final Map<String, dynamic> raw;

  /// Category id for feed filters (from nested `category` or flat `categoryId`).
  String? get categoryId {
    final c = raw['category'];
    if (c is Map && c['id'] != null) return c['id'].toString();
    return raw['categoryId'] as String?;
  }

  String? get categoryName {
    final c = raw['category'];
    if (c is Map && c['name'] != null) return c['name'].toString();
    return raw['categoryName'] as String?;
  }

  String get createdAt => raw['createdAt'] as String? ?? '';
  String? get updatedAt => raw['updatedAt'] as String?;

  String get primaryImageUrl {
    final urls = carouselMediaUrls;
    if (urls.isEmpty) return '';
    return Environment.resolveMediaUrl(urls.first);
  }

  /// Ordered URLs for UI carousel: prefers API `imageAssets`, then legacy `images`.
  List<String> get carouselMediaUrls {
    final assets = raw['imageAssets'] ?? raw['image_assets'];
    if (assets is List && assets.isNotEmpty) {
      final out = <String>[];
      for (final e in assets) {
        if (e is! Map) continue;
        final m = Map<String, dynamic>.from(e);
        final u = m['url']?.toString().trim();
        if (u != null && u.isNotEmpty) out.add(u);
      }
      if (out.isNotEmpty) return out;
    }
    return List<String>.from(images);
  }

  int get mediaCount => carouselMediaUrls.length;

  factory Product.fromJson(Map<String, dynamic> json) {
    final imgs = <String>[];
    if (json['images'] is List) {
      for (final e in json['images'] as List) {
        imgs.add(e.toString());
      }
    }
    final vendor = json['vendor'];
    String? vn;
    if (vendor is Map) {
      vn = vendor['businessName']?.toString() ?? vendor['name']?.toString();
    }
    final brand = json['brand'];
    String? bn;
    if (brand is Map) {
      bn = brand['name']?.toString();
    }
    return Product(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      images: imgs,
      price: (json['price'] as num?)?.toDouble(),
      moq: (json['moq'] as num?)?.toInt(),
      vendorName: vn,
      brandName: bn,
      raw: Map<String, dynamic>.from(json),
    );
  }
}
