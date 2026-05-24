import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronRight, UsersRound } from 'lucide-react';
import { curationApi } from '@/api/curation.api';
import { Header } from '@/components/layout/Header';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { PageSpinner } from '@/components/ui/Spinner';

export default function CustomerGroupsPage() {
  useScrollRestore('trader-customer-groups');
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: groups, isLoading } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => curationApi.listCustomerGroups(),
  });

  const createMut = useMutation({
    mutationFn: () => curationApi.createCustomerGroup({ name: newName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-groups'] });
      setNewName('');
      toast.success('Group created');
    },
    onError: (e: unknown) =>
      toast.error(
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed')
          : 'Failed to create group',
      ),
  });

  const submitCreate = () => {
    if (!newName.trim()) {
      toast.error('Enter a group name');
      return;
    }
    createMut.mutate();
  };

  if (isLoading) return <PageSpinner />;

  return (
    <>
      <Header title="Customer groups" showBack />

      <div className="mx-auto max-w-4xl px-4 py-4 space-y-6 pb-24">
        <p className="text-sm text-gray-500">
          Organize buyers who follow you, then send curated shares to a whole group from the Share screen.
        </p>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">New group</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Boutique buyers — Mumbai"
            className="w-full rounded-xl border-2 border-gray-100 px-4 py-3 text-sm outline-none focus:border-primary-400"
          />
          <button
            type="button"
            onClick={submitCreate}
            disabled={createMut.isPending}
            className="w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {createMut.isPending ? 'Creating…' : 'Create group'}
          </button>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your groups</p>
          {!groups?.length ? (
            <p className="text-sm text-gray-400 py-8 text-center">No groups yet. Create one above.</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white overflow-hidden">
              {groups.map((g) => (
                <Link
                  key={g.id}
                  to={`/trader/groups/${g.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 min-h-[56px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <UsersRound className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                    <p className="text-xs text-gray-400">
                      {g._count.members} member{g._count.members !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
