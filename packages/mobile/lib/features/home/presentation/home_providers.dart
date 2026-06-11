import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../shared/models/user.dart';
import '../../../shared/models/product.dart';
import '../domain/customer_home_feed.dart';

/// Category filter for customer home (null = All).
final homeFeedCategoryIdProvider = StateProvider<String?>((ref) => null);

final productCategoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(productApiProvider).getCategories();
});

@immutable
class CustomerHomeFeedState {
  const CustomerHomeFeedState({
    required this.mergedProducts,
    required this.curatedProductIds,
    required this.normalizedShares,
    required this.dateBuckets,
    required this.traderStories,
    required this.productTraderNameByProductId,
    required this.sharedPhotoCountByProductId,
    this.nextCursor,
    this.loadingMore = false,
  });

  final List<Product> mergedProducts;
  final Set<String> curatedProductIds;
  final List<Map<String, dynamic>> normalizedShares;
  final List<CustomerDateBucket> dateBuckets;
  final List<({String traderId, String traderLabel, List<Product> products})> traderStories;
  final Map<String, String> productTraderNameByProductId;
  final Map<String, int> sharedPhotoCountByProductId;
  final String? nextCursor;
  final bool loadingMore;

  bool get hasMore => nextCursor != null && nextCursor!.isNotEmpty;

  CustomerHomeFeedState copyWith({
    List<Product>? mergedProducts,
    Set<String>? curatedProductIds,
    List<Map<String, dynamic>>? normalizedShares,
    List<CustomerDateBucket>? dateBuckets,
    List<({String traderId, String traderLabel, List<Product> products})>? traderStories,
    Map<String, String>? productTraderNameByProductId,
    Map<String, int>? sharedPhotoCountByProductId,
    String? nextCursor,
    bool? loadingMore,
  }) {
    return CustomerHomeFeedState(
      mergedProducts: mergedProducts ?? this.mergedProducts,
      curatedProductIds: curatedProductIds ?? this.curatedProductIds,
      normalizedShares: normalizedShares ?? this.normalizedShares,
      dateBuckets: dateBuckets ?? this.dateBuckets,
      traderStories: traderStories ?? this.traderStories,
      productTraderNameByProductId: productTraderNameByProductId ?? this.productTraderNameByProductId,
      sharedPhotoCountByProductId: sharedPhotoCountByProductId ?? this.sharedPhotoCountByProductId,
      nextCursor: nextCursor ?? this.nextCursor,
      loadingMore: loadingMore ?? this.loadingMore,
    );
  }
}

final customerHomeFeedNotifierProvider =
    AsyncNotifierProvider<CustomerHomeFeedNotifier, CustomerHomeFeedState>(CustomerHomeFeedNotifier.new);

class CustomerHomeFeedNotifier extends AsyncNotifier<CustomerHomeFeedState> {
  @override
  Future<CustomerHomeFeedState> build() async {
    final categoryId = ref.watch(homeFeedCategoryIdProvider);
    final curation = ref.read(curationApiProvider);
    final products = ref.read(productApiProvider);

    final rawShares = await curation.listReceived();
    final normalized = <Map<String, dynamic>>[];
    for (final e in rawShares) {
      if (e is Map<String, dynamic>) {
        normalized.add(normalizeReceivedShareMap(Map<String, dynamic>.from(e)));
      }
    }

    final stories = buildTraderStories(normalized);
    final curatedIds = <String>{};
    for (final g in stories) {
      for (final p in g.products) {
        curatedIds.add(p.id);
      }
    }

    final traderNameByProduct = <String, String>{};
    for (final g in stories) {
      for (final p in g.products) {
        traderNameByProduct.putIfAbsent(p.id, () => g.traderLabel);
      }
    }

    final feedPage = await products.feed(cursor: null, limit: 20, categoryId: categoryId);
    final network = flattenFeedPage(feedPage);
    final merged = mergeCustomerFeed(stories: stories, networkFlat: network, categoryId: categoryId);
    final next = feedPage['nextCursor'] as String?;

    final buckets = buildCustomerDateBuckets(normalized);

    final sharedPhotoCountByProductId = buildSharedPhotoCountByProductId(normalized);

    return CustomerHomeFeedState(
      mergedProducts: merged,
      curatedProductIds: curatedIds,
      normalizedShares: normalized,
      dateBuckets: buckets,
      traderStories: stories,
      productTraderNameByProductId: traderNameByProduct,
      sharedPhotoCountByProductId: sharedPhotoCountByProductId,
      nextCursor: next,
      loadingMore: false,
    );
  }

  Future<void> loadMore() async {
    final cur = state.valueOrNull;
    if (cur == null || cur.loadingMore || !cur.hasMore) return;

    state = AsyncValue.data(cur.copyWith(loadingMore: true));
    try {
      final categoryId = ref.read(homeFeedCategoryIdProvider);
      final page = await ref.read(productApiProvider).feed(
            cursor: cur.nextCursor,
            limit: 20,
            categoryId: categoryId,
          );
      final batch = flattenFeedPage(page);
      final existing = cur.mergedProducts.map((p) => p.id).toSet();
      final append = <Product>[];
      for (final p in batch) {
        if (!existing.contains(p.id) && !cur.curatedProductIds.contains(p.id)) {
          existing.add(p.id);
          append.add(p);
        }
      }
      final next = page['nextCursor'] as String?;
      state = AsyncValue.data(
        cur.copyWith(
          mergedProducts: [...cur.mergedProducts, ...append],
          nextCursor: next,
          loadingMore: false,
        ),
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

/// Trader workflow tab keys aligned with PWA `WORKFLOW_TABS`.
enum TraderWorkflowTab {
  neW('NEW'),
  seen('SEEN'),
  shared('SHARED'),
  ordered('ORDERED'),
  skipped('SKIPPED');

  const TraderWorkflowTab(this.apiValue);
  final String apiValue;
}

final traderHomeTabProvider = StateProvider<TraderWorkflowTab>((ref) => TraderWorkflowTab.neW);

final traderWorkflowCountsProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
  if (role != UserRole.trader) return null;
  return ref.read(workflowApiProvider).counts();
});

final traderAlertsProvider = FutureProvider<List<dynamic>?>((ref) async {
  final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
  if (role != UserRole.trader) return null;
  return ref.read(orderApiProvider).traderAlerts();
});

/// Trader "NEW" tab: grouped by vendor/day when API returns groups; else flat unseen list.
final traderNewFeedProvider = FutureProvider<TraderNewFeedResult?>((ref) async {
  final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
  final tab = ref.watch(traderHomeTabProvider);
  if (role != UserRole.trader || tab != TraderWorkflowTab.neW) return null;
  final grouped = await ref.read(workflowApiProvider).unseenGrouped(limit: 40);
  if (grouped.isNotEmpty) {
    return TraderNewFeedResult.grouped(grouped);
  }
  final flat = await ref.read(workflowApiProvider).unseen(limit: 40);
  return TraderNewFeedResult.flat(flat);
});

@immutable
class TraderNewFeedResult {
  const TraderNewFeedResult._({this.groupedRaw, this.flatRaw});
  final List<dynamic>? groupedRaw;
  final List<dynamic>? flatRaw;

  factory TraderNewFeedResult.grouped(List<dynamic> g) => TraderNewFeedResult._(groupedRaw: g);
  factory TraderNewFeedResult.flat(List<dynamic> f) => TraderNewFeedResult._(flatRaw: f);

  bool get isGrouped => groupedRaw != null;
}

final traderWorkflowFeedProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
  final tab = ref.watch(traderHomeTabProvider);
  if (role != UserRole.trader || tab == TraderWorkflowTab.neW) return null;
  return ref.read(workflowApiProvider).feedByState(tab.apiValue, limit: 20);
});

final traderSentSharesProvider = FutureProvider<List<dynamic>?>((ref) async {
  final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
  final tab = ref.watch(traderHomeTabProvider);
  if (role != UserRole.trader || tab != TraderWorkflowTab.shared) return null;
  return ref.read(curationApiProvider).listSent();
});
