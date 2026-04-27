import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationApi } from '@/api/notification.api';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Notification } from '@/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list(),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const unreadCount = notifications?.filter((n: Notification) => !n.isRead).length ?? 0;

  return (
    <>
      <Header
        title="Notifications"
        showBack
        actions={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-primary-600 active:bg-primary-50 min-h-[36px]"
            >
              <CheckCheck className="h-4 w-4" />
              Read all
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-4xl">
        {isLoading ? (
          <div className="px-4 py-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="h-2 w-2 mt-2 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-full rounded bg-gray-200 animate-pulse" />
                </div>
                <div className="h-3 w-8 rounded bg-gray-200 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You're all caught up"
            icon={<Bell className="h-16 w-16" />}
          />
        ) : (
          <div>
            {notifications.map((n: Notification) => (
              <button
                key={n.id}
                onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left min-h-[60px] border-b border-gray-50 ${
                  n.isRead ? 'bg-white' : 'bg-primary-50/50'
                }`}
              >
                <div className={`mt-1 flex h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-primary-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
