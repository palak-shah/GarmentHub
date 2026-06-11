import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/api/upload_multipart_helpers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
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
  bool _photosBusy = false;

  /// Image paths as returned by the API (`/uploads/...`), same shape for `PUT` `images`.
  final List<String> _imageRelPaths = [];

  bool get isEdit => widget.productId != null && widget.productId!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (isEdit) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    }
  }

  Future<void> _load() async {
    if (!isEdit) return;
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
      _imageRelPaths.clear();
      final imgs = m['images'];
      if (imgs is List) {
        for (final e in imgs) {
          final s = e.toString().trim();
          if (s.isNotEmpty) _imageRelPaths.add(s);
        }
      }
      var thumb = '';
      if (_imageRelPaths.isNotEmpty) {
        thumb = Environment.resolveMediaUrl(_imageRelPaths.first);
      }
      await VendorSharePrefs.recordProductUsage(
        id: widget.productId!,
        name: _name.text.trim(),
        thumbnailUrl: thumb.isEmpty ? null : thumb,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
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

  Map<String, dynamic> _bodyForSave() {
    return {
      'name': _name.text.trim(),
      'brandId': _brandId.text.trim(),
      'categoryId': _categoryId.text.trim(),
      'moq': int.tryParse(_moq.text.trim()) ?? 1,
      'pattern': _pattern.text.trim(),
      'fabric': _fabric.text.trim(),
      'color': _color.text.trim(),
      'images': List<String>.from(_imageRelPaths),
    };
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      final body = _bodyForSave();
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addPhotosFromGallery() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.image,
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final parts = await platformFilesToMultipart(result.files);
    if (parts.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            behavior: SnackBarBehavior.floating,
            content: Text('Could not read image data. Try again or use another browser.'),
          ),
        );
      }
      return;
    }
    setState(() => _photosBusy = true);
    try {
      final upload = ref.read(uploadApiProvider);
      List<String> returnedUrls = [];
      if (isEdit && widget.productId != null) {
        returnedUrls = await upload.postProductImageParts(parts, productId: widget.productId);
        await _load();
        if (mounted && returnedUrls.isNotEmpty) {
          setState(() {
            for (final u in returnedUrls) {
              final s = u.toString().trim();
              if (s.isNotEmpty && !_imageRelPaths.contains(s)) {
                _imageRelPaths.add(s);
              }
            }
          });
        }
      } else {
        returnedUrls = await upload.postProductImageParts(parts);
        if (!mounted) return;
        setState(() {
          for (final u in returnedUrls) {
            final s = u.toString().trim();
            if (s.isNotEmpty && !_imageRelPaths.contains(s)) _imageRelPaths.add(s);
          }
        });
      }
      if (mounted) {
        final n = returnedUrls.where((u) => u.toString().trim().isNotEmpty).length;
        final msg = n <= 1 ? 'Photo added' : '$n photos added';
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
            content: Text(msg),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            content: Text(apiErrorMessageVerbose(e)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _photosBusy = false);
    }
  }

  Future<void> _removePhotoAt(int index) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove photo?'),
        content: Text(
          isEdit ? 'This removes the image from your listing.' : 'Remove this photo from the listing before you save?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    if (!isEdit) {
      setState(() {
        if (index >= 0 && index < _imageRelPaths.length) {
          _imageRelPaths.removeAt(index);
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo removed')));
      }
      return;
    }
    if (widget.productId == null) return;
    setState(() {
      if (index >= 0 && index < _imageRelPaths.length) {
        _imageRelPaths.removeAt(index);
      }
    });
    setState(() => _photosBusy = true);
    try {
      await ref.read(productApiProvider).update(widget.productId!, _bodyForSave());
      ref.invalidate(vendorProductsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo removed')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
        await _load();
      }
    } finally {
      if (mounted) setState(() => _photosBusy = false);
    }
  }

  static const _fieldRadius = 12.0;

  InputDecoration _flatFieldDecoration(ColorScheme color) {
    final none = OutlineInputBorder(
      borderRadius: BorderRadius.circular(_fieldRadius),
      borderSide: BorderSide.none,
    );
    return InputDecoration(
      filled: true,
      fillColor: AppTheme.formFieldFillMuted,
      border: none,
      enabledBorder: none,
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_fieldRadius),
        borderSide: BorderSide(color: color.primary, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      isDense: true,
    );
  }

  Widget _listingField(String label, TextEditingController controller, {TextInputType? keyboardType}) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
              color: color.onSurface.withValues(alpha: 0.65),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            keyboardType: keyboardType,
            style: theme.textTheme.bodyLarge,
            decoration: _flatFieldDecoration(color),
          ),
        ],
      ),
    );
  }

  Widget _whiteCard({required Widget child}) {
    final color = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppTheme.vendorCardBackground,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.outlineVariant.withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(padding: const EdgeInsets.all(18), child: child),
    );
  }

  Widget _photosCard() {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    return _whiteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.photo_library_outlined, size: 22, color: color.primary),
              const SizedBox(width: 8),
              Text(
                'Product photos',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Shown on your listing and in search.',
            style: theme.textTheme.bodySmall?.copyWith(color: color.onSurfaceVariant, height: 1.35),
          ),
          if (!isEdit) ...[
            const SizedBox(height: 4),
            Text(
              'Photos will be saved when you save the listing.',
              style: theme.textTheme.bodySmall?.copyWith(color: color.onSurfaceVariant, height: 1.35),
            ),
          ],
          const SizedBox(height: 10),
          Text(
            '${_imageRelPaths.length} photo(s)',
            style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: (_photosBusy || _loading) ? null : _addPhotosFromGallery,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: BorderSide(color: color.primary, width: 1.5),
                foregroundColor: color.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: _photosBusy
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: color.primary),
                    )
                  : Icon(Icons.add_photo_alternate_outlined, color: color.primary),
              label: const Text('Add photos from gallery'),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 104,
            child: _imageRelPaths.isEmpty
                ? Text(
                    'No photos yet.',
                    style: theme.textTheme.bodySmall?.copyWith(color: color.onSurfaceVariant),
                  )
                : ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _imageRelPaths.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (ctx, i) {
                      final url = Environment.resolveMediaUrl(_imageRelPaths[i]);
                      return Stack(
                        clipBehavior: Clip.none,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              url,
                              width: 100,
                              height: 100,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Container(
                                width: 100,
                                height: 100,
                                color: color.surfaceContainerHighest,
                                child: Icon(Icons.broken_image_outlined, color: color.onSurfaceVariant),
                              ),
                            ),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: _photosBusy ? null : () => unawaited(_removePhotoAt(i)),
                              child: Container(
                                width: 26,
                                height: 26,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFE53935),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, color: Colors.white, size: 16),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _listingDetailsCard() {
    final theme = Theme.of(context);
    return _whiteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Listing details',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          _listingField('Name', _name),
          _listingField('Brand ID', _brandId),
          _listingField('Category ID', _categoryId),
          _listingField('MOQ', _moq, keyboardType: TextInputType.number),
          _listingField('Pattern', _pattern),
          _listingField('Fabric', _fabric),
          _listingField('Color', _color),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: AppTheme.pageBackgroundSoft,
      appBar: AppBar(
        title: Text(isEdit ? 'Edit product' : 'New product'),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        foregroundColor: color.onSurface,
      ),
      body: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
              children: [
                if (_loading)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: const LinearProgressIndicator(minHeight: 3),
                    ),
                  ),
                _photosCard(),
                const SizedBox(height: 16),
                _listingDetailsCard(),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton(
                    onPressed: _loading ? null : _save,
                    style: FilledButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Save'),
                  ),
                ),
              ],
            ),
    );
  }
}

