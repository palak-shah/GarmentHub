import 'dart:math' show min;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../core/utils/platform_file_upload.dart';
import '../../../shared/models/product.dart';
import '../domain/vendor_share_prefs.dart';
import '../vendor_providers.dart';

class VendorUploadScreen extends ConsumerStatefulWidget {
  const VendorUploadScreen({super.key});

  @override
  ConsumerState<VendorUploadScreen> createState() => _VendorUploadScreenState();
}

class _VendorUploadScreenState extends ConsumerState<VendorUploadScreen> {
  bool _loading = false;
  Product? _selectedProduct;

  InputDecoration _searchDeco(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InputDecoration(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      fillColor: scheme.surfaceContainerHighest,
      hintText: 'Search by name',
    );
  }

  Future<void> _openProductPicker(List<Product> products) async {
    final picked = await showModalBottomSheet<Product>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) {
        final scheme = Theme.of(sheetContext).colorScheme;
        final text = Theme.of(sheetContext).textTheme;
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.sizeOf(sheetContext).height * 0.65,
            child: _ProductPickerBody(
              products: products,
              scheme: scheme,
              text: text,
              searchDecoration: _searchDeco(sheetContext),
              onSelect: (p) => Navigator.of(sheetContext).pop(p),
            ),
          ),
        );
      },
    );
    if (!mounted) return;
    if (picked != null) {
      setState(() => _selectedProduct = picked);
      await VendorSharePrefs.setLastProduct(id: picked.id, name: picked.name);
    }
  }

  Future<void> _pickAndUpload() async {
    final product = _selectedProduct;
    if (product == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Select a product first')),
        );
      }
      return;
    }
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.image,
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final files = result.files.where(platformFileHasUploadableData).toList();
    if (files.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not read selected images. Try again or pick smaller files.')),
        );
      }
      return;
    }
    setState(() => _loading = true);
    try {
      const chunkSize = 4;
      for (var i = 0; i < files.length; i += chunkSize) {
        final chunk = files.sublist(i, min(i + chunkSize, files.length));
        await ref.read(uploadApiProvider).postProductImagesFromPlatformFiles(chunk, productId: product.id);
      }
      ref.invalidate(vendorProductsProvider);
      await VendorSharePrefs.setLastProduct(id: product.id, name: product.name);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload complete')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _productSelectTile({
    required BuildContext context,
    required ColorScheme scheme,
    required TextTheme text,
    required VoidCallback onTap,
    required bool catalogReady,
  }) {
    final p = _selectedProduct;
    return Material(
      color: scheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: catalogReady ? onTap : null,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: p != null && p.primaryImageUrl.isNotEmpty
                      ? Image.network(p.primaryImageUrl, fit: BoxFit.cover)
                      : ColoredBox(
                          color: scheme.surfaceContainerLow,
                          child: Icon(Icons.inventory_2_outlined, color: scheme.onSurfaceVariant, size: 22),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Product',
                      style: text.labelMedium?.copyWith(color: scheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      p?.name ?? 'Select a product',
                      style: text.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: p == null ? scheme.onSurfaceVariant : null,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(Icons.keyboard_arrow_down_rounded, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final asyncProducts = ref.watch(vendorProductsProvider);

    final catalogReady = asyncProducts.maybeWhen(data: (list) => list.isNotEmpty, orElse: () => false);
    final canUpload = _selectedProduct != null && !_loading && catalogReady;

    return Scaffold(
      appBar: AppBar(title: const Text('Upload images')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Card(
            elevation: 0,
            color: scheme.surfaceContainerLow,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.cloud_upload_outlined, color: scheme.primary, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Add photos to your catalog',
                          style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Choose which listing should receive the new images, then pick files from your gallery.',
                    style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 20),
                  asyncProducts.when(
                    loading: () => const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                    error: (e, _) => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(apiErrorMessage(e), style: text.bodyMedium?.copyWith(color: scheme.error)),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () => ref.invalidate(vendorProductsProvider),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                    data: (list) {
                      if (list.isEmpty) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Create a product first, then you can attach photos here.',
                              style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                            ),
                            const SizedBox(height: 12),
                            FilledButton.tonal(
                              onPressed: () => context.push('/vendor/products/new'),
                              child: const Text('Create a product'),
                            ),
                          ],
                        );
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Listing',
                            style: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          _productSelectTile(
                            context: context,
                            scheme: scheme,
                            text: text,
                            catalogReady: true,
                            onTap: () => _openProductPicker(list),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            onPressed: canUpload ? _pickAndUpload : null,
            child: _loading
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Pick images & upload'),
          ),
        ],
      ),
    );
  }
}

/// Search field + list; own [State] so the list filters on each keystroke.
class _ProductPickerBody extends StatefulWidget {
  const _ProductPickerBody({
    required this.products,
    required this.scheme,
    required this.text,
    required this.searchDecoration,
    required this.onSelect,
  });

  final List<Product> products;
  final ColorScheme scheme;
  final TextTheme text;
  final InputDecoration searchDecoration;
  final ValueChanged<Product> onSelect;

  @override
  State<_ProductPickerBody> createState() => _ProductPickerBodyState();
}

class _ProductPickerBodyState extends State<_ProductPickerBody> {
  final TextEditingController _q = TextEditingController();

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _q.text.trim().toLowerCase();
    final filtered = q.isEmpty
        ? widget.products
        : widget.products.where((p) => p.name.toLowerCase().contains(q)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: TextField(
            controller: _q,
            decoration: widget.searchDecoration,
            onChanged: (_) => setState(() {}),
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Text(
                    'No matches',
                    style: widget.text.bodyMedium?.copyWith(color: widget.scheme.onSurfaceVariant),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final p = filtered[i];
                    final status = p.raw['status']?.toString() ?? '';
                    return Material(
                      color: widget.scheme.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        onTap: () => widget.onSelect(p),
                        borderRadius: BorderRadius.circular(14),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: SizedBox(
                                  width: 48,
                                  height: 48,
                                  child: p.primaryImageUrl.isEmpty
                                      ? ColoredBox(
                                          color: widget.scheme.surfaceContainerHighest,
                                          child: Icon(
                                            Icons.image_outlined,
                                            color: widget.scheme.onSurfaceVariant,
                                          ),
                                        )
                                      : Image.network(p.primaryImageUrl, fit: BoxFit.cover),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      p.name,
                                      style: widget.text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (status.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Chip(
                                        label: Text(status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                        visualDensity: VisualDensity.compact,
                                        padding: EdgeInsets.zero,
                                        backgroundColor: widget.scheme.secondaryContainer,
                                        side: BorderSide.none,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              Icon(Icons.chevron_right_rounded, color: widget.scheme.onSurfaceVariant),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
