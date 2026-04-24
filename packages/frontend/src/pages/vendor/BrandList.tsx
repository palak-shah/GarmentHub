import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { brandApi } from '@/api/brand.api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Brand } from '@/types';

export default function BrandList() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: brands, isLoading } = useQuery({
    queryKey: ['vendor-brands', userId],
    queryFn: () => brandApi.listMy(),
    enabled: !!userId,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => brandApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-brands'] });
      setNewName('');
      toast.success('Brand created');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => brandApi.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-brands'] });
      setEditingId(null);
      toast.success('Brand updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => brandApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-brands'] });
      toast.success('Brand deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  function startEdit(brand: Brand) {
    setEditingId(brand.id);
    setEditName(brand.name);
  }

  function submitEdit() {
    if (!editingId || !editName.trim()) return;
    updateMut.mutate({ id: editingId, name: editName.trim() });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    createMut.mutate(newName.trim());
  }

  return (
    <>
      <Header title="My Brands" />
      <div className="mx-auto max-w-4xl px-4 py-4 space-y-4">
        {/* Add new brand */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New brand name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <Button onClick={handleCreate} loading={createMut.isPending} disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {!userId || isLoading ? (
          <PageSpinner />
        ) : !brands || brands.length === 0 ? (
          <EmptyState
            title="No brands yet"
            description="Create your first brand to organize your products"
          />
        ) : (
          <div className="space-y-2">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                {editingId === brand.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                    <button
                      onClick={submitEdit}
                      className="rounded-full p-1.5 text-green-600 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900">{brand.name}</h3>
                      <p className="text-xs text-gray-500">
                        {brand._count?.products ?? 0} product{(brand._count?.products ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(brand)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${brand.name}"?`)) deleteMut.mutate(brand.id);
                      }}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
