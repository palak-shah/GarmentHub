import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { LogOut, UsersRound } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/layout/Header';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(user?.name || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');

  const save = useMutation({
    mutationFn: () => authApi.updateProfile({ name, businessName }),
    onSuccess: (data) => {
      updateUser(data);
      toast.success('Saved!');
    },
    onError: () => toast.error('Failed to save'),
  });

  return (
    <>
      <Header title="Profile" showBack />

      <div className="mx-auto max-w-4xl px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business name"
            className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div className="rounded-2xl bg-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">Phone</p>
          <p className="text-sm font-semibold text-gray-900">{user?.phone}</p>
        </div>

        <div className="rounded-2xl bg-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">Role</p>
          <p className="text-sm font-semibold text-gray-900 capitalize">{user?.role?.toLowerCase()}</p>
        </div>

        {user?.role === 'TRADER' && (
          <Link
            to="/trader/groups"
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm active:bg-gray-50 min-h-[52px]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <UsersRound className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900">Customer groups</p>
              <p className="text-xs text-gray-400">Organize buyers and share products to a group</p>
            </div>
          </Link>
        )}

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full rounded-full bg-primary-600 py-3.5 text-base font-bold text-white min-h-[52px] active:bg-primary-700 disabled:opacity-50"
        >
          {save.isPending ? 'Saving...' : 'Save'}
        </button>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-3 text-sm font-semibold text-red-600 min-h-[48px] active:bg-gray-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );
}
