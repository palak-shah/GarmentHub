/// Mirrors `packages/frontend/src/types/index.ts` Role.
enum UserRole {
  customer('CUSTOMER'),
  vendor('VENDOR'),
  trader('TRADER'),
  admin('ADMIN');

  const UserRole(this.apiValue);
  final String apiValue;

  static UserRole? fromString(String? v) {
    if (v == null) return null;
    final u = v.trim().toUpperCase();
    for (final r in UserRole.values) {
      if (r.apiValue == u) return r;
    }
    return null;
  }
}

class User {
  const User({
    required this.id,
    required this.phone,
    required this.name,
    required this.role,
    this.businessName,
    this.address,
    required this.isActive,
    required this.createdAt,
  });

  final String id;
  final String phone;
  final String name;
  final UserRole role;
  final String? businessName;
  final String? address;
  final bool isActive;
  final String createdAt;

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      phone: json['phone'] as String? ?? '',
      name: json['name'] as String? ?? '',
      role: UserRole.fromString(json['role'] as String?) ?? UserRole.customer,
      businessName: json['businessName'] as String?,
      address: json['address'] as String?,
      isActive: json['isActive'] == true,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'phone': phone,
        'name': name,
        'role': role.apiValue,
        if (businessName != null) 'businessName': businessName,
        if (address != null) 'address': address,
        'isActive': isActive,
        'createdAt': createdAt,
      };
}
