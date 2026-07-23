import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SelfOwnerProfile = () => {
  const { updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    password: ''
  });

  const resolveAvatar = (avatarValue) => {
    if (!avatarValue) return '';
    if (avatarValue.startsWith('data:') || avatarValue.startsWith('http://') || avatarValue.startsWith('https://')) {
      return avatarValue;
    }
    return `data:image/webp;base64,${avatarValue}`;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/profile');
      setProfile(response.data);
      setFormData({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone || '',
        avatar: response.data.avatar || '',
        password: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...formData };
      if (!updateData.password) delete updateData.password;

      const result = await updateProfile(updateData);
      if (!result.success) {
        throw new Error(result.error || 'Unable to update profile');
      }
      setIsEditing(false);
      fetchProfile();
      alert('Profile updated successfully');
    } catch (err) {
      alert('Error updating profile');
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setFormData((current) => ({ ...current, avatar: String(reader.result || '') }));
    reader.onerror = () => alert('Unable to read selected image');
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            {resolveAvatar(profile?.avatar) ? (
              <img src={resolveAvatar(profile?.avatar)} alt={profile?.name || 'Self owner'} className="w-20 h-20 rounded-full border border-slate-200 object-cover mb-4 mx-auto" />
            ) : (
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-bold text-white shadow-sm">
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-2xl font-bold text-center mb-2">{profile?.name}</h2>
            <p className="text-gray-600 text-center text-sm mb-4">{profile?.email}</p>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Role:</span> {profile?.role}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                  profile?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {profile?.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
              <p><span className="font-medium">Member Since:</span> {new Date(profile?.createdAt).toLocaleDateString()}</p>
              {profile?.lastLogin && (
                <p><span className="font-medium">Last Login:</span> {new Date(profile?.lastLogin).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Profile Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Profile Image</label>
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full px-4 py-2 border rounded"
                    placeholder="Paste image URL or data URL"
                  />
                  <label className="mt-2 inline-flex cursor-pointer items-center rounded border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Upload image
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {resolveAvatar(formData.avatar) && (
                    <img src={resolveAvatar(formData.avatar)} alt="Profile preview" className="mt-3 h-16 w-16 rounded-full border border-slate-200 object-cover" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border rounded"
                    placeholder="Leave blank if not changing"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Full Name</p>
                    <p className="text-lg font-semibold">{profile?.name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Email</p>
                    <p className="text-lg font-semibold">{profile?.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Phone</p>
                    <p className="text-lg font-semibold">{profile?.phone || 'Not provided'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm">Company</p>
                    <p className="text-lg font-semibold">{profile?.company?.companyName}</p>
                  </div>
                </div>

                {profile?.notificationPreferences && (
                  <div className="border-t pt-4 mt-6">
                    <h3 className="font-semibold mb-4">Notification Preferences</h3>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked={profile.notificationPreferences.emailNotifications} className="mr-2" />
                        <span>Email Notifications</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" defaultChecked={profile.notificationPreferences.inAppNotifications} className="mr-2" />
                        <span>In-App Notifications</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfOwnerProfile;
