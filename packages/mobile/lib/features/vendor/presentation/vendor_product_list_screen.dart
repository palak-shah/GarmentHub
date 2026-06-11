import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/platform/share_targets_platform.dart';
import '../../../shared/models/product.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../domain/vendor_share_prefs.dart';
import '../vendor_providers.dart';

class VendorProductListScreen extends ConsumerStatefulWidget {
  const VendorProductListScreen({super.key});

  @override
  ConsumerState<VendorProductListScreen> createState() => _VendorProductListScreenState();
}

class _VendorProductListScreenState extends ConsumerState<VendorProductListScreen> {
  Set<String> _pinnedIds = {};
  int? _deviceShareTargetMax;

  @override
  void initState() {
    super.initState();
    _loadPinState();
  }

  Future<void> _loadPinState() async {
    final ids = await VendorSharePrefs.getPinnedProductIds();
    final max = await ShareTargetsPlatform.getMaxShareTargetsForDevice();
    if (!mounted) return;
    setState(() {
      _pinnedIds = ids;
      _deviceShareTargetMax = max;
    });
  }

  Future<void> _onPinToggle(Product p) async {
    final atCap = await VendorSharePrefs.togglePinForShare(id: p.id, name: p.name);
    await _loadPinState();
    if (!mounted) return;
    if (atCap) {
      final dev = _deviceShareTargetMax;
      final msg = dev != null && dev > 0
          ? 'You can pin up to ${VendorSharePrefs.maxPinnedForShareInApp} listings. This device may show about $dev in the share sheet.'
          : 'You can pin up to ${VendorSharePrefs.maxPinnedForShareInApp} listings for sharing from Photos.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(vendorProductsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My products')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/vendor/products/new'),
        child: const Icon(Icons.add),
      ),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return GhEmptyState(
              icon: Icons.inventory_2_outlined,
              title: 'No products yet',
              subtitle: 'Tap + to create your first listing.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(vendorProductsProvider);
              await _loadPinState();
            },
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final p = list[i];
                final pinned = _pinnedIds.contains(p.id);
                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 10),
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            await VendorSharePrefs.setLastProduct(id: p.id, name: p.name);
                            if (context.mounted) context.push('/vendor/products/${p.id}/edit');
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: SizedBox(
                                    width: 56,
                                    height: 56,
                                    child: p.primaryImageUrl.isEmpty
                                        ? ColoredBox(
                                            color: scheme.surfaceContainerHighest,
                                            child: Icon(Icons.image_outlined, color: scheme.onSurfaceVariant),
                                          )
                                        : Image.network(p.primaryImageUrl, fit: BoxFit.cover),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(p.name, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 4),
                                      Chip(
                                        label: Text(p.statusLabel, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                        visualDensity: VisualDensity.compact,
                                        padding: EdgeInsets.zero,
                                        backgroundColor: scheme.secondaryContainer,
                                        side: BorderSide.none,
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
                              ],
                            ),
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: pinned ? 'Unpin from Photos share sheet' : 'Pin for Photos share sheet',
                        onPressed: () => _onPinToggle(p),
                        icon: Icon(
                          pinned ? Icons.push_pin : Icons.push_pin_outlined,
                          color: pinned ? scheme.primary : scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(e), textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }
}

extension on Product {
  String get statusLabel => raw['status']?.toString() ?? '';
}
