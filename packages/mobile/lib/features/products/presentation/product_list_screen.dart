import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../home/domain/customer_home_feed.dart';
import '../../home/presentation/home_product_card.dart';
import '../../orders/domain/bulk_order_draft.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';

/// Product search / listing. Query params align with PWA `ProductListing.tsx`:
/// `vendorId`, `traderId` + `traderName`, `categoryId`.
///
/// UI: 2-column grid ([HomeProductCard]), "Show more" pagination (non–trader-view),
/// selection + bottom actions like PWA `SelectionActionBar`.
class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key, required this.initialUri});

  final Uri initialUri;

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  final _search = TextEditingController();
  Timer? _searchDebounce;

  List<Product> _products = [];
  bool _loading = false;
  bool _loadingMore = false;
  String? _error;

  int _page = 1;
  int _totalPages = 1;

  String? _vendorId;
  String? _traderId;
  String? _traderName;
  String? _categoryId;

  bool _isSelecting = false;
  final Set<String> _selectedIds = {};
  bool _bulkBusy = false;

  bool get _isTraderView => _traderId != null && _traderId!.isNotEmpty;

  void _readUri(Uri u) {
    final q = u.queryParameters;
    _vendorId = q['vendorId'];
    _traderId = q['traderId'];
    _traderName = q['traderName'];
    _categoryId = q['categoryId'];
  }

  String get _headerTitle {
    if (_traderName != null && _traderName!.isNotEmpty) {
      return Uri.decodeQueryComponent(_traderName!);
    }
    return 'Search';
  }

  static List<Product> _productsFromTraderShares(String traderId, List<dynamic> rawShares) {
    final normalized = <Map<String, dynamic>>[];
    for (final e in rawShares) {
      if (e is! Map<String, dynamic>) continue;
      normalized.add(normalizeReceivedShareMap(Map<String, dynamic>.from(e)));
    }
    normalized.sort((a, b) {
      final ca = DateTime.tryParse(a['createdAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      final cb = DateTime.tryParse(b['createdAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      return cb.compareTo(ca);
    });

    final seen = <String>{};
    final out = <Product>[];
    for (final share in normalized) {
      final trader = share['trader'];
      if (trader is! Map) continue;
      if (trader['id']?.toString() != traderId) continue;

      final lines = share['lines'] as List? ?? [];
      for (final line in lines) {
        if (line is! Map<String, dynamic>) continue;
        final pm = line['product'];
        if (pm is! Map<String, dynamic>) continue;
        final id = pm['id'] as String?;
        if (id == null || seen.contains(id)) continue;
        seen.add(id);
        out.add(Product.fromJson(Map<String, dynamic>.from(pm)));
      }
    }
    return out;
  }

  List<Product> _filterLocal(List<Product> list, String q) {
    if (q.isEmpty) return list;
    final lower = q.toLowerCase();
    return list.where((p) {
      if (p.name.toLowerCase().contains(lower)) return true;
      final cn = p.categoryName?.toLowerCase() ?? '';
      if (cn.contains(lower)) return true;
      if ('${p.price ?? ''}'.contains(lower)) return true;
      return false;
    }).toList();
  }

  static int _parsePages(Map<String, dynamic> data) {
    final p = data['pagination'];
    if (p is Map && p['pages'] != null) return (p['pages'] as num).toInt().clamp(1, 99999);
    return 1;
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _loading = true;
      _error = null;
      _page = 1;
    });
    try {
      if (_isTraderView) {
        final raw = await ref.read(curationApiProvider).listReceived();
        final list = _productsFromTraderShares(_traderId!, raw);
        if (!mounted) return;
        setState(() {
          _products = list;
          _loading = false;
        });
      } else {
        final data = await ref.read(productApiProvider).list(query: {
          'search': _search.text.trim().isEmpty ? null : _search.text.trim(),
          'vendorId': _vendorId,
          'categoryId': _categoryId,
          'page': 1,
          'limit': 20,
        });
        final list = (data['products'] as List?) ?? [];
        if (!mounted) return;
        setState(() {
          _products = list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
          _totalPages = _parsePages(data);
          _page = 1;
          _loading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = apiErrorMessageVerbose(e);
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_isTraderView || _loadingMore || _page >= _totalPages) return;
    setState(() => _loadingMore = true);
    try {
      final next = _page + 1;
      final data = await ref.read(productApiProvider).list(query: {
        'search': _search.text.trim().isEmpty ? null : _search.text.trim(),
        'vendorId': _vendorId,
        'categoryId': _categoryId,
        'page': next,
        'limit': 20,
      });
      final list = (data['products'] as List?) ?? [];
      if (!mounted) return;
      setState(() {
        _products = [..._products, ...list.map((e) => Product.fromJson(e as Map<String, dynamic>))];
        _page = next;
        _totalPages = _parsePages(data);
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
    }
  }

  void _onSearchTextChanged(String _) {
    if (_isTraderView) {
      setState(() {});
      return;
    }
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      _loadFirstPage();
    });
  }

  void _exitSelection() {
    setState(() {
      _isSelecting = false;
      _selectedIds.clear();
    });
  }

  Future<void> _saveSelected() async {
    if (_selectedIds.isEmpty || _bulkBusy) return;
    setState(() => _bulkBusy = true);
    final n = _selectedIds.length;
    try {
      final api = ref.read(productApiProvider);
      for (final id in _selectedIds) {
        await api.saveProduct(id);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$n saved!')));
        _exitSelection();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _bulkBusy = false);
    }
  }

  Future<void> _skipSelected() async {
    if (_selectedIds.isEmpty || _bulkBusy) return;
    setState(() => _bulkBusy = true);
    final n = _selectedIds.length;
    try {
      await ref.read(workflowApiProvider).markBulk(_selectedIds.toList(), 'SKIPPED');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$n skipped')));
        _exitSelection();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _bulkBusy = false);
    }
  }

  void _orderSelected() {
    if (_selectedIds.isEmpty) return;
    final lines = _selectedIds
        .map((id) => BulkOrderLine(productId: id, quantity: 0))
        .toList();
    final draft = BulkOrderDraft(
      lines: lines,
      traderId: _traderId,
      orderMode: 'DIRECT',
    );
    context.push('/bulk-order', extra: draft);
    _exitSelection();
  }

  void _shareExternal() {
    final n = _selectedIds.length;
    final text = 'Check out these $n products on GarmentHub';
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied!')));
  }

  @override
  void initState() {
    super.initState();
    _readUri(widget.initialUri);
    _loadFirstPage();
  }

  @override
  void didUpdateWidget(covariant ProductListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialUri != widget.initialUri) {
      _searchDebounce?.cancel();
      _readUri(widget.initialUri);
      _exitSelection();
      _loadFirstPage();
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Widget _buildGrid(List<Product> display) {
    final hasBar = _isSelecting && _selectedIds.isNotEmpty && display.isNotEmpty;
    final bottomInset = hasBar ? 88.0 + MediaQuery.of(context).padding.bottom : 16.0;

    if (_loading && display.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!_loading && display.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _isTraderView ? 'No products shared yet' : 'Nothing found',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.grey.shade700),
              ),
              const SizedBox(height: 8),
              Text(
                _isTraderView ? "This trader hasn't shared any products with you" : 'Try a different search',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
      );
    }

    final hasMore = !_isTraderView && _page < _totalPages;

    return Column(
      children: [
        Expanded(
          child: GridView.builder(
            padding: EdgeInsets.fromLTRB(12, 8, 12, bottomInset),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 0.68,
            ),
            itemCount: display.length,
            itemBuilder: (context, i) {
              final p = display[i];
              final selected = _selectedIds.contains(p.id);
              return AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: _isSelecting && selected ? Border.all(color: Theme.of(context).colorScheme.primary, width: 3) : null,
                ),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    HomeProductCard(
                      product: p,
                      subtitle: p.vendorName != null && p.vendorName!.isNotEmpty ? p.vendorName : null,
                      centerHint: 'tap to open',
                      onTap: () {
                        if (_isSelecting) {
                          setState(() {
                            if (selected) {
                              _selectedIds.remove(p.id);
                            } else {
                              _selectedIds.add(p.id);
                            }
                          });
                        } else {
                          context.push('/products/${p.id}');
                        }
                      },
                    ),
                    if (_isSelecting)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Icon(
                          selected ? Icons.check_circle : Icons.circle_outlined,
                          color: selected ? Theme.of(context).colorScheme.primary : Colors.white,
                          shadows: const [Shadow(color: Colors.black54, blurRadius: 4)],
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
        if (_loadingMore) const LinearProgressIndicator(),
        if (hasMore)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _loadingMore ? null : _loadMore,
                child: const Text('Show more'),
              ),
            ),
          ),
      ],
    );
  }

  Widget _selectionBar(UserRole? role) {
    final isCustomer = role == UserRole.customer;
    final isTrader = role == UserRole.trader;

    return Material(
      elevation: 12,
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 10, 8, 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                if (isTrader)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: OutlinedButton.icon(
                      onPressed: _bulkBusy ? null : _skipSelected,
                      icon: const Icon(Icons.visibility_off_outlined, size: 18),
                      label: const Text('Skip'),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: OutlinedButton.icon(
                    onPressed: _bulkBusy ? null : _saveSelected,
                    icon: const Icon(Icons.bookmark_outline, size: 18),
                    label: const Text('Save'),
                  ),
                ),
                if (isTrader)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: FilledButton.tonalIcon(
                      onPressed: _bulkBusy ? null : () => context.push('/trader/share'),
                      icon: const Icon(Icons.people_outline, size: 18),
                      label: const Text('Share'),
                    ),
                  ),
                IconButton.filledTonal(
                  tooltip: 'Copy',
                  onPressed: _shareExternal,
                  icon: const Icon(Icons.send_outlined),
                ),
                if (isCustomer) ...[
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: _bulkBusy ? null : _orderSelected,
                    icon: const Icon(Icons.shopping_bag_outlined),
                    label: Text('Order (${_selectedIds.length})'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
    final display = _isTraderView ? _filterLocal(_products, _search.text.trim()) : _products;
    final showSelect = display.isNotEmpty && !_isSelecting;
    final showBar = _isSelecting && _selectedIds.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        leading: _isSelecting
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: _bulkBusy ? null : _exitSelection,
              )
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/');
                  }
                },
              ),
        title: Text(
          _isSelecting ? '${_selectedIds.length}' : _headerTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          if (showSelect)
            TextButton(
              onPressed: () => setState(() => _isSelecting = true),
              child: const Text('Select'),
            ),
          if (_isSelecting && display.isNotEmpty)
            TextButton(
              onPressed: () => setState(() => _selectedIds.addAll(display.map((p) => p.id))),
              child: const Text('All'),
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _search,
                    decoration: InputDecoration(
                      hintText: 'Search products...',
                      prefixIcon: const Icon(Icons.search, size: 22),
                      suffixIcon: _search.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 20),
                              onPressed: () {
                                _search.clear();
                                if (_isTraderView) {
                                  setState(() {});
                                } else {
                                  _loadFirstPage();
                                }
                              },
                            )
                          : null,
                      filled: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(999), borderSide: BorderSide.none),
                    ),
                    onChanged: (v) {
                      setState(() {});
                      if (!_isTraderView) _onSearchTextChanged(v);
                    },
                    onSubmitted: (_) => _loadFirstPage(),
                  ),
                ),
                IconButton(onPressed: _loadFirstPage, icon: const Icon(Icons.search)),
              ],
            ),
          ),
          if (_loading && _products.isNotEmpty) const LinearProgressIndicator(),
          if (_error != null) Padding(padding: const EdgeInsets.all(8), child: Text(_error!)),
          Expanded(child: _buildGrid(display)),
          if (showBar) _selectionBar(role),
        ],
      ),
    );
  }
}
