import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

class ShareProductsScreen extends ConsumerStatefulWidget {
  const ShareProductsScreen({super.key});

  @override
  ConsumerState<ShareProductsScreen> createState() => _ShareProductsScreenState();
}

class _ShareProductsScreenState extends ConsumerState<ShareProductsScreen> {
  final _productIds = TextEditingController();
  final _customerIds = TextEditingController();
  final _note = TextEditingController();
  String _orderMode = 'DIRECT';
  bool _loading = false;

  @override
  void dispose() {
    _productIds.dispose();
    _customerIds.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final pids = _productIds.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    final cids = _customerIds.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    if (pids.isEmpty || cids.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter product IDs and customer IDs')));
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(curationApiProvider).createShare({
        'productIds': pids,
        'customerIds': cids,
        'note': _note.text.trim().isEmpty ? null : _note.text.trim(),
        'orderMode': _orderMode,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Share sent')));
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
    return Scaffold(
      appBar: AppBar(title: const Text('Share products')),
      body: SafeArea(
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Comma-separated product IDs and customer IDs (trader flow).'),
            const SizedBox(height: 12),
            TextField(controller: _productIds, decoration: const InputDecoration(labelText: 'Product IDs')),
            TextField(controller: _customerIds, decoration: const InputDecoration(labelText: 'Customer IDs')),
            TextField(controller: _note, decoration: const InputDecoration(labelText: 'Note')),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              key: ValueKey(_orderMode),
              initialValue: _orderMode,
              decoration: const InputDecoration(labelText: 'Order mode'),
              items: const [
                DropdownMenuItem(value: 'DIRECT', child: Text('Direct')),
                DropdownMenuItem(value: 'MANAGED', child: Text('Managed')),
              ],
              onChanged: (v) => setState(() => _orderMode = v ?? 'DIRECT'),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Send share'),
            ),
          ],
        ),
      ),
    );
  }
}
