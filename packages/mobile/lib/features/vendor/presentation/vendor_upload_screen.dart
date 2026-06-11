import 'dart:async';
import 'dart:math' as math;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/api/upload_multipart_helpers.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/product.dart';
import '../domain/vendor_share_prefs.dart';
import '../vendor_providers.dart';

class VendorUploadScreen extends ConsumerStatefulWidget {
  const VendorUploadScreen({super.key});

  @override
  ConsumerState<VendorUploadScreen> createState() => _VendorUploadScreenState();
}

class _VendorUploadScreenState extends ConsumerState<VendorUploadScreen> {
  String? _selectedProductId;
  String? _selectedProductName;
  /// Set from Advanced → Enter product ID (overrides listing row until cleared).
  String? _advancedManualId;
  bool _loading = false;

  String? _effectiveProductId() {
    final m = _advancedManualId?.trim();
    if (m != null && m.isNotEmpty) return m;
    final id = _selectedProductId;
    if (id == null || id.isEmpty) return null;
    return id;
  }

  bool get _canUpload => _effectiveProductId() != null && _effectiveProductId()!.isNotEmpty;

  String get _listingSubtitle {
    if (_advancedManualId != null && _advancedManualId!.trim().isNotEmpty) {
      return 'Product ID';
    }
    return 'Product';
  }

  String get _listingTitle {
    if (_advancedManualId != null && _advancedManualId!.trim().isNotEmpty) {
      return _advancedManualId!.trim();
    }
    if (_selectedProductName != null && _selectedProductName!.isNotEmpty) {
      return _selectedProductName!;
    }
    return 'Select a product';
  }

  Future<void> _openProductPicker(List<Product> products) async {
    final picked = await showModalBottomSheet<Product>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _ProductPickerSheet(products: products),
    );
    if (!mounted || picked == null) return;
    setState(() {
      _selectedProductId = picked.id;
      _selectedProductName = picked.name;
      _advancedManualId = null;
    });
  }

  Future<void> _showAdvancedManualIdDialog() async {
    final ctrl = TextEditingController(text: _advancedManualId ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter product ID'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            hintText: 'Product ID',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Apply')),
        ],
      ),
    );
    if (!mounted || ok != true) return;
    final id = ctrl.text.trim();
    ctrl.dispose();
    setState(() {
      if (id.isEmpty) {
        _advancedManualId = null;
      } else {
        _advancedManualId = id;
        _selectedProductId = null;
        _selectedProductName = null;
      }
    });
  }

  void _clearAdvancedManual() {
    setState(() => _advancedManualId = null);
  }

  Future<void> _pickAndUpload() async {
    final pid = _effectiveProductId();
    if (pid == null || pid.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a listing or use Advanced → Enter product ID.')),
      );
      return;
    }
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.image,
      withData: kIsWeb,
    );
    if (result == null || result.files.isEmpty) return;
    final parts = await platformFilesToMultipart(result.files);
    if (parts.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not read image data. Try again or use another browser.')),
        );
      }
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(uploadApiProvider).postProductImageParts(parts, productId: pid);
      final list = ref.read(vendorProductsProvider).valueOrNull;
      var name = 'Listing';
      if (list != null) {
        for (final p in list) {
          if (p.id == pid) {
            name = p.name;
            break;
          }
        }
      }
      await VendorSharePrefs.recordProductUsage(id: pid, name: name);
      ref.invalidate(vendorProductsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload complete')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final async = ref.watch(vendorProductsProvider);
    return Scaffold(
      backgroundColor: color.surface,
      appBar: AppBar(
        title: const Text('Upload images'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'manual') {
                unawaited(_showAdvancedManualIdDialog());
              } else if (v == 'clear_manual') {
                _clearAdvancedManual();
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(value: 'manual', child: Text('Enter product ID…')),
              if (_advancedManualId != null && _advancedManualId!.trim().isNotEmpty)
                const PopupMenuItem(value: 'clear_manual', child: Text('Clear manual ID')),
            ],
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Padding(padding: const EdgeInsets.all(16), child: Text(apiErrorMessageVerbose(e)))),
        data: (list) {
          return LayoutBuilder(
            builder: (context, constraints) {
              final maxW = math.min(520.0, constraints.maxWidth);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: BoxConstraints(maxWidth: maxW),
                          child: Card(
                            elevation: 0,
                            color: AppTheme.vendorCardBackground,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(color: color.outlineVariant.withValues(alpha: 0.4)),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(22),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.cloud_upload_outlined, size: 44, color: color.primary),
                                  const SizedBox(height: 14),
                                  Text(
                                    'Add photos to your catalog',
                                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'Choose which listing should receive the new images, then pick files from your gallery.',
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                      color: color.onSurfaceVariant,
                                      height: 1.35,
                                    ),
                                  ),
                                  const SizedBox(height: 22),
                                  Text(
                                    'Listing',
                                    style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 8),
                                  Material(
                                    color: color.surface,
                                    borderRadius: BorderRadius.circular(14),
                                    child: InkWell(
                                      borderRadius: BorderRadius.circular(14),
                                      onTap: _loading
                                          ? null
                                          : () {
                                              if (list.isEmpty) {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'No products yet. Create one first or use Advanced → Enter product ID.',
                                                    ),
                                                  ),
                                                );
                                                return;
                                              }
                                              unawaited(_openProductPicker(list));
                                            },
                                      child: Ink(
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(color: color.outlineVariant),
                                        ),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                                          child: Row(
                                            children: [
                                              Icon(Icons.inventory_2_outlined, color: color.onSurfaceVariant),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      _listingSubtitle,
                                                      style: theme.textTheme.labelSmall?.copyWith(
                                                        color: color.onSurfaceVariant,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 2),
                                                    Text(
                                                      _listingTitle,
                                                      style: theme.textTheme.titleSmall?.copyWith(
                                                        fontWeight: FontWeight.w600,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Icon(Icons.keyboard_arrow_down_rounded, color: color.onSurfaceVariant),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  SafeArea(
                    minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: maxW),
                        child: SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: FilledButton(
                            onPressed: (_loading || !_canUpload) ? null : _pickAndUpload,
                            style: FilledButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              disabledBackgroundColor: color.surfaceContainerHighest,
                              disabledForegroundColor: color.onSurfaceVariant.withValues(alpha: 0.65),
                            ),
                            child: _loading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Pick images & upload'),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

class _ProductPickerSheet extends StatefulWidget {
  const _ProductPickerSheet({required this.products});

  final List<Product> products;

  @override
  State<_ProductPickerSheet> createState() => _ProductPickerSheetState();
}

class _ProductPickerSheetState extends State<_ProductPickerSheet> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<Product> get _filtered {
    final q = _search.text.trim().toLowerCase();
    if (q.isEmpty) return widget.products;
    return widget.products.where((p) => p.name.toLowerCase().contains(q)).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final bottom = MediaQuery.paddingOf(context).bottom;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.65,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      builder: (ctx, scrollCtrl) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: TextField(
                controller: _search,
                decoration: InputDecoration(
                  hintText: 'Search by name',
                  filled: true,
                  fillColor: color.surfaceContainerHighest,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  prefixIcon: const Icon(Icons.search),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            Expanded(
              child: _filtered.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'No listings match your search.',
                          style: theme.textTheme.bodyLarge?.copyWith(color: color.onSurfaceVariant),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  : ListView.separated(
                      controller: scrollCtrl,
                      padding: EdgeInsets.only(left: 12, right: 12, bottom: 12 + bottom),
                      itemCount: _filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (ctx, i) {
                        final p = _filtered[i];
                        final status = _statusLabel(p);
                        return Material(
                          color: color.surface,
                          borderRadius: BorderRadius.circular(14),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            leading: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: p.primaryImageUrl.isEmpty
                                  ? Container(
                                      width: 56,
                                      height: 56,
                                      color: color.surfaceContainerHighest,
                                      child: Icon(Icons.image_outlined, color: color.onSurfaceVariant),
                                    )
                                  : Image.network(p.primaryImageUrl, width: 56, height: 56, fit: BoxFit.cover),
                            ),
                            title: Text(
                              p.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Chip(
                                label: Text(status.isEmpty ? 'ACTIVE' : status, style: theme.textTheme.labelSmall),
                                visualDensity: VisualDensity.compact,
                                padding: EdgeInsets.zero,
                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                side: BorderSide.none,
                                backgroundColor: color.primaryContainer.withValues(alpha: 0.55),
                              ),
                            ),
                            trailing: Icon(Icons.chevron_right, color: color.onSurfaceVariant),
                            onTap: () => Navigator.pop(context, p),
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}

String _statusLabel(Product p) => (p.raw['status']?.toString() ?? 'ACTIVE').toUpperCase();
