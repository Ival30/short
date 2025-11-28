import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import {
  Users,
  Video,
  Scissors,
  DollarSign,
  TrendingUp,
  Activity,
  Settings,
  Shield,
  BarChart3,
  FileText,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalVideos: number;
  totalClips: number;
  storageUsed: number;
  processingJobs: number;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalVideos: 0,
    totalClips: 0,
    storageUsed: 0,
    processingJobs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>(
    'overview'
  );

  useEffect(() => {
    loadDashboardStats();
  }, []);

  async function loadDashboardStats() {
    try {
      const [usersData, videosData, clipsData, jobsData] = await Promise.all([
        supabase.from('profiles').select('id, is_active', { count: 'exact' }),
        supabase.from('videos').select('id, file_size', { count: 'exact' }),
        supabase.from('clips').select('id', { count: 'exact' }),
        supabase
          .from('processing_jobs')
          .select('id', { count: 'exact' })
          .in('status', ['queued', 'processing']),
      ]);

      const activeUsersCount =
        usersData.data?.filter((u) => u.is_active).length || 0;

      const totalStorage =
        videosData.data?.reduce((sum, v) => sum + (v.file_size || 0), 0) || 0;

      setStats({
        totalUsers: usersData.count || 0,
        activeUsers: activeUsersCount,
        totalVideos: videosData.count || 0,
        totalClips: clipsData.count || 0,
        storageUsed: totalStorage,
        processingJobs: jobsData.count || 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-900">
                Admin Dashboard
              </h1>
            </div>
            <p className="text-slate-600">
              Manage users, monitor system, and configure settings
            </p>
          </div>

          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settings
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                  icon={<Users className="w-6 h-6" />}
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  subtitle={`${stats.activeUsers} active`}
                  color="blue"
                  loading={loading}
                />
                <StatCard
                  icon={<Video className="w-6 h-6" />}
                  title="Total Videos"
                  value={stats.totalVideos.toLocaleString()}
                  subtitle={formatBytes(stats.storageUsed)}
                  color="green"
                  loading={loading}
                />
                <StatCard
                  icon={<Scissors className="w-6 h-6" />}
                  title="Total Clips"
                  value={stats.totalClips.toLocaleString()}
                  subtitle="Generated"
                  color="purple"
                  loading={loading}
                />
                <StatCard
                  icon={<Activity className="w-6 h-6" />}
                  title="Processing Jobs"
                  value={stats.processingJobs.toLocaleString()}
                  subtitle="In queue"
                  color="orange"
                  loading={loading}
                />
                <StatCard
                  icon={<DollarSign className="w-6 h-6" />}
                  title="Monthly Revenue"
                  value="$0"
                  subtitle="This month"
                  color="emerald"
                  loading={loading}
                />
                <StatCard
                  icon={<TrendingUp className="w-6 h-6" />}
                  title="Growth Rate"
                  value="+0%"
                  subtitle="vs last month"
                  color="cyan"
                  loading={loading}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <QuickActionButton
                      icon={<Users className="w-5 h-5" />}
                      label="Manage Users"
                      onClick={() => setActiveTab('users')}
                    />
                    <QuickActionButton
                      icon={<Settings className="w-5 h-5" />}
                      label="System Settings"
                      onClick={() => setActiveTab('settings')}
                    />
                    <QuickActionButton
                      icon={<FileText className="w-5 h-5" />}
                      label="View Audit Logs"
                      onClick={() => {}}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600">
                    <p>No recent activity to display</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                User Management
              </h2>
              <p className="text-slate-600 mb-4">
                Detailed user management interface coming soon...
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                View All Users
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                System Settings
              </h2>
              <p className="text-slate-600 mb-4">
                Feature flags and configuration management coming soon...
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Configure Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  loading: boolean;
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color,
  loading,
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function QuickActionButton({ icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all text-left"
    >
      <div className="text-slate-600">{icon}</div>
      <span className="font-medium text-slate-900">{label}</span>
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
