import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

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
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: ListView(
          children: [
            TextField(
              controller: _phone,
              decoration: const InputDecoration(labelText: 'Phone'),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Role (optional)'),
              value: _role == null || _role!.isEmpty ? '' : _role,
              items: const [
                DropdownMenuItem(value: '', child: Text('Default')),
                DropdownMenuItem(value: 'CUSTOMER', child: Text('Buyer')),
                DropdownMenuItem(value: 'VENDOR', child: Text('Vendor')),
                DropdownMenuItem(value: 'TRADER', child: Text('Trader')),
                DropdownMenuItem(value: 'ADMIN', child: Text('Admin')),
              ],
              onChanged: (v) => setState(() => _role = v == null || v.isEmpty ? null : v),
            ),
            const SizedBox(height: 24),
            if (!_sent)
              FilledButton(
                onPressed: _loading ? null : _sendOtp,
                child: _loading ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Send OTP'),
              )
            else ...[
              TextField(
                controller: _code,
                decoration: const InputDecoration(labelText: 'OTP code'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loading ? null : _verify,
                child: _loading ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Verify'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
