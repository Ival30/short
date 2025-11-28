import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedAdminRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export function ProtectedAdminRoute({
  children,
  requireSuperAdmin = false,
}: ProtectedAdminRouteProps) {
  const { user, profile, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user || !profile) {
      setIsAuthorized(false);
      return;
    }

    if (!profile.is_active) {
      setIsAuthorized(false);
      return;
    }

    if (requireSuperAdmin) {
      setIsAuthorized(profile.role === 'super_admin');
    } else {
      setIsAuthorized(
        profile.role === 'admin' || profile.role === 'super_admin'
      );
    }
  }, [user, profile, loading, requireSuperAdmin]);

  if (loading || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
