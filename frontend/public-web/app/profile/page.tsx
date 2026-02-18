'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getUserDisplayName, getToken } from '@/lib/keycloak';
import { updateUser, changeOwnPassword, getUserById } from '@/lib/keycloak-admin';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout, refreshSession } = useAuth();
  const router = useRouter();
  const [tokenPreview, setTokenPreview] = useState('');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  
  // Edit form
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  
  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?returnUrl=/profile');
    }
    
    const token = getToken();
    if (token) {
      setTokenPreview(token.substring(0, 80) + '...');
    }
  }, [isLoading, isAuthenticated, router]);

  const getUserInitials = () => {
    const name = getUserDisplayName(user);
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getUserRoles = () => {
    return user?.realm_access?.roles?.filter(r => !r.startsWith('default-')) || [];
  };

  // Edit Profile
  const openEditProfile = () => {
    setEditForm({
      firstName: user?.given_name || '',
      lastName: user?.family_name || '',
      email: user?.email || '',
    });
    setModalError('');
    setModalSuccess('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setModalError('');
    setModalSuccess('');
  };

  const saveProfile = async () => {
    setModalError('');
    setIsSaving(true);

    try {
      const userId = user?.sub;
      if (!userId) throw new Error('User ID not found');

      await updateUser(userId, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
      });

      // Refresh user info
      await refreshSession();
      setModalSuccess('Profile updated successfully!');
      setTimeout(() => closeEditModal(), 1500);
    } catch (error: any) {
      setModalError(error.message || 'Failed to update profile');
    }

    setIsSaving(false);
  };

  // Change Password
  const openChangePassword = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setModalError('');
    setModalSuccess('');
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setModalError('');
    setModalSuccess('');
  };

  const getPasswordStrength = () => {
    let strength = 0;
    if (passwordForm.newPassword.length >= 8) strength += 25;
    if (/[a-z]/.test(passwordForm.newPassword)) strength += 25;
    if (/[A-Z]/.test(passwordForm.newPassword)) strength += 25;
    if (/[0-9]/.test(passwordForm.newPassword)) strength += 25;
    return strength;
  };

  const getStrengthClass = () => {
    const strength = getPasswordStrength();
    if (strength <= 25) return 'bg-red-500';
    if (strength <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    const strength = getPasswordStrength();
    if (strength <= 25) return 'Weak';
    if (strength <= 75) return 'Medium';
    return 'Strong';
  };

  const handleChangePassword = async () => {
    setModalError('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setModalError('Please fill in all fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setModalError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setModalError('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);

    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token');

      await changeOwnPassword(token, passwordForm);
      setModalSuccess('Password changed successfully!');
      setTimeout(() => closePasswordModal(), 1500);
    } catch (error: any) {
      setModalError(error.message || 'Failed to change password');
    }

    setIsSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleRefresh = async () => {
    await refreshSession();
    const token = getToken();
    if (token) {
      setTokenPreview(token.substring(0, 80) + '...');
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Info Card */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              <button
                onClick={openEditProfile}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit Profile
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-2xl font-semibold">
                  {getUserInitials()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{getUserDisplayName(user)}</h3>
                  <p className="text-gray-500">{user?.email}</p>
                  <div className="flex gap-2 mt-2">
                    {getUserRoles().map(role => (
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

              <div className="mt-6 space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">User ID</span>
                  <span className="font-mono text-sm text-gray-700">{user?.sub}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Username</span>
                  <span className="text-gray-700">{user?.preferred_username}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-700">{user?.email}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">Email Verified</span>
                  <span className={user?.email_verified ? 'text-green-600' : 'text-yellow-600'}>
                    {user?.email_verified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-500">First Name</span>
                  <span className="text-gray-700">{user?.given_name || '-'}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-500">Last Name</span>
                  <span className="text-gray-700">{user?.family_name || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Account Actions</h2>
            </div>
            
            <div className="p-4 space-y-2">
              <button
                onClick={openChangePassword}
                className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-sm text-gray-500">Update your account password</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <button
                onClick={handleRefresh}
                className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Refresh Session</p>
                  <p className="text-sm text-gray-500">Renew your access token</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-600">Sign Out</p>
                  <p className="text-sm text-red-400">Sign out of your account</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Token Info */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Token</h2>
            <p className="text-sm text-gray-500 mb-4">
              Your JWT token is used for API authentication with your microservices.
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <code className="text-green-400 text-xs break-all">
                {tokenPreview || 'No token available'}
              </code>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeEditModal}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{modalError}</div>}
              {modalSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{modalSuccess}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Changing email may require re-verification</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={closeEditModal} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closePasswordModal}>
          <div className="bg-white rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button onClick={closePasswordModal} className="text-gray-400 hover:text-gray-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{modalError}</div>}
              {modalSuccess && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">{modalSuccess}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {passwordForm.newPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getStrengthClass()}`}
                        style={{ width: `${getPasswordStrength()}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{getStrengthText()}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className={passwordForm.newPassword.length >= 8 ? 'text-green-600' : ''}>
                    {passwordForm.newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                  </li>
                  <li className={/[a-z]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                    {/[a-z]/.test(passwordForm.newPassword) ? '✓' : '○'} One lowercase letter
                  </li>
                  <li className={/[A-Z]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                    {/[A-Z]/.test(passwordForm.newPassword) ? '✓' : '○'} One uppercase letter
                  </li>
                  <li className={/[0-9]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                    {/[0-9]/.test(passwordForm.newPassword) ? '✓' : '○'} One number
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={closePasswordModal} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
