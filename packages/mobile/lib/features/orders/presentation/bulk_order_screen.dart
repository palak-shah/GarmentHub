import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

class BulkOrderScreen extends ConsumerStatefulWidget {
  const BulkOrderScreen({super.key});

  @override
  ConsumerState<BulkOrderScreen> createState() => _BulkOrderScreenState();
}

class _BulkOrderScreenState extends ConsumerState<BulkOrderScreen> {
  final _productId = TextEditingController();
  final _qty = TextEditingController(text: '1');
  bool _loading = false;

  @override
  void dispose() {
    _productId.dispose();
    _qty.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      await ref.read(orderApiProvider).create({
        'items': [
          {
            'productId': _productId.text.trim(),
            'quantity': int.tryParse(_qty.text.trim()) ?? 1,
          },
        ],
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order created')));
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
      appBar: AppBar(title: const Text('Bulk order')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            const Text('Minimal checkout — add product id and quantity (buyer accounts only).'),
            const SizedBox(height: 16),
            TextField(controller: _productId, decoration: const InputDecoration(labelText: 'Product ID')),
            TextField(controller: _qty, decoration: const InputDecoration(labelText: 'Quantity'), keyboardType: TextInputType.number),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Place order'),
            ),
          ],
        ),
      ),
    );
  }
}
