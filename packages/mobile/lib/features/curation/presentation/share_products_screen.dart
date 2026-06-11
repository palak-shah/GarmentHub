import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';
import '../../../shared/widgets/gh_labeled_field.dart';
import '../domain/trader_share_line.dart';

/// WhatsApp prefilled body (~4k limit); trim so send works (PWA parity).
const _kMaxWhatsAppChars = 3800;

String _buildWhatsAppPrefillText(List<String> productNames, String note, String appOrigin) {
  final lines = <String>[
    "I've shared a curated selection with you on GarmentHub — open the app and check Home.",
    '',
    ...productNames.map((n) => '• $n'),
  ];
  if (note.trim().isNotEmpty) lines.addAll(['', note.trim()]);
  lines.addAll(['', 'Open app: $appOrigin/']);
  var text = lines.join('\n');
  if (text.length > _kMaxWhatsAppChars) {
    text = '${text.substring(0, _kMaxWhatsAppChars - 1)}…';
  }
  return text;
}

String _appOrigin() {
  try {
    final o = Uri.base.origin;
    if (o.isNotEmpty && o != 'null') return o;
  } catch (_) {}
  return 'https://garmenthub.in';
}

class ShareProductsScreen extends ConsumerStatefulWidget {
  const ShareProductsScreen({super.key, this.initialProductId, this.initialGalleryLines});

  final String? initialProductId;
  final List<TraderShareLine>? initialGalleryLines;

  @override
  ConsumerState<ShareProductsScreen> createState() => _ShareProductsScreenState();
}

class _ShareProductsScreenState extends ConsumerState<ShareProductsScreen> {
  final _productIds = TextEditingController();
  final _note = TextEditingController();
  String _orderMode = 'DIRECT';
  bool _submitting = false;

  late final List<TraderShareLine>? _galleryLines;

  bool _metaLoading = true;
  String? _metaError;
  List<Map<String, dynamic>> _customers = [];
  List<Map<String, dynamic>> _groups = [];
  final Map<String, Product> _productById = {};
  final Map<String, String> _imageUrlByAssetId = {};
  final Set<String> _selectedCustomers = {};
  final Set<String> _selectedGroups = {};
  final Map<String, TextEditingController> _offerControllers = {};

  List<String> get _previewProductIds {
    final gl = _galleryLines;
    if (gl != null && gl.isNotEmpty) {
      return gl.map((e) => e.productId).toSet().toList();
    }
    final single = widget.initialProductId?.trim();
    if (single != null && single.isNotEmpty) return [single];
    return _productIds.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _galleryLines = widget.initialGalleryLines != null && widget.initialGalleryLines!.isNotEmpty
        ? List<TraderShareLine>.from(widget.initialGalleryLines!)
        : null;
    final pid = widget.initialProductId?.trim();
    if (_galleryLines == null && pid != null && pid.isNotEmpty) {
      _productIds.text = pid;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _bootstrap() async {
    setState(() {
      _metaLoading = true;
      _metaError = null;
    });
    try {
      final curation = ref.read(curationApiProvider);
      final products = ref.read(productApiProvider);
      final customersRaw = await curation.getCustomers();
      final groupsRaw = await curation.listCustomerGroups();
      _customers = _coerceMapList(customersRaw);
      _groups = _coerceMapList(groupsRaw);

      final ids = _previewProductIds;
      if (ids.isEmpty) {
        _syncOfferControllers([]);
        setState(() {
          _metaLoading = false;
          _productById.clear();
          _imageUrlByAssetId.clear();
        });
        return;
      }

      _productById.clear();
      _imageUrlByAssetId.clear();
      for (final id in ids) {
        final map = await products.getById(id);
        final p = Product.fromJson(map);
        _productById[id] = p;
        final assets = map['imageAssets'] ?? map['image_assets'];
        if (assets is List) {
          for (final a in assets) {
            if (a is! Map) continue;
            final m = Map<String, dynamic>.from(a);
            final iid = m['id']?.toString();
            final url = m['url']?.toString();
            if (iid != null && iid.isNotEmpty && url != null && url.isNotEmpty) {
              _imageUrlByAssetId[iid] = url;
            }
          }
        }
      }
      _syncOfferControllers(ids);
      if (mounted) {
        setState(() => _metaLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _metaLoading = false;
          _metaError = apiErrorMessage(e);
        });
      }
    }
  }

  List<Map<String, dynamic>> _coerceMapList(List<dynamic> raw) {
    final out = <Map<String, dynamic>>[];
    for (final e in raw) {
      if (e is Map) out.add(Map<String, dynamic>.from(e));
    }
    return out;
  }

  String? _imageUrlForLine(TraderShareLine line) {
    final imgId = line.productImageId;
    if (imgId == null || imgId.isEmpty) return null;
    final u = _imageUrlByAssetId[imgId];
    if (u == null || u.isEmpty) return null;
    return Environment.resolveMediaUrl(u);
  }

  String _customerLabel(Map<String, dynamic> c) {
    final bn = c['businessName']?.toString().trim();
    if (bn != null && bn.isNotEmpty) return bn;
    return c['name']?.toString().trim().isNotEmpty == true ? c['name'].toString() : 'Customer';
  }

  int _groupMemberCount(Map<String, dynamic> g) {
    final cnt = g['_count'];
    if (cnt is Map && cnt['members'] is num) return (cnt['members'] as num).toInt();
    return 0;
  }

  String _formatListPrice(Product p) {
    final min = p.price;
    final rawMax = p.raw['priceMax'];
    final max = rawMax is num ? rawMax.toDouble() : null;
    if (min == null && max == null) return '—';
    if (min != null && max != null && max != min) {
      return '₹${_fmt(min)} – ₹${_fmt(max)} / unit';
    }
    if (min != null) return '₹${_fmt(min)} / unit';
    if (max != null) return '₹${_fmt(max)} / unit';
    return '—';
  }

  String _fmt(double v) {
    if (v == v.roundToDouble()) return v.round().toString();
    return v.toStringAsFixed(0);
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

  @override
  void dispose() {
    for (final c in _offerControllers.values) {
      c.dispose();
    }
    _offerControllers.clear();
    _productIds.dispose();
    _note.dispose();
    super.dispose();
  }

  String _offerText(String productId) => _offerControllers[productId]?.text.trim() ?? '';

  void _syncOfferControllers(List<String> productIds) {
    for (final key in _offerControllers.keys.toList()) {
      if (!productIds.contains(key)) {
        _offerControllers.remove(key)?.dispose();
      }
    }
    for (final id in productIds) {
      _offerControllers.putIfAbsent(id, TextEditingController.new);
    }
  }

  bool get _hasRecipients => _selectedCustomers.isNotEmpty || _selectedGroups.isNotEmpty;

  String _recipientHint() {
    if (_selectedCustomers.isNotEmpty && _selectedGroups.isNotEmpty) {
      return '${_selectedCustomers.length} individual(s) + ${_selectedGroups.length} group(s)';
    }
    if (_selectedGroups.isNotEmpty) return '${_selectedGroups.length} group(s)';
    return '${_selectedCustomers.length} customer(s)';
  }

  Future<void> _submit({required bool openWhatsApp}) async {
    if (!_hasRecipients) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one customer or a customer group')),
      );
      return;
    }

    final gl = _galleryLines;
    final previewIds = _previewProductIds;
    for (final id in previewIds) {
      final raw = _offerText(id);
      if (raw.isEmpty) continue;
      final n = double.tryParse(raw);
      if (n == null || n <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a positive price per product, or leave blank to use the list price')),
        );
        return;
      }
    }

    final body = <String, dynamic>{
      'customerIds': _selectedCustomers.toList(),
      'customerGroupIds': _selectedGroups.toList(),
      'orderMode': _orderMode,
      if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(),
    };

    if (gl != null && gl.isNotEmpty) {
      body['products'] = gl.map((e) {
        final m = Map<String, dynamic>.from(e.toApi());
        final raw = _offerText(e.productId);
        if (raw.isNotEmpty) {
          final n = double.tryParse(raw);
          if (n != null && n > 0) m['traderOfferUnitPrice'] = n;
        }
        return m;
      }).toList();
    } else {
      final pids = _productIds.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      if (pids.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter product IDs or pick photos from the gallery')));
        return;
      }
      body['products'] = pids.map((id) {
        final m = <String, dynamic>{'productId': id};
        final raw = _offerText(id);
        if (raw.isNotEmpty) {
          final n = double.tryParse(raw);
          if (n != null && n > 0) m['traderOfferUnitPrice'] = n;
        }
        return m;
      }).toList();
    }

    setState(() => _submitting = true);
    try {
      await ref.read(curationApiProvider).createShare(body);
      if (!mounted) return;

      if (openWhatsApp && _productById.isNotEmpty) {
        final names = _productById.values.map((p) => p.name).toList();
        final msg = _buildWhatsAppPrefillText(names, _note.text, _appOrigin());
        final uri = Uri.parse('https://wa.me/?text=${Uri.encodeComponent(msg)}');
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(openWhatsApp ? 'Shared! Pick a WhatsApp chat to notify.' : 'Share sent')),
      );
      context.go('/');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _toggleCustomer(String id) {
    setState(() {
      if (_selectedCustomers.contains(id)) {
        _selectedCustomers.remove(id);
      } else {
        _selectedCustomers.add(id);
      }
    });
  }

  void _toggleGroup(String id) {
    setState(() {
      if (_selectedGroups.contains(id)) {
        _selectedGroups.remove(id);
      } else {
        _selectedGroups.add(id);
      }
    });
  }

  void _selectAllCustomers() {
    if (_customers.length <= 1) return;
    final allIds = _customers.map((c) => c['id']?.toString() ?? '').where((e) => e.isNotEmpty).toList();
    final allSelected = allIds.isNotEmpty && allIds.every(_selectedCustomers.contains);
    setState(() {
      if (allSelected) {
        _selectedCustomers.clear();
      } else {
        _selectedCustomers
          ..clear()
          ..addAll(allIds);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final gallery = _galleryLines;

    final previewIds = _previewProductIds;
    final barTitle = gallery != null && gallery.isNotEmpty
        ? 'Share ${gallery.length} photo${gallery.length == 1 ? '' : 's'}'
        : (previewIds.isEmpty ? 'Share' : 'Share ${previewIds.length} item${previewIds.length == 1 ? '' : 's'}');

    if (_metaLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(barTitle)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_metaError != null) {
      return Scaffold(
        appBar: AppBar(title: Text(barTitle)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_metaError!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(onPressed: _bootstrap, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }

    final allCustomerIds = _customers.map((c) => c['id']?.toString() ?? '').where((e) => e.isNotEmpty).toList();
    final allSelected = allCustomerIds.isNotEmpty && allCustomerIds.every(_selectedCustomers.contains);

    if (previewIds.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Share')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Select products or photos first, then open Share again.',
              textAlign: TextAlign.center,
              style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(barTitle)),
      bottomNavigationBar: Material(
        elevation: 8,
        color: scheme.surface,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: _submitting || !_hasRecipients ? null : () => _submit(openWhatsApp: false),
                    child: _submitting
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(_hasRecipients ? 'Share (${_recipientHint()})' : 'Share (pick recipients)'),
                  ),
                ),
                const SizedBox(width: 10),
                IconButton.filledTonal(
                  style: IconButton.styleFrom(
                    minimumSize: const Size(52, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _submitting || !_hasRecipients ? null : () => _submit(openWhatsApp: true),
                  tooltip: 'Share and open WhatsApp',
                  icon: const Icon(Icons.chat, color: Color(0xFF25D366)),
                ),
              ],
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          if (gallery != null && gallery.isNotEmpty) ...[
            Text('Selected photos', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              'These catalog photos will be sent as one curated share.',
              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 88,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: gallery.length,
                separatorBuilder: (context, index) => const SizedBox(width: 10),
                itemBuilder: (context, i) {
                  final line = gallery[i];
                  final url = _imageUrlForLine(line);
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: AspectRatio(
                      aspectRatio: 1,
                      child: url == null || url.isEmpty
                          ? ColoredBox(
                              color: scheme.surfaceContainerHighest,
                              child: Icon(Icons.image_not_supported_outlined, color: scheme.onSurfaceVariant),
                            )
                          : Image.network(
                              url,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => ColoredBox(
                                color: scheme.surfaceContainerHighest,
                                child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant),
                              ),
                            ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 20),
          ] else ...[
            GhLabeledField(
              label: 'Product IDs',
              child: TextField(
                controller: _productIds,
                decoration: _deco(context).copyWith(hintText: 'id1, id2, …'),
                maxLines: 2,
                onSubmitted: (_) => _bootstrap(),
              ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: _bootstrap,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Load preview'),
              ),
            ),
            const SizedBox(height: 8),
          ],
          Row(
            children: [
              Text('Send to individuals', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              const Spacer(),
              if (allCustomerIds.length > 1)
                TextButton.icon(
                  onPressed: _selectAllCustomers,
                  icon: Icon(allSelected ? Icons.check_circle : Icons.circle_outlined, size: 18),
                  label: Text(allSelected ? 'Clear all' : 'All'),
                ),
            ],
          ),
          const SizedBox(height: 6),
          if (_customers.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'No linked buyers yet (nobody follows you, and you don’t follow any customers yet).',
                textAlign: TextAlign.center,
                style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
            )
          else
            ..._customers.map((c) {
              final id = c['id']?.toString() ?? '';
              if (id.isEmpty) return const SizedBox.shrink();
              final label = _customerLabel(c);
              final sel = _selectedCustomers.contains(id);
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: sel ? scheme.primaryContainer.withValues(alpha: 0.35) : scheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => _toggleCustomer(id),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: scheme.primaryContainer,
                            child: Text(
                              label.isNotEmpty ? label[0].toUpperCase() : '?',
                              style: TextStyle(fontWeight: FontWeight.w700, color: scheme.onPrimaryContainer),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(child: Text(label, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600))),
                          Icon(sel ? Icons.check_circle : Icons.circle_outlined, color: sel ? scheme.primary : scheme.outline),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          const SizedBox(height: 16),
          Row(
            children: [
              Text('Send to groups', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              const Spacer(),
              TextButton(
                onPressed: () => context.push('/trader/groups'),
                child: const Text('Manage groups'),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (_groups.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: scheme.outlineVariant, style: BorderStyle.solid),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'No customer groups yet. Create one to share to many buyers at once.',
                    textAlign: TextAlign.center,
                    style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                  ),
                  TextButton(
                    onPressed: () => context.push('/trader/groups'),
                    child: const Text('Create or manage groups'),
                  ),
                ],
              ),
            )
          else
            ..._groups.map((g) {
              final id = g['id']?.toString() ?? '';
              if (id.isEmpty) return const SizedBox.shrink();
              final name = g['name']?.toString() ?? 'Group';
              final n = _groupMemberCount(g);
              final sel = _selectedGroups.contains(id);
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Material(
                  color: sel ? scheme.tertiaryContainer.withValues(alpha: 0.45) : scheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => _toggleGroup(id),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: scheme.tertiaryContainer,
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: TextStyle(fontWeight: FontWeight.w700, color: scheme.onTertiaryContainer),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, style: text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                                Text(
                                  '$n member${n == 1 ? '' : 's'}',
                                  style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant),
                                ),
                              ],
                            ),
                          ),
                          Icon(sel ? Icons.check_circle : Icons.circle_outlined, color: sel ? scheme.tertiary : scheme.outline),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          const SizedBox(height: 20),
          Text('Your offer to the customer (optional)', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            'Set a better unit price per product if you want — it applies to every selected photo from that product. Leave blank to use the vendor list price.',
            style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 12),
          for (final id in previewIds)
            if (_productById[id] != null && _offerControllers[id] != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _OfferProductCard(
                  product: _productById[id]!,
                  listLabel: _formatListPrice(_productById[id]!),
                  offerController: _offerControllers[id]!,
                  deco: _deco(context),
                ),
              ),
          const SizedBox(height: 8),
          Text('Add a note (optional)', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(
            controller: _note,
            decoration: _deco(context).copyWith(hintText: 'e.g. Good quality, check this lot'),
            maxLines: 3,
          ),
          const SizedBox(height: 20),
          Text('Order workflow', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _OrderModeTile(
                  selected: _orderMode == 'DIRECT',
                  title: 'Direct',
                  subtitle: 'Customer → Vendor (you observe)',
                  onTap: () => setState(() => _orderMode = 'DIRECT'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _OrderModeTile(
                  selected: _orderMode == 'MANAGED',
                  title: 'Managed',
                  subtitle: 'Customer → You → Vendor',
                  onTap: () => setState(() => _orderMode = 'MANAGED'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'You are always in the loop regardless of the mode.',
            style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

class _OfferProductCard extends StatelessWidget {
  const _OfferProductCard({
    required this.product,
    required this.listLabel,
    required this.offerController,
    required this.deco,
  });

  final Product product;
  final String listLabel;
  final TextEditingController offerController;
  final InputDecoration deco;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final thumb = product.primaryImageUrl;
    return Material(
      color: scheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 64,
                height: 64,
                child: thumb.isEmpty
                    ? ColoredBox(color: scheme.surfaceContainerHighest, child: Icon(Icons.image_outlined, color: scheme.onSurfaceVariant))
                    : Image.network(
                        thumb,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => ColoredBox(
                          color: scheme.surfaceContainerHighest,
                          child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant),
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('List: $listLabel', style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant)),
                  const SizedBox(height: 8),
                  Text('Favored price / unit', style: text.labelSmall?.copyWith(fontWeight: FontWeight.w700, color: scheme.primary)),
                  TextField(
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: deco.copyWith(hintText: 'Optional'),
                    controller: offerController,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderModeTile extends StatelessWidget {
  const _OrderModeTile({
    required this.selected,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Material(
      color: selected ? scheme.primaryContainer.withValues(alpha: 0.4) : scheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: selected ? scheme.primary : scheme.outlineVariant, width: selected ? 2 : 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title, textAlign: TextAlign.center, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: text.labelSmall?.copyWith(color: selected ? scheme.onPrimaryContainer : scheme.onSurfaceVariant, height: 1.25),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
