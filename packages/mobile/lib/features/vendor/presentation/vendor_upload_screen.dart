import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../vendor_providers.dart';

class VendorUploadScreen extends ConsumerStatefulWidget {
  const VendorUploadScreen({super.key});

  @override
  ConsumerState<VendorUploadScreen> createState() => _VendorUploadScreenState();
}

class _VendorUploadScreenState extends ConsumerState<VendorUploadScreen> {
  final _productId = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _productId.dispose();
    super.dispose();
  }

  Future<void> _pickAndUpload() async {
    final result = await FilePicker.platform.pickFiles(allowMultiple: true, type: FileType.image);
    if (result == null || result.files.isEmpty) return;
    final paths = result.files.map((f) => f.path).whereType<String>().toList();
    if (paths.isEmpty) return;
    setState(() => _loading = true);
    try {
      final pid = _productId.text.trim().isEmpty ? null : _productId.text.trim();
      await ref.read(uploadApiProvider).postProductImages(paths, productId: pid);
      ref.invalidate(vendorProductsProvider);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Upload images')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            const Text('Append photos to an existing product by ID, or leave blank for new-only flow on web.'),
            TextField(controller: _productId, decoration: const InputDecoration(labelText: 'Product ID (optional)')),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _pickAndUpload,
              child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Pick images & upload'),
            ),
          ],
        ),
      ),
    );
  }
}
