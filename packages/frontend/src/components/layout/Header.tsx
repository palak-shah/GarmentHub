import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function Header({ title, showBack, actions }: HeaderProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="rounded-full p-1 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="flex-1 text-lg font-semibold truncate">{title}</h1>
        {actions}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
