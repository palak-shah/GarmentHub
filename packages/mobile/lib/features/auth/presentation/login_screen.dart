import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_labeled_field.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  String? _role;
  bool _sent = false;
  bool _loading = false;

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  InputDecoration _deco(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InputDecoration(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      fillColor: scheme.surfaceContainerHighest,
    );
  }

  Future<void> _sendOtp() async {
    final phone = _phone.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter your phone number')));
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(authSessionProvider.notifier).sendOtp(phone);
      setState(() {
        _sent = true;
        _loading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP sent')));
      }
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }

  Future<void> _verify() async {
    setState(() => _loading = true);
    try {
      await ref.read(authSessionProvider.notifier).verifyOtp(
            phone: _phone.text.trim(),
            code: _code.text.trim(),
            role: (_role == null || _role!.isEmpty) ? null : _role,
          );
      if (mounted) context.go('/');
    } catch (e) {
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Icon(Icons.checkroom_rounded, size: 56, color: scheme.primary),
              const SizedBox(height: 12),
              Text('GarmentHub', textAlign: TextAlign.center, style: text.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                'Sign in with your phone',
                textAlign: TextAlign.center,
                style: text.bodyLarge?.copyWith(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 40),
              GhLabeledField(
                label: 'Phone',
                child: TextField(
                  controller: _phone,
                  decoration: _deco(context).copyWith(hintText: '10-digit mobile'),
                  keyboardType: TextInputType.phone,
                  enabled: !_sent,
                ),
              ),
              const SizedBox(height: 20),
              GhLabeledField(
                label: 'Role (optional)',
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Default'),
                      selected: _role == null || _role!.isEmpty,
                      onSelected: _sent
                          ? null
                          : (v) {
                              if (v) setState(() => _role = null);
                            },
                    ),
                    ChoiceChip(
                      label: const Text('Buyer'),
                      selected: _role == 'CUSTOMER',
                      onSelected: _sent
                          ? null
                          : (v) {
                              if (v) setState(() => _role = 'CUSTOMER');
                            },
                    ),
                    ChoiceChip(
                      label: const Text('Vendor'),
                      selected: _role == 'VENDOR',
                      onSelected: _sent
                          ? null
                          : (v) {
                              if (v) setState(() => _role = 'VENDOR');
                            },
                    ),
                    ChoiceChip(
                      label: const Text('Trader'),
                      selected: _role == 'TRADER',
                      onSelected: _sent
                          ? null
                          : (v) {
                              if (v) setState(() => _role = 'TRADER');
                            },
                    ),
                    ChoiceChip(
                      label: const Text('Admin'),
                      selected: _role == 'ADMIN',
                      onSelected: _sent
                          ? null
                          : (v) {
                              if (v) setState(() => _role = 'ADMIN');
                            },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              if (!_sent)
                FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  onPressed: _loading ? null : _sendOtp,
                  child: _loading ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Send OTP'),
                )
              else ...[
                GhLabeledField(
                  label: 'OTP code',
                  child: TextField(
                    controller: _code,
                    decoration: _deco(context),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  onPressed: _loading ? null : _verify,
                  child: _loading ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Verify & continue'),
                ),
                TextButton(
                  onPressed: _loading ? null : () => setState(() => _sent = false),
                  child: const Text('Change phone number'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
