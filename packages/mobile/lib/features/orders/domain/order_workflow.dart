import '../../../shared/models/order.dart';
import '../../../shared/models/user.dart';

/// Ports `packages/frontend/src/lib/orderWorkflow.ts` (customer/trader UX labels).

class CustomerDecisionLabel {
  const CustomerDecisionLabel({
    required this.headline,
    this.subline,
    required this.actionRequired,
  });

  final String headline;
  final String? subline;
  final bool actionRequired;
}

CustomerDecisionLabel getCustomerOrderDecisionLabel(Order order, List<OrderItem> items) {
  final status = order.status;
  final orderMode = order.orderMode;
  final traderId = order.traderId;
  final anyPending = items.any((i) => i.status == 'PENDING');
  final anyAltered = items.any((i) => i.status == 'ALTERED');
  final anyAccepted = items.any((i) => i.status == 'ACCEPTED');
  final allRejected = items.isNotEmpty && items.every((i) => i.status == 'REJECTED');

  if (status == 'CONFIRMED') {
    return const CustomerDecisionLabel(
      headline: 'Confirmed',
      subline: 'This order is locked in.',
      actionRequired: false,
    );
  }
  if (status == 'CANCELLED') {
    return const CustomerDecisionLabel(headline: 'Cancelled', actionRequired: false);
  }
  if (status == 'REJECTED' || allRejected) {
    return const CustomerDecisionLabel(
      headline: 'Not fulfilled',
      subline: 'Lines were rejected by vendors.',
      actionRequired: false,
    );
  }
  if (orderMode == 'MANAGED' && traderId != null && order.releasedToVendorsAt == null && status == 'PENDING') {
    return const CustomerDecisionLabel(
      headline: 'Pending from trader',
      subline: 'Your trader will review and forward this to vendors.',
      actionRequired: false,
    );
  }
  if (anyPending) {
    final withTrader = orderMode == 'MANAGED' && traderId != null;
    return CustomerDecisionLabel(
      headline: 'Pending from vendors',
      subline: withTrader
          ? 'Waiting on supplier responses. Your trader can help follow up.'
          : 'Waiting on supplier responses to your lines.',
      actionRequired: false,
    );
  }
  final needsCustomerConfirm = !anyPending &&
      (anyAltered || anyAccepted || status == 'ACCEPTED' || status == 'PARTIALLY_ACCEPTED');
  if (needsCustomerConfirm) {
    return const CustomerDecisionLabel(
      headline: 'Pending from me',
      subline: 'Review supplier responses and confirm or adjust below.',
      actionRequired: true,
    );
  }
  return const CustomerDecisionLabel(headline: 'In progress', actionRequired: false);
}

class TraderStage {
  const TraderStage({
    required this.stageLabel,
    required this.detail,
    required this.actionRequired,
  });

  final String stageLabel;
  final String detail;
  final bool actionRequired;
}

TraderStage getTraderOrderStage(Order order, List<OrderItem> items) {
  final isManaged = order.orderMode == 'MANAGED';
  final anyPending = items.any((i) => i.status == 'PENDING');
  final anyAltered = items.any((i) => i.status == 'ALTERED');
  final anyAccepted = items.any((i) => i.status == 'ACCEPTED');
  final allLinesPending = items.isNotEmpty && items.every((i) => i.status == 'PENDING');

  if (order.status == 'CONFIRMED') {
    return const TraderStage(stageLabel: 'Complete', detail: 'Buyer confirmed.', actionRequired: false);
  }
  if (isManaged && order.releasedToVendorsAt == null && order.status == 'PENDING') {
    return const TraderStage(
      stageLabel: 'Pending from me',
      detail: 'Review quantities, your favored unit prices, and note, then send to vendors.',
      actionRequired: true,
    );
  }
  if (anyPending && allLinesPending && order.releasedToVendorsAt != null) {
    return TraderStage(
      stageLabel: 'Pending from vendors',
      detail: isManaged
          ? 'Suppliers have not responded yet. You can still revise this order.'
          : 'Suppliers have not responded yet. You can still revise quantities, your favored unit prices, and the note.',
      actionRequired: true,
    );
  }
  if (anyPending) {
    return const TraderStage(
      stageLabel: 'Pending from vendors',
      detail: 'One or more lines are still waiting on supplier responses.',
      actionRequired: false,
    );
  }
  if (anyAltered || anyAccepted) {
    return const TraderStage(
      stageLabel: 'Pending from customer',
      detail: 'Waiting for the buyer to confirm or revise.',
      actionRequired: true,
    );
  }
  return TraderStage(
    stageLabel: isManaged ? 'Managed — monitoring' : 'Direct — monitoring',
    detail: isManaged
        ? 'No blocker right now — watch pricing and follow-up.'
        : 'Buyer is working with suppliers on this direct order.',
    actionRequired: false,
  );
}

bool isPendingActionFromViewer(Order order, List<OrderItem> items, UserRole role, String viewerUserId) {
  if (role == UserRole.customer && order.customerId == viewerUserId) {
    return getCustomerOrderDecisionLabel(order, items).actionRequired;
  }
  if (role == UserRole.trader && order.traderId == viewerUserId) {
    return order.orderMode == 'MANAGED' && order.status == 'PENDING' && order.releasedToVendorsAt == null;
  }
  return false;
}

enum NeedByUrgency { none, urgent, overdue }

NeedByUrgency getCustomerNeedByUrgency(String? customerNeedByIso, [int nowMs = 0]) {
  final now = nowMs == 0 ? DateTime.now().millisecondsSinceEpoch : nowMs;
  if (customerNeedByIso == null || customerNeedByIso.isEmpty) return NeedByUrgency.none;
  final deadline = DateTime.tryParse(customerNeedByIso)?.millisecondsSinceEpoch;
  if (deadline == null) return NeedByUrgency.none;
  if (now > deadline) return NeedByUrgency.overdue;
  if (deadline - now <= 48 * 3600000) return NeedByUrgency.urgent;
  return NeedByUrgency.none;
}
