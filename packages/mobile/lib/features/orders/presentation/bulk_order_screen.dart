import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_labeled_field.dart';

class BulkOrderScreen extends ConsumerStatefulWidget {
  const BulkOrderScreen({super.key});

  @override
  ConsumerState<BulkOrderScreen> createState() => _BulkOrderScreenState();
}

class _BulkOrderScreenState extends ConsumerState<BulkOrderScreen> {
  final _productId = TextEditingController();
  final _qty = TextEditingController(text: '1');
  bool _loading = false;

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
  void dispose() {
    _productId.dispose();
    _qty.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final pid = _productId.text.trim();
    if (pid.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a product ID')));
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(orderApiProvider).create({
        'items': [
          {
            'productId': pid,
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
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Bulk order')),
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
                  Text('Quick order', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text(
                    'Minimal checkout for buyer accounts — one line item by product ID.',
                    style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 20),
                  GhLabeledField(
                    label: 'Product ID',
                    child: TextField(
                      controller: _productId,
                      decoration: _deco(context),
                    ),
                  ),
                  const SizedBox(height: 16),
                  GhLabeledField(
                    label: 'Quantity',
                    child: TextField(
                      controller: _qty,
                      decoration: _deco(context),
                      keyboardType: TextInputType.number,
                    ),
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
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Place order'),
          ),
        ],
      ),
    );
  }
}
