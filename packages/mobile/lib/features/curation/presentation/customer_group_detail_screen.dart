import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_gradient_avatar.dart';
import 'customer_groups_screen.dart';

final customerGroupDetailFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.read(curationApiProvider).getCustomerGroup(id);
});

/// People the trader can add to groups / shares (from GET /curation/customers).
final traderFollowersForGroupsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final raw = await ref.read(curationApiProvider).getCustomers();
  final out = <Map<String, dynamic>>[];
  for (final e in raw) {
    if (e is Map) out.add(Map<String, dynamic>.from(e));
  }
  return out;
});

class CustomerGroupDetailScreen extends ConsumerStatefulWidget {
  const CustomerGroupDetailScreen({super.key, required this.groupId});

  final String groupId;

  @override
  ConsumerState<CustomerGroupDetailScreen> createState() => _CustomerGroupDetailScreenState();
}

class _CustomerGroupDetailScreenState extends ConsumerState<CustomerGroupDetailScreen> {
  late final TextEditingController _nameCtrl;
  String? _lastServerName;
  final Set<String> _selectedToAdd = {};
  bool _saveBusy = false;
  bool _addBusy = false;
  bool _deleteBusy = false;
  final Set<String> _removeBusy = {};

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.invalidate(traderFollowersForGroupsProvider);
    });
  }

  @override
  void didUpdateWidget(covariant CustomerGroupDetailScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.groupId != widget.groupId) {
      _lastServerName = null;
      _selectedToAdd.clear();
      ref.invalidate(traderFollowersForGroupsProvider);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  void _syncNameFromServer(String? serverName) {
    final sn = serverName ?? '';
    if (_lastServerName == sn) return;
    _lastServerName = sn;
    _nameCtrl.value = TextEditingValue(text: sn, selection: TextSelection.collapsed(offset: sn.length));
  }

  Set<String> _memberCustomerIds(List<dynamic> members) {
    final ids = <String>{};
    for (final m in members) {
      if (m is! Map) continue;
      final map = Map<String, dynamic>.from(m);
      final cid = map['customerId']?.toString();
      if (cid != null && cid.isNotEmpty) {
        ids.add(cid);
        continue;
      }
      final cust = map['customer'];
      if (cust is Map) {
        final id = Map<String, dynamic>.from(cust)['id']?.toString();
        if (id != null && id.isNotEmpty) ids.add(id);
      }
    }
    return ids;
  }

  String _customerLabel(Map<String, dynamic> c) {
    final bn = c['businessName']?.toString().trim();
    if (bn != null && bn.isNotEmpty) return bn;
    return c['name']?.toString().trim().isNotEmpty == true ? c['name'].toString() : 'Customer';
  }

  String _memberDisplayName(Map<String, dynamic> member) {
    final cust = member['customer'];
    if (cust is Map) {
      final m = Map<String, dynamic>.from(cust);
      return _customerLabel(m);
    }
    return member['customerId']?.toString() ?? 'Member';
  }

  Future<void> _saveName(String currentServerName) async {
    final next = _nameCtrl.text.trim();
    if (next.isEmpty || next == currentServerName) return;
    setState(() => _saveBusy = true);
    try {
      await ref.read(curationApiProvider).updateCustomerGroup(widget.groupId, {'name': next});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
        ref.invalidate(customerGroupDetailFamily(widget.groupId));
        ref.invalidate(customerGroupsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saveBusy = false);
    }
  }

  Future<void> _addSelected() async {
    if (_selectedToAdd.isEmpty) return;
    setState(() => _addBusy = true);
    try {
      await ref.read(curationApiProvider).addCustomerGroupMembers(widget.groupId, _selectedToAdd.toList());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Members added')));
        setState(() => _selectedToAdd.clear());
        ref.invalidate(customerGroupDetailFamily(widget.groupId));
        ref.invalidate(customerGroupsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _addBusy = false);
    }
  }

  Future<void> _removeMember(String customerId) async {
    setState(() => _removeBusy.add(customerId));
    try {
      await ref.read(curationApiProvider).removeCustomerGroupMember(widget.groupId, customerId);
      if (mounted) {
        ref.invalidate(customerGroupDetailFamily(widget.groupId));
        ref.invalidate(customerGroupsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) {
        setState(() => _removeBusy.remove(customerId));
      }
    }
  }

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete group?'),
        content: const Text('Members stay on GarmentHub; only the group is removed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _deleteBusy = true);
    try {
      await ref.read(curationApiProvider).deleteCustomerGroup(widget.groupId);
      if (mounted) {
        ref.invalidate(customerGroupsProvider);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Group deleted')));
        context.go('/trader/groups');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _deleteBusy = false);
    }
  }

  InputDecoration _fieldDeco(ColorScheme scheme) {
    return InputDecoration(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      fillColor: scheme.surfaceContainerHighest,
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final groupAsync = ref.watch(customerGroupDetailFamily(widget.groupId));
    final customersAsync = ref.watch(traderFollowersForGroupsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Group')),
      bottomNavigationBar: _selectedToAdd.isEmpty
          ? null
          : Material(
              elevation: 8,
              color: scheme.surface,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _addBusy ? null : _addSelected,
                    child: _addBusy
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text('Add ${_selectedToAdd.length} to group'),
                  ),
                ),
              ),
            ),
      body: groupAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(e), textAlign: TextAlign.center),
          ),
        ),
        data: (g) {
          final serverName = g['name']?.toString() ?? '';
          _syncNameFromServer(serverName);

          final membersRaw = (g['members'] as List?) ?? [];
          final members = <Map<String, dynamic>>[];
          for (final m in membersRaw) {
            if (m is Map) members.add(Map<String, dynamic>.from(m));
          }
          final memberIds = _memberCustomerIds(members);

          final customers = customersAsync.valueOrNull;
          final notInGroup = (customers ?? []).where((c) {
            final id = c['id']?.toString() ?? '';
            return id.isNotEmpty && !memberIds.contains(id);
          }).toList();

          final nameTrim = _nameCtrl.text.trim();
          final canSaveName = nameTrim.isNotEmpty && nameTrim != serverName && !_saveBusy;

          return ListView(
            padding: EdgeInsets.fromLTRB(16, 12, 16, _selectedToAdd.isEmpty ? 24 : 100),
            children: [
              Text('NAME', style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
              const SizedBox(height: 8),
              TextField(
                controller: _nameCtrl,
                decoration: _fieldDeco(scheme),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 10),
              FilledButton.tonal(
                onPressed: !canSaveName ? null : () => _saveName(serverName),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(double.infinity, 44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _saveBusy
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Save name'),
              ),
              const SizedBox(height: 24),
              Text(
                'Buyers you can add',
                style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Customers and traders you follow, and buyers who follow you. Tap names to select, then use the bottom button to add them to this group.',
                style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              if (customersAsync.isLoading)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                )
              else if (customersAsync.hasError)
                Text(
                  apiErrorMessage(customersAsync.error!),
                  style: TextStyle(color: scheme.error),
                )
              else if (notInGroup.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    (customers == null || customers.isEmpty)
                        ? 'No buyers found yet. Follow a customer from People / Network, or have a buyer follow you — then they will show up here.'
                        : 'Everyone you are linked with is already in this group.',
                    style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                )
              else
                ...notInGroup.map(
                  (c) => _AddBuyerTile(
                    label: _customerLabel(c),
                    selected: _selectedToAdd.contains(c['id']?.toString() ?? ''),
                    onTap: () {
                      final id = c['id']?.toString() ?? '';
                      if (id.isEmpty) return;
                      setState(() {
                        if (_selectedToAdd.contains(id)) {
                          _selectedToAdd.remove(id);
                        } else {
                          _selectedToAdd.add(id);
                        }
                      });
                    },
                  ),
                ),
              const SizedBox(height: 28),
              Text(
                'In this group',
                style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              if (members.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Nobody added yet. Pick buyers above, then tap “Add … to group”.',
                    style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                )
              else
                ...members.map((m) {
                  final cid = m['customerId']?.toString() ?? '';
                  final busy = cid.isNotEmpty && _removeBusy.contains(cid);
                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 8),
                    color: scheme.surfaceContainerLow,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Row(
                        children: [
                          Expanded(
                            child: ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: GhGradientAvatar(name: _memberDisplayName(m), size: 40),
                              title: Text(
                                _memberDisplayName(m),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Remove from group',
                            onPressed: busy || cid.isEmpty ? null : () => _removeMember(cid),
                            icon: busy
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                                : Icon(Icons.delete_outline, color: scheme.error),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              const SizedBox(height: 28),
              OutlinedButton(
                onPressed: _deleteBusy ? null : _confirmDelete,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                  foregroundColor: scheme.error,
                  side: BorderSide(color: scheme.error.withValues(alpha: 0.35)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _deleteBusy
                    ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: scheme.error))
                    : const Text('Delete group'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _AddBuyerTile extends StatelessWidget {
  const _AddBuyerTile({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: selected ? scheme.primaryContainer.withValues(alpha: 0.35) : scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: scheme.primaryContainer,
                  child: Text(
                    label.isNotEmpty ? label[0].toUpperCase() : '?',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: scheme.onPrimaryContainer),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(label, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600))),
                Icon(selected ? Icons.check_circle : Icons.circle_outlined, color: selected ? scheme.primary : scheme.outline),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
