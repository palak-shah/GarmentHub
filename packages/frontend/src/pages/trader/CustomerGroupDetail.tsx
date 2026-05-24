import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { curationApi, type TraderCustomer } from '@/api/curation.api';
import { Header } from '@/components/layout/Header';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { PageSpinner } from '@/components/ui/Spinner';
import { apiErrorMessage } from '@/utils/apiError';

export default function CustomerGroupDetailPage() {
  useScrollRestore('trader-customer-group-detail');
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [nameDraft, setNameDraft] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  const { data: group, isLoading } = useQuery({
    queryKey: ['customer-group', groupId],
    queryFn: () => curationApi.getCustomerGroup(groupId!),
    enabled: !!groupId,
  });

  const { data: allCustomers } = useQuery({
    queryKey: ['trader-customers'],
    queryFn: () => curationApi.getCustomers(),
  });

  useEffect(() => {
    if (group) setNameDraft(group.name);
  }, [group?.id, group?.name]);

  const memberIds = useMemo(() => new Set(group?.members.map((m) => m.customerId) ?? []), [group]);

  const customersNotInGroup = useMemo(
    () => (allCustomers ?? []).filter((c) => !memberIds.has(c.id)),
    [allCustomers, memberIds],
  );

  const renameMut = useMutation({
    mutationFn: () => curationApi.updateCustomerGroup(groupId!, { name: nameDraft.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
      toast.success('Saved');
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not save')),
  });

  const deleteMut = useMutation({
    mutationFn: () => curationApi.deleteCustomerGroup(groupId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
      toast.success('Group deleted');
      navigate('/trader/groups', { replace: true });
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not delete')),
  });

  const addMut = useMutation({
    mutationFn: () =>
      curationApi.addCustomerGroupMembers(groupId!, { customerIds: Array.from(selectedToAdd) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
      setSelectedToAdd(new Set());
      toast.success('Members added');
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not add members')),
  });

  const removeMut = useMutation({
    mutationFn: (customerId: string) => curationApi.removeCustomerGroupMember(groupId!, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, 'Could not remove')),
  });

  const toggleAdd = (id: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!groupId) {
    navigate('/trader/groups', { replace: true });
    return null;
  }

  if (isLoading || !group) return <PageSpinner />;

  return (
    <>
      <Header title="Group" showBack />

      <div className="mx-auto max-w-4xl px-4 py-4 space-y-6 pb-28">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Name</label>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 text-sm outline-none focus:border-primary-400"
          />
          <button
            type="button"
            onClick={() => renameMut.mutate()}
            disabled={renameMut.isPending || !nameDraft.trim() || nameDraft.trim() === group.name}
            className="mt-2 w-full rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-800 disabled:opacity-50"
          >
            {renameMut.isPending ? 'Saving…' : 'Save name'}
          </button>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Members</p>
          {group.members.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No members yet. Add buyers who follow you below.</p>
          ) : (
            <div className="space-y-1">
              {group.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {m.customer.businessName || m.customer.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMut.mutate(m.customerId)}
                    disabled={removeMut.isPending}
                    className="p-2 rounded-lg text-red-500 active:bg-red-50 disabled:opacity-50"
                    aria-label="Remove from group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Add buyers</p>
          <p className="text-xs text-gray-500 mb-3">Only people who already follow you can be added.</p>
          {customersNotInGroup.length === 0 ? (
            <p className="text-sm text-gray-400">Everyone who follows you is already in this group.</p>
          ) : (
            <div className="space-y-1">
              {customersNotInGroup.map((c: TraderCustomer) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleAdd(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 min-h-[52px] text-left ${
                    selectedToAdd.has(c.id) ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-100'
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
                    {(c.businessName || c.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{c.businessName || c.name}</p>
                  </div>
                  {selectedToAdd.has(c.id) ? (
                    <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedToAdd.size > 0 && (
          <div className="fixed bottom-0 inset-x-0 z-30 bg-white px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom,0px))] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
            <div className="mx-auto max-w-4xl">
              <button
                type="button"
                onClick={() => addMut.mutate()}
                disabled={addMut.isPending}
                className="w-full rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white disabled:opacity-50"
              >
                {addMut.isPending ? 'Adding…' : `Add ${selectedToAdd.size} to group`}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this group? Members stay on GarmentHub; only the group is removed.')) {
              deleteMut.mutate();
            }
          }}
          disabled={deleteMut.isPending}
          className="w-full rounded-xl border-2 border-red-100 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
        >
          Delete group
        </button>
      </div>
    </>
  );
}
