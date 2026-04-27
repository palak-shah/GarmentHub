import type { ItemStatus, Order, OrderItem, Role } from '@/types';

export type CustomerDecisionLabel = {
  headline: string;
  subline?: string;
  badgeClass: string;
  actionRequired: boolean;
};

/** Customer-facing order status (decision screen). */
export function getCustomerOrderDecisionLabel(order: Order, items: OrderItem[]): CustomerDecisionLabel {
  const { status, orderMode, traderId } = order;
  const anyPending = items.some((i) => i.status === 'PENDING');
  const anyAltered = items.some((i) => i.status === 'ALTERED');
  const anyAccepted = items.some((i) => i.status === 'ACCEPTED');
  const allRejected = items.length > 0 && items.every((i) => i.status === 'REJECTED');

  if (status === 'CONFIRMED') {
    return {
      headline: 'Confirmed',
      subline: 'This order is locked in.',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      actionRequired: false,
    };
  }

  if (status === 'CANCELLED') {
    return {
      headline: 'Cancelled',
      badgeClass: 'bg-gray-200 text-gray-700',
      actionRequired: false,
    };
  }

  if (status === 'REJECTED' || allRejected) {
    return {
      headline: 'Not fulfilled',
      subline: 'Lines were rejected by vendors.',
      badgeClass: 'bg-red-100 text-red-800',
      actionRequired: false,
    };
  }

  if (orderMode === 'MANAGED' && traderId && !order.releasedToVendorsAt && status === 'PENDING') {
    return {
      headline: 'Pending from trader',
      subline: 'Your trader will review and forward this to vendors.',
      badgeClass: 'bg-primary-100 text-primary-900',
      actionRequired: false,
    };
  }

  if (anyPending) {
    const withTrader = orderMode === 'MANAGED' && traderId;
    return {
      headline: 'Pending from vendors',
      subline: withTrader
        ? 'Waiting on supplier responses. Your trader can help follow up.'
        : 'Waiting on supplier responses to your lines.',
      badgeClass: 'bg-sky-100 text-sky-900',
      actionRequired: false,
    };
  }

  const needsCustomerConfirm =
    !anyPending &&
    (anyAltered ||
      anyAccepted ||
      status === 'ACCEPTED' ||
      status === 'PARTIALLY_ACCEPTED');

  if (needsCustomerConfirm) {
    return {
      headline: 'Pending from me',
      subline: 'Review supplier responses and confirm or adjust below.',
      badgeClass: 'bg-amber-100 text-amber-900',
      actionRequired: true,
    };
  }

  return {
    headline: 'In progress',
    badgeClass: 'bg-blue-100 text-blue-800',
    actionRequired: false,
  };
}

export type TraderStage = {
  stageLabel: string;
  detail: string;
  actionRequired: boolean;
};

export function getTraderOrderStage(order: Order, items: OrderItem[]): TraderStage {
  const isManaged = order.orderMode === 'MANAGED';
  const anyPending = items.some((i) => i.status === 'PENDING');
  const anyAltered = items.some((i) => i.status === 'ALTERED');
  const anyAccepted = items.some((i) => i.status === 'ACCEPTED');
  const allLinesPending = items.length > 0 && items.every((i) => i.status === 'PENDING');

  if (order.status === 'CONFIRMED') {
    return { stageLabel: 'Complete', detail: 'Buyer confirmed.', actionRequired: false };
  }

  if (isManaged && !order.releasedToVendorsAt && order.status === 'PENDING') {
    return {
      stageLabel: 'Pending from me',
      detail: 'Review quantities, your favored unit prices, and note, then send to vendors.',
      actionRequired: true,
    };
  }

  if (anyPending && allLinesPending && order.releasedToVendorsAt) {
    return {
      stageLabel: 'Pending from vendors',
      detail: isManaged
        ? 'Suppliers have not responded yet. You can still revise this order.'
        : 'Suppliers have not responded yet. You can still revise quantities, your favored unit prices, and the note.',
      actionRequired: true,
    };
  }

  if (anyPending) {
    return {
      stageLabel: 'Pending from vendors',
      detail: 'One or more lines are still waiting on supplier responses.',
      actionRequired: false,
    };
  }

  if (anyAltered || anyAccepted) {
    return {
      stageLabel: 'Pending from customer',
      detail: 'Waiting for the buyer to confirm or revise.',
      actionRequired: true,
    };
  }

  return {
    stageLabel: isManaged ? 'Managed — monitoring' : 'Direct — monitoring',
    detail: isManaged
      ? 'No blocker right now — watch pricing and follow-up.'
      : 'Buyer is working with suppliers on this direct order.',
    actionRequired: false,
  };
}

/**
 * True when this order needs an action from the signed-in user (for Orders "Pending from me" tab).
 * Customers: confirm/adjust after vendor responses (`getCustomerOrderDecisionLabel.actionRequired`).
 * Traders: only managed orders still on the trader — not yet released to vendors (review & send).
 * Once `releasedToVendorsAt` is set, the order leaves this tab for traders.
 */
export function isPendingActionFromViewer(
  order: Order,
  items: OrderItem[],
  role: Role,
  viewerUserId: string,
): boolean {
  if (role === 'CUSTOMER' && order.customerId === viewerUserId) {
    return getCustomerOrderDecisionLabel(order, items).actionRequired;
  }
  if (role === 'TRADER' && order.traderId === viewerUserId) {
    return (
      order.orderMode === 'MANAGED' &&
      order.status === 'PENDING' &&
      !order.releasedToVendorsAt
    );
  }
  return false;
}

export function lineApprovedQtyLabel(status: ItemStatus): string {
  if (status === 'ALTERED') return 'Offered';
  if (status === 'ACCEPTED' || status === 'CONFIRMED') return 'Accepted';
  if (status === 'REJECTED') return 'Rejected';
  return 'Approved';
}

export function effectiveUnitPrice(item: OrderItem): number | null {
  return (
    item.agreedUnitPrice ??
    item.offeredUnitPrice ??
    item.traderCounterUnitPrice ??
    item.traderTargetUnitPrice ??
    item.product.price ??
    null
  );
}

export function approvedQtyForLine(it: OrderItem): number {
  if (it.status === 'REJECTED' || it.status === 'PENDING') return 0;
  if (it.acceptedQty != null) return it.acceptedQty;
  if (it.status === 'ACCEPTED' || it.status === 'CONFIRMED') return it.requestedQty;
  return 0;
}

export function computeOrderTotals(items: OrderItem[]): {
  itemCount: number;
  requestedTotal: number;
  approvedTotal: number;
  priceTotal: number | null;
  /** Sum of requestedQty × effective unit (e.g. trader target + list) when every line has a unit price. */
  requestedPriceTotal: number | null;
} {
  let requestedTotal = 0;
  let approvedTotal = 0;
  let priceSum = 0;
  let hasPrice = false;
  let requestedSum = 0;
  let hasRequestedPrice = true;

  for (const it of items) {
    requestedTotal += it.requestedQty;
    const qty = approvedQtyForLine(it);
    approvedTotal += qty;
    const unit = effectiveUnitPrice(it);
    if (unit != null && qty > 0) {
      hasPrice = true;
      priceSum += unit * qty;
    }
    if (unit != null) {
      requestedSum += unit * it.requestedQty;
    } else {
      hasRequestedPrice = false;
    }
  }

  return {
    itemCount: items.length,
    requestedTotal,
    approvedTotal,
    priceTotal: hasPrice ? priceSum : null,
    requestedPriceTotal: hasRequestedPrice && items.length > 0 ? requestedSum : null,
  };
}

export function formatRelativeOrderAge(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export type NeedByUrgency = 'none' | 'urgent' | 'overdue';

const MS_48H = 48 * 3600000;

/**
 * `customerNeedBy` from API is end of chosen calendar day UTC (ISO string).
 * - overdue: now is after that instant
 * - urgent: before deadline and within 48h of deadline
 */
export function getCustomerNeedByUrgency(
  customerNeedByIso: string | null | undefined,
  nowMs: number = Date.now(),
): NeedByUrgency {
  if (!customerNeedByIso) return 'none';
  const deadline = new Date(customerNeedByIso).getTime();
  if (Number.isNaN(deadline)) return 'none';
  if (nowMs > deadline) return 'overdue';
  if (deadline - nowMs <= MS_48H) return 'urgent';
  return 'none';
}
