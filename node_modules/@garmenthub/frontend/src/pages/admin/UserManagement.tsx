import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '@/api/admin.api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatters';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => adminApi.getUsers(roleFilter || undefined),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.toggleUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      VENDOR: 'bg-blue-100 text-blue-800',
      CUSTOMER: 'bg-green-100 text-green-800',
    };
    return <Badge className={colors[role] || ''}>{role}</Badge>;
  };

  return (
    <>
      <Header title="User Management" />
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {['', 'CUSTOMER', 'VENDOR', 'ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                roleFilter === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {r || 'All'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <PageSpinner />
        ) : (
          <div className="space-y-3">
            {users?.map((user) => (
              <div key={user.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{user.name || 'Unnamed'}</h3>
                    <p className="text-xs text-gray-500">{user.phone}</p>
                    {user.businessName && <p className="text-xs text-gray-500">{user.businessName}</p>}
                    <p className="text-xs text-gray-400">Joined {formatDate(user.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {roleBadge(user.role)}
                    <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{user._count.products} products, {user._count.orders} orders</span>
                  <button
                    onClick={() => toggle.mutate({ id: user.id, isActive: !user.isActive })}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      user.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
