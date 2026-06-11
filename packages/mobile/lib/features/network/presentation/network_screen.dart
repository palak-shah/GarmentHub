import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../home/domain/customer_home_feed.dart';
import '../../../shared/models/user.dart';

final connectionsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(networkApiProvider).getConnections();
});

final suggestionsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(networkApiProvider).getSuggestions();
});

final networkStoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(networkApiProvider).getStories();
});

final networkCuratedReceivedProvider = FutureProvider<List<dynamic>>((ref) async {
  final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
  if (role != UserRole.customer) return const [];
  return ref.read(curationApiProvider).listReceived();
});

/// PWA-aligned: group curated share lines by trader for thumbnail strip on "My Traders".
Map<String, ({List<String> images, int count})> traderSharePreviewMap(List<dynamic> rawShares) {
  final agg = <String, _TraderShareAgg>{};
  for (final e in rawShares) {
    if (e is! Map<String, dynamic>) continue;
    final norm = normalizeReceivedShareMap(Map<String, dynamic>.from(e));
    final trader = norm['trader'];
    if (trader is! Map) continue;
    final tid = trader['id']?.toString();
    if (tid == null || tid.isEmpty) continue;
    final a = agg.putIfAbsent(tid, _TraderShareAgg.new);
    final lines = norm['lines'] as List? ?? [];
    for (final line in lines) {
      if (line is! Map<String, dynamic>) continue;
      final pm = line['product'];
      if (pm is! Map<String, dynamic>) continue;
      a.count++;
      final imgs = pm['images'] as List?;
      if (a.images.length < 4 && imgs != null && imgs.isNotEmpty) {
        a.images.add(imgs.first.toString());
      }
    }
  }
  return agg.map((k, v) => MapEntry(k, (images: List<String>.from(v.images), count: v.count)));
}

class _TraderShareAgg {
  final List<String> images = [];
  int count = 0;
}

const _avatarGradients = <List<Color>>[
  [Color(0xFFA78BFA), Color(0xFF9333EA)],
  [Color(0xFF7DD3FC), Color(0xFF2563EB)],
  [Color(0xFFFCD34D), Color(0xFFEA580C)],
  [Color(0xFF6EE7B7), Color(0xFF16A34A)],
  [Color(0xFFFB7185), Color(0xFFDB2777)],
  [Color(0xFFA5B4FC), Color(0xFF1D4ED8)],
  [Color(0xFF5EEAD4), Color(0xFF0891B2)],
  [Color(0xFFF0ABFC), Color(0xFFA21CAF)],
];

int _gradientIndexForName(String name) {
  var h = 0;
  for (var i = 0; i < name.length; i++) {
    h = name.codeUnitAt(i) + ((h << 5) - h);
  }
  return h.abs() % _avatarGradients.length;
}

class _NetworkAvatar extends StatelessWidget {
  const _NetworkAvatar({required this.name, this.size = 44});

  final String name;
  final double size;

  @override
  Widget build(BuildContext context) {
    final letter = (name.isEmpty ? '?' : name[0]).toUpperCase();
    final g = _avatarGradients[_gradientIndexForName(name)];
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(colors: g, begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      alignment: Alignment.center,
      child: Text(
        letter,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.roleApi});

  final String roleApi;

  @override
  Widget build(BuildContext context) {
    final (label, bg, fg) = switch (roleApi) {
      'VENDOR' => ('Vendor', const Color(0xFFEFF6FF), const Color(0xFF2563EB)),
      'TRADER' => ('Trader', const Color(0xFFF3E8FF), const Color(0xFF9333EA)),
      'CUSTOMER' => ('Buyer', const Color(0xFFECFDF5), const Color(0xFF16A34A)),
      _ => (roleApi, const Color(0xFFF3F4F6), const Color(0xFF6B7280)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: fg)),
    );
  }
}

Map<String, dynamic> _asUserMap(dynamic raw) {
  if (raw is Map<String, dynamic>) return raw;
  if (raw is Map) return Map<String, dynamic>.from(raw);
  return {};
}

class NetworkScreen extends ConsumerStatefulWidget {
  const NetworkScreen({super.key});

  @override
  ConsumerState<NetworkScreen> createState() => _NetworkScreenState();
}

class _NetworkScreenState extends ConsumerState<NetworkScreen> {
  final _searchCtrl = TextEditingController();
  Timer? _debounce;
  String _debouncedQuery = '';
  int _searchSeq = 0;
  List<dynamic> _searchResults = [];
  bool _searchLoading = false;
  String? _pendingUserId;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(_scheduleSearch);
  }

  void _scheduleSearch() {
    final q = _searchCtrl.text;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      if (!mounted) return;
      setState(() => _debouncedQuery = q);
      final trimmed = q.trim();
      if (trimmed.length < 2) {
        setState(() {
          _searchResults = [];
          _searchLoading = false;
        });
        return;
      }
      final seq = ++_searchSeq;
      setState(() => _searchLoading = true);
      try {
        final list = await ref.read(networkApiProvider).search(trimmed);
        if (!mounted || seq != _searchSeq) return;
        setState(() {
          _searchResults = list;
          _searchLoading = false;
        });
      } catch (e) {
        if (!mounted || seq != _searchSeq) return;
        setState(() {
          _searchResults = [];
          _searchLoading = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
        }
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.removeListener(_scheduleSearch);
    _searchCtrl.dispose();
    super.dispose();
  }

  bool get _searchActive => _searchCtrl.text.isNotEmpty;

  bool _isPhoneSearch(String q) {
    final compact = q.replaceAll(RegExp(r'[\s-]'), '');
    return RegExp(r'^\+?\d{3,}$').hasMatch(compact);
  }

  Future<void> _invalidateNetwork() async {
    ref.invalidate(connectionsProvider);
    ref.invalidate(suggestionsProvider);
    ref.invalidate(networkStoriesProvider);
    ref.invalidate(networkCuratedReceivedProvider);
  }

  Future<void> _shareInvite() async {
    try {
      final data = await ref.read(networkApiProvider).getInviteCode();
      final code = data['code']?.toString() ?? '';
      if (code.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not load invite link')));
        }
        return;
      }
      final base = Environment.webAppBaseUrl;
      final url = base.isNotEmpty ? '$base/login?invite=$code' : '';
      final text = url.isNotEmpty ? 'Join me on GarmentHub! $url' : 'GarmentHub invite code: $code';
      await Clipboard.setData(ClipboardData(text: text));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(url.isNotEmpty ? 'Invite link copied' : 'Invite copied to clipboard')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    }
  }

  Future<void> _toggleFollow(String userId, {required bool following}) async {
    setState(() => _pendingUserId = userId);
    try {
      if (following) {
        await ref.read(networkApiProvider).unfollow(userId);
      } else {
        await ref.read(networkApiProvider).follow(userId);
      }
      await _invalidateNetwork();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _pendingUserId = null);
    }
  }

  Future<void> _connectTrader(String traderId) async {
    setState(() => _pendingUserId = traderId);
    try {
      await ref.read(networkApiProvider).connectTrader(traderId);
      await _invalidateNetwork();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Connected')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _pendingUserId = null);
    }
  }

  void _navigateToTrader(Map<String, dynamic> trader) {
    final name = (trader['businessName'] ?? trader['name'] ?? '').toString();
    final id = trader['id']?.toString() ?? '';
    if (id.isEmpty) return;
    final q = Uri(
      path: '/search',
      queryParameters: {'traderId': id, 'traderName': name},
    ).query;
    context.push('/search?$q');
  }

  void _navigateVendorProducts(String vendorId) {
    if (vendorId.isEmpty) return;
    context.push('/search?vendorId=$vendorId');
  }

  Widget _buildSearchOverlay(bool isVendor, bool canInvite, Set<String> connectionIds) {
    final dq = _debouncedQuery.trim();
    final phoneSearch = _isPhoneSearch(dq);

    if (dq.length < 2) {
      return ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        children: [
          Text('Type at least 2 characters to search', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
          if (isVendor) ...[
            const SizedBox(height: 8),
            Text(
              'Search finds traders already on GarmentHub — tap Connect to add them. Use + for an invite link if they are not on the app yet.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
          ],
        ],
      );
    }

    if (_searchLoading) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 8),
            Text('Searching...', style: TextStyle(fontSize: 14, color: Colors.black54)),
          ],
        ),
      );
    }

    if (_searchResults.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Icon(Icons.people_outline, size: 56, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          const Text('No one found', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(
            phoneSearch ? 'No account with this phone number' : 'No results for "$dq"',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          if (canInvite) ...[
            const SizedBox(height: 16),
            Center(
              child: FilledButton(
                onPressed: _shareInvite,
                child: const Text('Invite via link'),
              ),
            ),
          ],
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _searchResults.length,
      separatorBuilder: (_, _) => Divider(height: 1, color: Colors.grey.shade100),
      itemBuilder: (context, i) {
        final u = _asUserMap(_searchResults[i]);
        final id = u['id']?.toString() ?? '';
        final display = (u['businessName'] ?? u['name'] ?? '').toString();
        final roleStr = u['role']?.toString() ?? '';
        final already = connectionIds.contains(id);
        final busy = _pendingUserId == id;

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: InkWell(
            onTap: isVendor && already
                ? () => context.push('/network/traders/$id')
                : null,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _NetworkAvatar(name: display),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(display, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (roleStr.isNotEmpty) _RoleBadge(roleApi: roleStr),
                          if ((u['businessName'] != null) && (u['name']?.toString() != u['businessName']?.toString()))
                            Text(
                              u['name']?.toString() ?? '',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          if (phoneSearch && (u['phone'] != null))
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.phone, size: 12, color: Colors.grey.shade400),
                                const SizedBox(width: 2),
                                Flexible(
                                  child: Text(
                                    u['phone'].toString(),
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                if (isVendor)
                  already
                      ? OutlinedButton(
                          onPressed: busy ? null : () => _toggleFollow(id, following: true),
                          child: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Disconnect'),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            FilledButton(
                              onPressed: busy ? null : () => _connectTrader(id),
                              child: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Connect'),
                            ),
                            const SizedBox(height: 4),
                            SizedBox(
                              width: 140,
                              child: Text(
                                'Already on GarmentHub — adds them to your traders',
                                style: TextStyle(fontSize: 9, color: Colors.grey.shade500),
                                textAlign: TextAlign.right,
                              ),
                            ),
                          ],
                        )
                else
                  FilledButton.tonal(
                    onPressed: busy
                        ? null
                        : () => _toggleFollow(id, following: already),
                    child: Text(already ? 'Following' : 'Follow'),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMain(
    UserRole? role,
    AsyncValue<List<dynamic>> conn,
    AsyncValue<List<dynamic>> sug,
    AsyncValue<List<dynamic>> stories,
    AsyncValue<List<dynamic>> curated,
  ) {
    final isCustomer = role == UserRole.customer;
    final isTrader = role == UserRole.trader;
    final isVendor = role == UserRole.vendor;

    final connections = conn.valueOrNull ?? const [];
    final suggestions = sug.valueOrNull ?? const [];
    final storyList = stories.valueOrNull ?? const [];
    final rawCurated = curated.valueOrNull ?? const [];
    final traderShareMap = isCustomer ? traderSharePreviewMap(rawCurated) : <String, ({List<String> images, int count})>{};

    final connectionIds = connections.map((c) => _asUserMap(c)['id']?.toString()).whereType<String>().toSet();

    List<Map<String, dynamic>> conMaps() => connections.map(_asUserMap).toList();
    final traderConnections = conMaps().where((c) => c['role'] == 'TRADER').toList();
    final vendorConnections = conMaps().where((c) => c['role'] == 'VENDOR').toList();
    final customerConnections = conMaps().where((c) => c['role'] == 'CUSTOMER').toList();
    final otherConnections = conMaps().where((c) => c['role'] != 'TRADER').toList();

    final isEmpty =
        storyList.isEmpty && connections.isEmpty && suggestions.isEmpty && !conn.isLoading && !sug.isLoading && !stories.isLoading;

    return RefreshIndicator(
      onRefresh: () async {
        await _invalidateNetwork();
        await ref.read(connectionsProvider.future);
        await ref.read(suggestionsProvider.future);
        await ref.read(networkStoriesProvider.future);
        await ref.read(networkCuratedReceivedProvider.future);
      },
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          if (conn.isLoading || sug.isLoading)
            const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),

          if (conn.hasError)
            Padding(padding: const EdgeInsets.all(16), child: Text(apiErrorMessageVerbose(conn.error!))),
          if (sug.hasError)
            Padding(padding: const EdgeInsets.all(16), child: Text(apiErrorMessageVerbose(sug.error!))),

          if (storyList.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                'NEW UPLOADS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.grey.shade500),
              ),
            ),
            SizedBox(
              height: 100,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: storyList.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) {
                  final s = _asUserMap(storyList[i]);
                  final id = s['id']?.toString() ?? '';
                  final label = (s['businessName'] ?? s['name'] ?? '?').toString();
                  final short = label.split(' ').first;
                  return InkWell(
                    onTap: () => _navigateVendorProducts(id),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(3),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.primaryContainer]),
                          ),
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                            child: _NetworkAvatar(name: label, size: 52),
                          ),
                        ),
                        const SizedBox(height: 6),
                        SizedBox(
                          width: 72,
                          child: Text(short, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],

          if (isCustomer && traderConnections.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                'MY TRADERS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.grey.shade500),
              ),
            ),
            ...traderConnections.map((trader) {
              final id = trader['id']?.toString() ?? '';
              final name = (trader['businessName'] ?? trader['name'] ?? '').toString();
              final share = traderShareMap[id];
              final thumbs = share?.images ?? const <String>[];
              final productCount = share?.count ?? 0;
              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: Material(
                  elevation: 1,
                  shadowColor: Colors.black12,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => _navigateToTrader(trader),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          _NetworkAvatar(name: name, size: 48),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 4),
                                Text(
                                  productCount > 0 ? '$productCount product${productCount == 1 ? '' : 's'} shared' : 'Tap to view',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                          if (thumbs.isNotEmpty)
                            Row(
                              children: [
                                for (var j = 0; j < thumbs.length.clamp(0, 3); j++)
                                  Transform.translate(
                                    offset: Offset(-8.0 * j, 0),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(
                                        Environment.resolveMediaUrl(thumbs[j]),
                                        width: 40,
                                        height: 40,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => Container(
                                          width: 40,
                                          height: 40,
                                          color: Colors.grey.shade200,
                                          child: const Icon(Icons.image_not_supported, size: 18),
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            )
                          else
                            Icon(Icons.chevron_right, color: Colors.grey.shade300),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],

          if (isCustomer && otherConnections.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text(
                'FOLLOWING',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.grey.shade500),
              ),
            ),
            ...otherConnections.map(_connectionTile),
          ],

          if (isTrader && vendorConnections.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                'MY VENDORS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.grey.shade500),
              ),
            ),
            ...vendorConnections.map((v) {
              final id = v['id']?.toString() ?? '';
              final name = (v['businessName'] ?? v['name'] ?? '').toString();
              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Material(
                  elevation: 1,
                  shadowColor: Colors.black12,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => _navigateVendorProducts(id),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          _NetworkAvatar(name: name, size: 48),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 4),
                                const _RoleBadge(roleApi: 'VENDOR'),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right, color: Colors.grey.shade300),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],

          if (isTrader && customerConnections.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Row(
                children: [
                  Text(
                    'MY CUSTOMERS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.grey.shade500),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(999)),
                    child: Text('${customerConnections.length}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
            ...customerConnections.map(_connectionTile),
          ],

          if (isVendor && connections.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Text(
                    'CONNECTED TRADERS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.grey.shade500),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(999)),
                    child: Text('${connections.length}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 200,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: connections.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) {
                  final c = _asUserMap(connections[i]);
                  final id = c['id']?.toString() ?? '';
                  final name = (c['businessName'] ?? c['name'] ?? '').toString();
                  final roleStr = c['role']?.toString() ?? '';
                  final busy = _pendingUserId == id;
                  return SizedBox(
                    width: 140,
                    child: Material(
                      elevation: 1,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => context.push('/network/traders/$id'),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            children: [
                              _NetworkAvatar(name: name, size: 48),
                              const SizedBox(height: 8),
                              Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600)),
                              if (roleStr.isNotEmpty) ...[const SizedBox(height: 4), _RoleBadge(roleApi: roleStr)],
                              const Spacer(),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton(
                                  onPressed: busy
                                      ? null
                                      : () async {
                                          await _toggleFollow(id, following: true);
                                        },
                                  child: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Disconnect'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],

          if (suggestions.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Icon(Icons.auto_awesome, size: 16, color: Colors.grey.shade500),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      isCustomer
                          ? 'TRADERS TO FOLLOW'
                          : isTrader
                              ? 'VENDORS & CUSTOMERS TO FOLLOW'
                              : 'SUGGESTED FOR YOU',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.6, color: Colors.grey.shade500),
                    ),
                  ),
                ],
              ),
            ),
            if (isCustomer || isTrader)
              ...suggestions.map((raw) {
                final s = _asUserMap(raw);
                final id = s['id']?.toString() ?? '';
                final name = (s['businessName'] ?? s['name'] ?? '').toString();
                final roleStr = s['role']?.toString() ?? '';
                final already = connectionIds.contains(id);
                final busy = _pendingUserId == id;
                return Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Material(
                    elevation: 1,
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          _NetworkAvatar(name: name, size: 48),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 4),
                                Wrap(
                                  spacing: 6,
                                  children: [
                                    if (roleStr.isNotEmpty) _RoleBadge(roleApi: roleStr),
                                    if ((s['businessName'] != null) && (s['name']?.toString() != s['businessName']?.toString()))
                                      Text(s['name']?.toString() ?? '', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          FilledButton(
                            onPressed: busy ? null : () => _toggleFollow(id, following: already),
                            child: Text(already ? 'Following' : 'Follow'),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              })
            else
              ...suggestions.map((raw) => _suggestionCompactTile(_asUserMap(raw), connectionIds, isVendor)),

          ],

          if (isEmpty) _emptyState(isCustomer, isVendor, role == UserRole.trader || isVendor),
        ],
      ),
    );
  }

  Widget _connectionTile(Map<String, dynamic> c) {
    final id = c['id']?.toString() ?? '';
    final name = (c['businessName'] ?? c['name'] ?? '').toString();
    final roleStr = c['role']?.toString() ?? '';
    final busy = _pendingUserId == id;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _NetworkAvatar(name: name),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                if (roleStr.isNotEmpty) ...[const SizedBox(height: 4), _RoleBadge(roleApi: roleStr)],
              ],
            ),
          ),
          FilledButton.tonal(
            onPressed: busy ? null : () => _toggleFollow(id, following: true),
            child: const Text('Following'),
          ),
        ],
      ),
    );
  }

  Widget _suggestionCompactTile(Map<String, dynamic> u, Set<String> connectionIds, bool isVendor) {
    final id = u['id']?.toString() ?? '';
    final display = (u['businessName'] ?? u['name'] ?? '').toString();
    final roleStr = u['role']?.toString() ?? '';
    final already = connectionIds.contains(id);
    final busy = _pendingUserId == id;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          _NetworkAvatar(name: display),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(display, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                if (roleStr.isNotEmpty) _RoleBadge(roleApi: roleStr),
              ],
            ),
          ),
          if (isVendor)
            already
                ? OutlinedButton(onPressed: busy ? null : () => _toggleFollow(id, following: true), child: const Text('Disconnect'))
                : FilledButton(onPressed: busy ? null : () => _connectTrader(id), child: const Text('Connect'))
          else
            FilledButton.tonal(
              onPressed: busy ? null : () => _toggleFollow(id, following: already),
              child: Text(already ? 'Following' : 'Follow'),
            ),
        ],
      ),
    );
  }

  Widget _emptyState(bool isCustomer, bool isVendor, bool canInvite) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
      child: Column(
        children: [
          Icon(Icons.people_outline, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            isCustomer ? 'Find your traders' : 'No connections yet',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            isCustomer
                ? 'Search for traders to follow and get curated product recommendations'
                : isVendor
                    ? 'Search for traders already on GarmentHub and tap Connect. Use Share invite or + for someone not on the app yet — they can join and follow you for updates.'
                    : canInvite
                        ? 'Share your invite code to connect'
                        : 'Search for vendors and traders to follow',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
          ),
          if (canInvite) ...[
            const SizedBox(height: 20),
            FilledButton.icon(onPressed: _shareInvite, icon: const Icon(Icons.share), label: const Text('Share invite')),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authSessionProvider);
    final role = auth.user?.role;
    final isVendor = role == UserRole.vendor;
    final canInvite = role == UserRole.trader || isVendor;
    final title = isVendor ? 'Connect' : 'People';

    final conn = ref.watch(connectionsProvider);
    final sug = ref.watch(suggestionsProvider);
    final stories = ref.watch(networkStoriesProvider);
    final curated = ref.watch(networkCuratedReceivedProvider);

    final connectionIds = (conn.valueOrNull ?? []).map((c) => _asUserMap(c)['id']?.toString()).whereType<String>().toSet();

    return Scaffold(
      body: Column(
        children: [
          Material(
            elevation: 1,
            color: Theme.of(context).colorScheme.surface,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                child: Row(
                  children: [
                    Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _searchCtrl,
                        decoration: InputDecoration(
                          hintText: isVendor ? 'Search traders by name or phone...' : 'Search name or phone...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          filled: true,
                          fillColor: Colors.grey.shade100,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                          suffixIcon: _searchCtrl.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.close, size: 20),
                                  onPressed: () {
                                    _searchCtrl.clear();
                                    setState(() {
                                      _debouncedQuery = '';
                                      _searchResults = [];
                                    });
                                  },
                                )
                              : null,
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                    ),
                    if (_searchActive)
                      TextButton(
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() {
                            _debouncedQuery = '';
                            _searchResults = [];
                          });
                        },
                        child: const Text('Cancel'),
                      )
                    else if (canInvite)
                      IconButton(
                        tooltip: 'Share invite link',
                        onPressed: _shareInvite,
                        icon: const Icon(Icons.person_add_alt_1_outlined),
                      ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: _searchActive
                ? _buildSearchOverlay(isVendor, canInvite, connectionIds)
                : _buildMain(role, conn, sug, stories, curated),
          ),
        ],
      ),
    );
  }
}
