/**
 * AdminPanel — User approval queue, role management, soft-deleted items.
 */

import { useState, useEffect } from 'react';
import { adminApi } from '@/api/client';
import { User } from '@/types';
import { Users, Shield, Trash2, RotateCcw, Eye } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState<(User & { is_deleted: boolean; deleted_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  useEffect(() => {
    loadUsers();
  }, [showDeleted]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.listUsers(1, 100);
      let userList = response.data;
      if (!showDeleted) {
        userList = userList.filter((u: any) => !u.is_deleted);
      }
      setUsers(userList);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await adminApi.updateUser(userId, { is_approved: true });
      loadUsers();
    } catch (err) {
      console.error('Failed to approve user', err);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await adminApi.updateUser(userId, { role });
      loadUsers();
    } catch (err) {
      console.error('Failed to update role', err);
    }
  };

  const handleUndelete = async (userId: string) => {
    try {
      await adminApi.undeleteUser(userId);
      loadUsers();
    } catch (err) {
      console.error('Failed to undelete user', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'users' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'audit' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          Audit Logs
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">User Management</h3>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="rounded"
              />
              Show Soft-Deleted
            </label>
          </div>

          {loading ? (
            <p className="text-slate-500 text-center py-8">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400">Name</th>
                    <th className="text-left py-2 px-3 text-slate-400">Email</th>
                    <th className="text-left py-2 px-3 text-slate-400">Role</th>
                    <th className="text-left py-2 px-3 text-slate-400">Status</th>
                    <th className="text-left py-2 px-3 text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className={`border-b border-slate-800 ${user.is_deleted ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-3 text-white">{user.name}</td>
                      <td className="py-3 px-3 text-slate-400">{user.email}</td>
                      <td className="py-3 px-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="visitor">Visitor</option>
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        {user.is_deleted ? (
                          <span className="text-red-400 text-xs">Deleted</span>
                        ) : user.is_approved ? (
                          <span className="text-emerald-400 text-xs">Approved</span>
                        ) : (
                          <span className="text-amber-400 text-xs">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          {!user.is_approved && !user.is_deleted && (
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs"
                            >
                              <Shield className="w-3 h-3 inline mr-1" />
                              Approve
                            </button>
                          )}
                          {user.is_deleted && (
                            <button
                              onClick={() => handleUndelete(user.id)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                            >
                              <RotateCcw className="w-3 h-3 inline mr-1" />
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Audit Logs</h3>
          <p className="text-slate-500 text-sm">Audit log viewer — coming in next iteration</p>
        </div>
      )}
    </div>
  );
}
