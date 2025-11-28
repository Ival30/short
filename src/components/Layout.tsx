import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Video, Home, User, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../hooks/useSettings';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useSettings();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2">
                <Video className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-slate-900">ClipForge</span>
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100">
                <User className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700">{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
