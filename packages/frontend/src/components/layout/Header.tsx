import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { notificationApi } from '@/api/notification.api';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  hideBell?: boolean;
}

export function Header({ title, showBack, actions, hideBell }: HeaderProps) {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationApi.unreadCount(),
    refetchInterval: 30000,
    enabled: !!token && !hideBell,
  });

  const unreadCount = unread?.count ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        {showBack && (
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h1 className="flex-1 text-lg font-bold text-gray-900 truncate">{title}</h1>
        {actions}
        {!hideBell && (
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          >
            <Bell className="h-4 w-4 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
