import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/app_providers.dart';
import 'admin_api.dart';
import 'brand_api.dart';
import 'curation_api.dart';
import 'network_api.dart';
import 'notification_api.dart';
import 'order_api.dart';
import 'product_api.dart';
import 'upload_api.dart';
import 'vendor_api.dart';
import 'workflow_api.dart';

export '../providers/app_providers.dart';

final productApiProvider = Provider<ProductApi>((ref) => ProductApi(ref.watch(dioProvider)));
final orderApiProvider = Provider<OrderApi>((ref) => OrderApi(ref.watch(dioProvider)));
final vendorApiProvider = Provider<VendorApi>((ref) => VendorApi(ref.watch(dioProvider)));
final brandApiProvider = Provider<BrandApi>((ref) => BrandApi(ref.watch(dioProvider)));
final networkApiProvider = Provider<NetworkApi>((ref) => NetworkApi(ref.watch(dioProvider)));
final curationApiProvider = Provider<CurationApi>((ref) => CurationApi(ref.watch(dioProvider)));
final workflowApiProvider = Provider<WorkflowApi>((ref) => WorkflowApi(ref.watch(dioProvider)));
final notificationApiProvider = Provider<NotificationApi>((ref) => NotificationApi(ref.watch(dioProvider)));
final adminApiProvider = Provider<AdminApi>((ref) => AdminApi(ref.watch(dioProvider)));
final uploadApiProvider = Provider<UploadApi>((ref) => UploadApi(ref.watch(dioProvider)));
