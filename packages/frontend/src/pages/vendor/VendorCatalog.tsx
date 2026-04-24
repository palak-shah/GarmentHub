import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { vendorApi } from '@/api/vendor.api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSpinner } from '@/components/ui/Spinner';
import type { VendorCatalogCategory } from '@/types';

export default function VendorCatalog() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: categories, isLoading } = useQuery({
    queryKey: ['vendor-catalog', userId],
    queryFn: () => vendorApi.getCatalogCategories(),
    enabled: !!userId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-catalog'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-product-categories'] });
  };

  const addAttr = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      vendorApi.createVendorAttribute(categoryId, name),
    onSuccess: () => {
      invalidate();
      toast.success('Extra attribute added');
    },
    onError: () => toast.error('Could not add attribute'),
  });

  const deleteAttr = useMutation({
    mutationFn: ({ categoryId, id }: { categoryId: string; id: string }) =>
      vendorApi.deleteVendorAttribute(categoryId, id),
    onSuccess: () => {
      invalidate();
      toast.success('Removed');
    },
    onError: () => toast.error('Could not remove'),
  });

  if (!userId || isLoading) return <PageSpinner />;

  return (
    <>
      <Header title="My catalog attributes" showBack />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        <p className="text-sm text-gray-600">
          Add extra attribute names per category. They appear only for your account when you add products.
          Admin defaults are shown for reference and cannot be changed here.
        </p>
        {categories?.map((c) => (
          <CategoryBlock
            key={c.id}
            category={c}
            draft={drafts[c.id] ?? ''}
            setDraft={(v) => setDrafts((s) => ({ ...s, [c.id]: v }))}
            onAdd={() => {
              const name = (drafts[c.id] ?? '').trim();
              if (!name) return toast.error('Enter a name');
              addAttr.mutate({ categoryId: c.id, name });
              setDrafts((s) => ({ ...s, [c.id]: '' }));
            }}
            onDelete={(id) => deleteAttr.mutate({ categoryId: c.id, id })}
          />
        ))}
      </div>
    </>
  );
}

function CategoryBlock({
  category,
  draft,
  setDraft,
  onAdd,
  onDelete,
}: {
  category: VendorCatalogCategory;
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-medium text-gray-900">{category.name}</h3>
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-500">Admin defaults</p>
        <ul className="mt-1 text-sm text-gray-700">
          {category.defaultAttributes.length === 0 ? (
            <li className="text-gray-400">None</li>
          ) : (
            category.defaultAttributes.map((a) => <li key={a.id}>{a.name}</li>)
          )}
        </ul>
      </div>
      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500">Your extra attributes</p>
        <ul className="mt-1 space-y-1">
          {category.vendorAttributes.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.name}</span>
              <button type="button" className="text-xs text-red-600" onClick={() => onDelete(a.id)}>
                Remove
              </button>
            </li>
          ))}
          {category.vendorAttributes.length === 0 && (
            <li className="text-sm text-gray-400">None yet</li>
          )}
        </ul>
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="e.g. GSM, Fit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button size="sm" onClick={onAdd}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
