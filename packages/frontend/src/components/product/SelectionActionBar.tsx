import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, ShoppingBag, Bookmark, Users, EyeOff } from 'lucide-react';
import { useSelectionStore } from '@/store/selectionStore';
import { useAuthStore } from '@/store/authStore';
import { productApi } from '@/api/product.api';
import { workflowApi } from '@/api/workflow.api';

export function SelectionActionBar() {
  const { selectedIds, isSelecting, clearSelection } = useSelectionStore();
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const count = selectedIds.size;

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedIds) {
        await productApi.saveProduct(id);
      }
    },
    onSuccess: () => {
      toast.success(`${count} saved!`);
      queryClient.invalidateQueries({ queryKey: ['saved-products'] });
    },
    onError: () => toast.error('Save failed'),
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      await workflowApi.markBulk(Array.from(selectedIds), 'SKIPPED');
    },
    onSuccess: () => {
      toast.success(`${count} skipped`);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-feed'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-counts'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-unseen'] });
    },
    onError: () => toast.error('Skip failed'),
  });

  if (!isSelecting || count === 0) return null;

  const isTrader = role === 'TRADER';
  const isCustomer = role === 'CUSTOMER';

  const handleShare = async () => {
    const text = `Check out these ${count} products on GarmentHub`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GarmentHub', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied!');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)] pb-[max(12px,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => skipMutation.mutate()}
            disabled={skipMutation.isPending}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50 min-h-[52px]"
          >
            <EyeOff className="h-4 w-4" />
            Skip
          </button>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50 min-h-[52px]"
          >
            <Bookmark className="h-4 w-4" />
            Save
          </button>

          {isTrader && (
            <button
              onClick={() => navigate('/trader/share')}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-primary-200 bg-primary-50 px-3 py-3 text-sm font-semibold text-primary-700 active:bg-primary-100 min-h-[52px]"
            >
              <Users className="h-4 w-4" />
              Share
            </button>
          )}

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50 min-h-[52px]"
          >
            <Send className="h-4 w-4" />
          </button>

          {isCustomer && (
            <button
              onClick={() => navigate('/bulk-order')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white active:bg-primary-700 min-h-[52px]"
            >
              <ShoppingBag className="h-5 w-5" />
              Order ({count})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
