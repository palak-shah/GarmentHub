import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final TextEditingController _name;
  late final TextEditingController _business;
  late final TextEditingController _address;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final u = ref.read(authSessionProvider).user;
    _name = TextEditingController(text: u?.name ?? '');
    _business = TextEditingController(text: u?.businessName ?? '');
    _address = TextEditingController(text: u?.address ?? '');
  }

  @override
  void dispose() {
    _name.dispose();
    _business.dispose();
    _address.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      await ref.read(authSessionProvider.notifier).updateProfile({
        'name': _name.text.trim(),
        'businessName': _business.text.trim(),
        'address': _address.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
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
    final u = ref.watch(authSessionProvider).user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(authSessionProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            child: const Text('Log out'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Signed in as ${u?.phone ?? ''} (${u?.role.apiValue ?? ''})'),
          const SizedBox(height: 16),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name')),
          TextField(controller: _business, decoration: const InputDecoration(labelText: 'Business name')),
          TextField(controller: _address, decoration: const InputDecoration(labelText: 'Address')),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _loading ? null : _save,
            child: _loading ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
          ),
        ],
      ),
    );
  }
}
