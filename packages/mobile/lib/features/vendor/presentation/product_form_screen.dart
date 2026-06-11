import 'dart:math' show min;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../core/utils/platform_file_upload.dart';
import '../../../shared/widgets/gh_labeled_field.dart';
import '../domain/vendor_share_prefs.dart';
import '../vendor_providers.dart';

class ProductFormScreen extends ConsumerStatefulWidget {
  const ProductFormScreen({super.key, this.productId});

  final String? productId;

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _name = TextEditingController();
  final _brandId = TextEditingController();
  final _categoryId = TextEditingController();
  final _moq = TextEditingController(text: '1');
  final _pattern = TextEditingController();
  final _fabric = TextEditingController();
  final _color = TextEditingController();
  bool _loading = false;
  bool _uploadingImages = false;
  final List<String> _imageUrls = [];

  bool get isEdit => widget.productId != null && widget.productId!.isNotEmpty;

  InputDecoration _deco(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InputDecoration(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      fillColor: scheme.surfaceContainerHighest,
    );
  }

  @override
  void initState() {
    super.initState();
    if (isEdit) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    }
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final m = await ref.read(productApiProvider).getById(widget.productId!);
      _name.text = m['name']?.toString() ?? '';
      _brandId.text = m['brandId']?.toString() ?? '';
      _categoryId.text = m['categoryId']?.toString() ?? '';
      _moq.text = '${m['moq'] ?? 1}';
      _pattern.text = m['pattern']?.toString() ?? '';
      _fabric.text = m['fabric']?.toString() ?? '';
      _color.text = m['color']?.toString() ?? '';
      final imgs = m['images'];
      _imageUrls
        ..clear()
        ..addAll(
          imgs is List ? imgs.map((e) => e.toString()).where((s) => s.trim().isNotEmpty) : const Iterable.empty(),
        );
      await VendorSharePrefs.setLastProduct(
        id: widget.productId!,
        name: _name.text.trim().isNotEmpty ? _name.text.trim() : (m['name']?.toString() ?? 'Product'),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickAndUploadPhotos() async {
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

    setState(() => _uploadingImages = true);
    const chunkSize = 4;
    try {
      final merged = <String>[];
      for (var i = 0; i < files.length; i += chunkSize) {
        final chunk = files.sublist(i, min(i + chunkSize, files.length));
        final urls = await ref.read(uploadApiProvider).postProductImagesFromPlatformFiles(
              chunk,
              productId: isEdit ? widget.productId : null,
            );
        merged.addAll(urls);
      }
      if (!mounted) return;
      setState(() {
        for (final u in merged) {
          final t = u.trim();
          if (t.isNotEmpty && !_imageUrls.contains(t)) _imageUrls.add(t);
        }
      });
      ref.invalidate(vendorProductsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(merged.isEmpty ? 'No new images' : 'Added ${merged.length} photo(s)')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _uploadingImages = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _brandId.dispose();
    _categoryId.dispose();
    _moq.dispose();
    _pattern.dispose();
    _fabric.dispose();
    _color.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      final body = {
        'name': _name.text.trim(),
        'brandId': _brandId.text.trim(),
        'categoryId': _categoryId.text.trim(),
        'moq': int.tryParse(_moq.text.trim()) ?? 1,
        'pattern': _pattern.text.trim(),
        'fabric': _fabric.text.trim(),
        'color': _color.text.trim(),
        'images': List<String>.from(_imageUrls),
      };
      if (isEdit) {
        await ref.read(productApiProvider).update(widget.productId!, body);
      } else {
        await ref.read(productApiProvider).create(body);
      }
      ref.invalidate(vendorProductsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit product' : 'New product')),
      body: _loading && isEdit && _name.text.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Card(
                  elevation: 0,
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.photo_library_outlined, color: scheme.primary, size: 26),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Product photos',
                                style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Shown on your listing and in search.',
                          style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _imageUrls.isEmpty ? 'No photos yet' : '${_imageUrls.length} photo(s)',
                          style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: (_loading || _uploadingImages) ? null : _pickAndUploadPhotos,
                          icon: _uploadingImages
                              ? SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: scheme.primary),
                                )
                              : const Icon(Icons.add_photo_alternate_outlined),
                          label: Text(_uploadingImages ? 'Uploading…' : 'Add photos from gallery'),
                        ),
                        if (_imageUrls.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          SizedBox(
                            height: 104,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: _imageUrls.length,
                              separatorBuilder: (_, _) => const SizedBox(width: 8),
                              itemBuilder: (context, i) {
                                final raw = _imageUrls[i];
                                final resolved = Environment.resolveMediaUrl(raw);
                                return Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: SizedBox(
                                        width: 100,
                                        height: 100,
                                        child: Image.network(
                                          resolved,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) => ColoredBox(
                                            color: scheme.surfaceContainerHighest,
                                            child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant),
                                          ),
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      top: -6,
                                      right: -6,
                                      child: Material(
                                        color: scheme.errorContainer,
                                        shape: const CircleBorder(),
                                        child: InkWell(
                                          customBorder: const CircleBorder(),
                                          onTap: _loading
                                              ? null
                                              : () => setState(() => _imageUrls.removeAt(i)),
                                          child: Padding(
                                            padding: const EdgeInsets.all(4),
                                            child: Icon(Icons.close, size: 18, color: scheme.onErrorContainer),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  elevation: 0,
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Listing details',
                          style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 16),
                        GhLabeledField(
                          label: 'Name',
                          child: TextField(controller: _name, decoration: _deco(context)),
                        ),
                        const SizedBox(height: 16),
                        GhLabeledField(
                          label: 'Brand ID',
                          child: TextField(controller: _brandId, decoration: _deco(context)),
                        ),
                        const SizedBox(height: 16),
                        GhLabeledField(
                          label: 'Category ID',
                          child: TextField(controller: _categoryId, decoration: _deco(context)),
                        ),
                        const SizedBox(height: 16),
                        GhLabeledField(
                          label: 'MOQ',
                          child: TextField(
                            controller: _moq,
                            decoration: _deco(context),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(height: 16),
                        GhLabeledField(
                          label: 'Pattern',
                          child: TextField(controller: _pattern, decoration: _deco(context)),
                        ),
                        const SizedBox(height: 16),
                        GhLabeledField(
                          label: 'Fabric',
                          child: TextField(controller: _fabric, decoration: _deco(context)),
                        ),
                        const SizedBox(height: 16),
                        GhLabeledField(
                          label: 'Color',
                          child: TextField(controller: _color, decoration: _deco(context)),
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
                  onPressed: (_loading || _uploadingImages) ? null : _save,
                  child: _loading
                      ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Save'),
                ),
              ],
            ),
    );
  }
}
