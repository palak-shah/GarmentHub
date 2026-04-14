import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShoppingBag } from 'lucide-react';
import { orderApi } from '@/api/order.api';
import { useCartStore } from '@/store/cartStore';
import { Header } from '@/components/layout/Header';
import { CartItem } from '@/components/cart/CartItem';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Cart() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const placeOrder = useMutation({
    mutationFn: () =>
      orderApi.create({
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      }),
    onSuccess: () => {
      clear();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order placed successfully!');
      navigate('/orders');
    },
    onError: () => toast.error('Failed to place order'),
  });

  if (items.length === 0) {
    return (
      <>
        <Header title="Cart" />
        <EmptyState
          title="Your cart is empty"
          description="Browse products and add them to your cart"
          icon={<ShoppingBag className="h-16 w-16" />}
          action={
            <Button onClick={() => navigate('/search')}>Browse Products</Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <Header title={`Cart (${items.length})`} />
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="space-y-3">
          {items.map((item) => (
            <CartItem key={item.product.id} item={item} />
          ))}
        </div>

        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total items</span>
            <span className="font-medium">{items.reduce((s, i) => s + i.quantity, 0)} units</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-gray-600">Products from</span>
            <span className="font-medium">
              {new Set(items.map((i) => i.product.vendorId)).size} vendor(s)
            </span>
          </div>
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => placeOrder.mutate()}
            loading={placeOrder.isPending}
          >
            Place Order
          </Button>
          <p className="mt-2 text-center text-xs text-gray-500">
            Order will be split by vendor automatically
          </p>
        </div>
      </div>
    </>
  );
}
