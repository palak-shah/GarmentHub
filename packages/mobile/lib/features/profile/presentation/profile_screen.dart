import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';

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

  static const _fieldRadius = 12.0;

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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

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

  Widget _readOnlyBlock(String label, String value) {
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
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: AppTheme.formFieldFillMuted,
              borderRadius: BorderRadius.circular(_fieldRadius),
            ),
            child: Text(
              value,
              style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _editableField(String label, TextEditingController controller) {
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
            style: theme.textTheme.bodyLarge,
            decoration: _flatFieldDecoration(color),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final u = ref.watch(authSessionProvider).user;
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      backgroundColor: color.surface,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        centerTitle: false,
        titleSpacing: 20,
        title: Text(
          'Profile',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          _editableField('Name', _name),
          _editableField('Business name', _business),
          _editableField('Address', _address),
          _readOnlyBlock('Phone', u?.phone ?? '—'),
          _readOnlyBlock('Role', u?.role.apiValue.toLowerCase() ?? '—'),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: FilledButton(
              onPressed: _loading ? null : _save,
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _loading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save'),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: FilledButton.tonal(
              onPressed: () async {
                await ref.read(authSessionProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
              style: FilledButton.styleFrom(
                backgroundColor: AppTheme.formFieldFillMuted,
                foregroundColor: const Color(0xFFC62828),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.logout, size: 20, color: Color(0xFFC62828)),
                  SizedBox(width: 8),
                  Text('Log out', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFC62828))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
