import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { User, Lock, Bell, Save, Building2, Mail, Phone, MapPin } from 'lucide-react';

const OwnerProfile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
    avatar: user?.avatar || ''
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: true,
    rentReminders: true,
    maintenanceUpdates: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPassword({ ...password, [name]: value });
  };

  const handleNotificationChange = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      await authAPI.updateProfile(profile);
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (password.new !== password.confirm) {
      setMessage('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authAPI.updateProfile({ password: password.new });
      setPassword({ current: '', new: '', confirm: '' });
      setMessage('Password changed successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and preferences</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Account Overview Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">{user?.name}</h2>
              <p className="text-primary-100 mt-1">Property Owner Account</p>
              {user?.company && <p className="text-primary-200 text-sm mt-1">{user.company}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary-100 text-sm">Account Email</p>
            <p className="text-lg font-semibold">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <Mail className="w-8 h-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-600">Email Address</p>
              <p className="font-semibold text-gray-900">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <Phone className="w-8 h-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-600">Phone Number</p>
              <p className="font-semibold text-gray-900">{user?.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <Building2 className="w-8 h-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-600">Company</p>
              <p className="font-semibold text-gray-900">{user?.company || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit Account Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={profile.phone}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              name="company"
              value={profile.company}
              onChange={handleProfileChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Lock className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              name="current"
              value={password.current}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              name="new"
              value={password.new}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              name="confirm"
              value={password.confirm}
              onChange={handlePasswordChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:bg-gray-400"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'Updating...' : 'Change Password'}</span>
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(notifications).map(([key, value]) => (
            <label key={key} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={() => handleNotificationChange(key)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
              />
              <span className="text-gray-700">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerProfile;
