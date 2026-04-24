import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageSpinner } from '@/components/ui/Spinner';
import type { AdminCategory } from '@/types';

export default function SettingsCategories() {
  const queryClient = useQueryClient();
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [attrInputs, setAttrInputs] = useState<Record<string, string>>({});

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] });

  const createCat = useMutation({
    mutationFn: () => adminApi.createCategory(newCategoryName.trim()),
    onSuccess: () => {
      invalidate();
      setNewCategoryName('');
      setAddCategoryOpen(false);
      toast.success('Category created');
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateCat = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => adminApi.updateCategory(id, name),
    onSuccess: () => {
      invalidate();
      toast.success('Updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const deleteCat = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      toast.success('Category deleted');
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Delete failed'),
  });

  const addAttr = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      adminApi.createCategoryAttribute(categoryId, name),
    onSuccess: () => {
      invalidate();
      toast.success('Attribute added');
    },
    onError: () => toast.error('Failed to add attribute'),
  });

  const renameAttr = useMutation({
    mutationFn: ({
      categoryId,
      attributeId,
      name,
    }: {
      categoryId: string;
      attributeId: string;
      name: string;
    }) => adminApi.updateCategoryAttribute(categoryId, attributeId, { name }),
    onSuccess: () => {
      invalidate();
      toast.success('Attribute renamed');
    },
    onError: () => toast.error('Rename failed'),
  });

  const deleteAttr = useMutation({
    mutationFn: ({ categoryId, id }: { categoryId: string; id: string }) =>
      adminApi.deleteCategoryAttribute(categoryId, id),
    onSuccess: () => {
      invalidate();
      toast.success('Attribute removed');
    },
    onError: () => toast.error('Failed to remove'),
  });

  if (isLoading) return <PageSpinner />;

  const renamingAttrKey =
    renameAttr.isPending && renameAttr.variables
      ? `${renameAttr.variables.categoryId}:${renameAttr.variables.attributeId}`
      : null;

  return (
    <>
      <Header
        title="Categories & attributes"
        showBack
        actions={
          <Button size="sm" onClick={() => setAddCategoryOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add category
          </Button>
        }
      />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        <Modal
          open={addCategoryOpen}
          onClose={() => {
            setAddCategoryOpen(false);
            setNewCategoryName('');
          }}
          title="New category"
        >
          <p className="mb-3 text-sm text-gray-500">Enter a name for the category. You can add default attributes after it is created.</p>
          <Input
            label="Category name"
            placeholder="e.g. Jeans"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAddCategoryOpen(false);
                setNewCategoryName('');
              }}
            >
              Cancel
            </Button>
            <Button
              loading={createCat.isPending}
              disabled={!newCategoryName.trim()}
              onClick={() => {
                if (!newCategoryName.trim()) return toast.error('Name required');
                createCat.mutate();
              }}
            >
              Create
            </Button>
          </div>
        </Modal>

        <div className="space-y-3">
          {categories?.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              attrDraft={attrInputs[c.id] ?? ''}
              setAttrDraft={(v) => setAttrInputs((s) => ({ ...s, [c.id]: v }))}
              onRename={(name) => updateCat.mutate({ id: c.id, name })}
              onDelete={() => {
                if (confirm(`Delete category "${c.name}"?`)) deleteCat.mutate(c.id);
              }}
              onAddAttr={(name) => {
                if (!name.trim()) return;
                addAttr.mutate({ categoryId: c.id, name: name.trim() });
                setAttrInputs((s) => ({ ...s, [c.id]: '' }));
              }}
              onRenameAttr={(attributeId, name) =>
                renameAttr.mutate({ categoryId: c.id, attributeId, name })
              }
              onDeleteAttr={(aid) => deleteAttr.mutate({ categoryId: c.id, id: aid })}
              renamingAttrKey={renamingAttrKey}
              deleting={deleteCat.isPending}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function CategoryCard({
  category,
  attrDraft,
  setAttrDraft,
  onRename,
  onDelete,
  onAddAttr,
  onRenameAttr,
  onDeleteAttr,
  renamingAttrKey,
  deleting,
}: {
  category: AdminCategory;
  attrDraft: string;
  setAttrDraft: (v: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddAttr: (name: string) => void;
  onRenameAttr: (attributeId: string, name: string) => void;
  onDeleteAttr: (id: string) => void;
  renamingAttrKey: string | null;
  deleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [attrEditId, setAttrEditId] = useState<string | null>(null);
  const [attrEditName, setAttrEditName] = useState('');

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 flex-wrap gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              size="sm"
              onClick={() => {
                onRename(name.trim());
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(category.name);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <h4 className="font-medium text-gray-900">{category.name}</h4>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button type="button" className="text-xs text-primary-600" onClick={() => setEditing(true)}>
                Rename
              </button>
              <button
                type="button"
                className="text-xs text-red-600"
                disabled={deleting}
                onClick={onDelete}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
      <p className="mb-2 text-xs text-gray-500">Default attributes (all vendors)</p>
      <ul className="mb-3 space-y-2">
        {category.attributes.map((a) => {
          const rowRenaming = renamingAttrKey === `${category.id}:${a.id}`;
          return (
          <li key={a.id} className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            {attrEditId === a.id ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Input
                  className="min-w-[8rem] flex-1"
                  value={attrEditName}
                  onChange={(e) => setAttrEditName(e.target.value)}
                  disabled={rowRenaming}
                />
                <Button
                  size="sm"
                  loading={rowRenaming}
                  disabled={!attrEditName.trim()}
                  onClick={() => {
                    const next = attrEditName.trim();
                    if (!next) return;
                    onRenameAttr(a.id, next);
                    setAttrEditId(null);
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={rowRenaming}
                  onClick={() => setAttrEditId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <span className="text-sm text-gray-900">{a.name}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="text-xs text-primary-600"
                    onClick={() => {
                      setAttrEditId(a.id);
                      setAttrEditName(a.name);
                    }}
                  >
                    Rename
                  </button>
                  <button type="button" className="text-xs text-red-600" onClick={() => onDeleteAttr(a.id)}>
                    Remove
                  </button>
                </div>
              </>
            )}
          </li>
          );
        })}
        {category.attributes.length === 0 && (
          <li className="text-sm text-gray-400">No attributes yet</li>
        )}
      </ul>
      <div className="flex gap-2">
        <Input
          placeholder="Add attribute (e.g. Fabric)"
          value={attrDraft}
          onChange={(e) => setAttrDraft(e.target.value)}
        />
        <Button size="sm" onClick={() => onAddAttr(attrDraft)}>
          Add
        </Button>
      </div>
    </div>
  );
}
