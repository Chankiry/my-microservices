'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getUserDisplayName, getToken } from '@/lib/keycloak';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?returnUrl=/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName(user);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const stats = [
    { label: 'Total Orders', value: '156', icon: '📦', color: 'bg-blue-500' },
    { label: 'Revenue', value: '$12,450', icon: '💰', color: 'bg-green-500' },
    { label: 'Active Users', value: '23', icon: '👥', color: 'bg-purple-500' },
    { label: 'Notifications', value: '8', icon: '🔔', color: 'bg-orange-500' },
  ];

  const recentActivity = [
    { type: 'order', text: 'New order #1234 placed', time: '2 min ago' },
    { type: 'user', text: 'User john@example.com registered', time: '15 min ago' },
    { type: 'payment', text: 'Payment received for order #1233', time: '1 hour ago' },
  ];

  const token = getToken();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {getUserDisplayName(user)}!
            </h1>
            <p className="text-gray-500 mt-1">
              Here's what's happening with your platform today.
            </p>
          </div>
          <Link
            href="/profile"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            View Profile
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Your Profile</h2>
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-2xl font-semibold">
                {getUserInitials()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{getUserDisplayName(user)}</h3>
                <p className="text-gray-500 mb-3">{user?.email}</p>
                <div className="flex gap-2">
                  {user?.realm_access?.roles?.filter(r => !r.startsWith('default-')).map(role => (
                    <span
                      key={role}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="text-sm font-mono text-gray-700 truncate">{user?.sub}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Verified</p>
                <p className={`text-sm font-medium ${user?.email_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                  {user?.email_verified ? '✓ Verified' : 'Pending'}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    activity.type === 'order' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'user' ? 'bg-purple-100 text-purple-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {activity.type === 'order' ? '📦' : activity.type === 'user' ? '👤' : '💳'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{activity.text}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Token Info */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Access Token</h2>
          <p className="text-sm text-gray-500 mb-3">
            Your JWT token is used for API authentication.
          </p>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <code className="text-green-400 text-xs">
              {token ? `${token.substring(0, 100)}...` : 'No token available'}
            </code>
          </div>
        </div>
      </main>
    </div>
  );
}
