import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/providers/app_providers.dart';
import '../../../shared/models/user.dart';
import '../../../shared/widgets/gh_labeled_field.dart';

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

  InputDecoration _fieldDeco(BuildContext context, {String? hint}) {
    final scheme = Theme.of(context).colorScheme;
    return InputDecoration(
      hintText: hint,
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      fillColor: scheme.surfaceContainerHighest,
    );
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
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await ref.read(authSessionProvider.notifier).logout();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final u = ref.watch(authSessionProvider).user;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    Widget readBlock(String caption, String value) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(caption.toUpperCase(), style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
            const SizedBox(height: 6),
            Text(value, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        centerTitle: false,
        titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          GhLabeledField(
            label: 'Name',
            child: TextField(controller: _name, decoration: _fieldDeco(context)),
          ),
          const SizedBox(height: 18),
          GhLabeledField(
            label: 'Business name',
            child: TextField(controller: _business, decoration: _fieldDeco(context, hint: 'Your business name')),
          ),
          const SizedBox(height: 18),
          GhLabeledField(
            label: 'Address',
            child: TextField(controller: _address, maxLines: 2, decoration: _fieldDeco(context)),
          ),
          const SizedBox(height: 18),
          readBlock('Phone', u?.phone ?? '—'),
          const SizedBox(height: 12),
          readBlock('Role', u?.role.apiValue.toLowerCase() ?? '—'),
          if (u?.role == UserRole.trader) ...[
            const SizedBox(height: 20),
            Card(
              elevation: 0,
              color: scheme.surfaceContainerLow,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                leading: CircleAvatar(
                  backgroundColor: scheme.primaryContainer,
                  child: Icon(Icons.groups_outlined, color: scheme.onPrimaryContainer),
                ),
                title: const Text('Customer groups', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('Organize buyers and share products', style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                trailing: Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
                onTap: () => context.push('/trader/groups'),
              ),
            ),
          ],
          const SizedBox(height: 28),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            onPressed: _loading ? null : _save,
            child: _loading ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
          ),
          const SizedBox(height: 12),
          FilledButton.tonal(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            onPressed: _loading ? null : _logout,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.logout, size: 20, color: scheme.error),
                const SizedBox(width: 8),
                Text('Log out', style: TextStyle(color: scheme.error, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
