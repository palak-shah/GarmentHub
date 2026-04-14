import { Trash2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/utils/formatters';
import type { CartItem as CartItemType } from '@/types';

export function CartItem({ item }: { item: CartItemType }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {item.product.images[0] ? (
          <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">No img</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h3>
        <p className="text-xs text-gray-500">{formatPrice(item.product.price)}</p>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-gray-500">Qty:</label>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
            min={1}
            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      </div>
      <button
        onClick={() => removeItem(item.product.id)}
        className="self-start rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
