import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
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

  bool get isEdit => widget.productId != null && widget.productId!.isNotEmpty;

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
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
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
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit product' : 'New product')),
      body: _loading && isEdit && _name.text.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
                TextField(controller: _brandId, decoration: const InputDecoration(labelText: 'Brand ID')),
                TextField(controller: _categoryId, decoration: const InputDecoration(labelText: 'Category ID')),
                TextField(controller: _moq, decoration: const InputDecoration(labelText: 'MOQ'), keyboardType: TextInputType.number),
                TextField(controller: _pattern, decoration: const InputDecoration(labelText: 'Pattern')),
                TextField(controller: _fabric, decoration: const InputDecoration(labelText: 'Fabric')),
                TextField(controller: _color, decoration: const InputDecoration(labelText: 'Color')),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _loading ? null : _save,
                  child: const Text('Save'),
                ),
              ],
            ),
    );
  }
}
