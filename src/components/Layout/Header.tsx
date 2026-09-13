/**
 * Header — Dynamic branding from backend config.
 */

import { useBranding } from '@/hooks/useBranding';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Shield } from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { branding } = useBranding();
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo & App Name */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg text-white"
            style={{ background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.secondary})` }}
          >
            ML
          </div>
          <div>
            <h1 className="text-xl font-bold">{branding.app_name}</h1>
            <p className="text-xs text-slate-400">{branding.tagline}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <button
            onClick={() => onNavigate('home')}
            className={`text-sm font-medium ${currentPage === 'home' ? 'text-primary-400' : 'text-slate-400 hover:text-white'}`}
          >
            Calculator
          </button>
          <button
            onClick={() => onNavigate('screenshots')}
            className={`text-sm font-medium ${currentPage === 'screenshots' ? 'text-primary-400' : 'text-slate-400 hover:text-white'}`}
          >
            Screenshots
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`text-sm font-medium flex items-center gap-1 ${currentPage === 'admin' ? 'text-primary-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Shield className="w-3 h-3" />
              Admin
            </button>
          )}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <span className="text-sm text-slate-300 hidden md:inline">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="btn-primary text-sm"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
