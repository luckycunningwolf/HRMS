import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './Security.css';

export default function Security() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'employee',
    employee_id: ''
  });

  useEffect(() => {
    if (isAdmin && isAdmin()) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [usersResult, employeesResult] = await Promise.all([
        supabase.from('user_profiles').select(`
          *,
          employees (
            id,
            name,
            role,
            department,
            employee_id,
            email,
            phone
          )
        `),
        supabase.from('employees').select('*').eq('is_active', true)
      ]);

      const userData = usersResult.data || [];
      const employeeData = employeesResult.data || [];
      
      // Find employees without user accounts
      const linkedEmployeeIds = userData
        .filter(user => user.employee_id)
        .map(user => user.employee_id);
      
      const unlinked = employeeData.filter(emp => !linkedEmployeeIds.includes(emp.id));

      setUsers(userData);
      setEmployees(employeeData);
      setUnlinkedEmployees(unlinked);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Creating user:', newUser);
      
      // Create auth user using admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          created_by: 'admin',
          created_at: new Date().toISOString()
        }
      });

      if (authError) throw authError;
      console.log('Auth user created:', authData.user);

      // Create or update user profile
      const profileData = {
        id: authData.user.id,
        employee_id: newUser.employee_id ? parseInt(newUser.employee_id) : null,
        role: newUser.role,
        is_active: true,
        created_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (profileError) throw profileError;

      alert(`✅ User account created successfully!\n\n📧 Email: ${newUser.email}\n🔑 Password: ${newUser.password}\n👤 Role: ${newUser.role}`);
      
      // Reset form
      setNewUser({ email: '', password: '', role: 'employee', employee_id: '' });
      setShowCreateModal(false);
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('❌ Error creating user: ' + error.message);
    }
  };

  const linkEmployeeToUser = async (userId, employeeId) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ employee_id: parseInt(employeeId) })
        .eq('id', userId);

      if (error) throw error;
      
      alert('✅ Employee linked to user account successfully!');
      setShowLinkModal(false);
      setSelectedUser(null);
      await fetchData();
    } catch (error) {
      console.error('Error linking employee:', error);
      alert('❌ Error linking employee: ' + error.message);
    }
  };

  const unlinkEmployee = async (userId) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ employee_id: null })
        .eq('id', userId);

      if (error) throw error;
      
      alert('✅ Employee unlinked from user account!');
      await fetchData();
    } catch (error) {
      console.error('Error unlinking employee:', error);
      alert('❌ Error unlinking employee: ' + error.message);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      alert(`✅ User status updated to ${!currentStatus ? 'Active' : 'Inactive'}!`);
      await fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Error updating status: ' + error.message);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      alert(`✅ Role updated to ${newRole}!`);
      await fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('❌ Error updating role: ' + error.message);
    }
  };

  const resetPassword = async (userId, userEmail) => {
    try {
      const newPassword = prompt(`🔑 Enter new password for ${userEmail}:`);
      if (!newPassword) return;

      const { error } = await supabase.auth.admin.updateUser(userId, {
        password: newPassword
      });

      if (error) throw error;
      
      alert(`✅ Password updated successfully!\n\n📧 Email: ${userEmail}\n🔑 New Password: ${newPassword}`);
    } catch (error) {
      console.error('Error updating password:', error);
      alert('❌ Error updating password: ' + error.message);
    }
  };

  if (!isAdmin || !isAdmin()) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>🔒 Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="security-loading">
        <div className="loading-spinner"></div>
        <p>Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className="security-container">
      {/* Header */}
      <div className="security-header">
        <div>
          <h1>🔐 Security & User Management</h1>
          <p>Create user accounts, link employees, and manage access</p>
          <div className="header-stats">
            <span className="stat">👥 {users.length} Users</span>
            <span className="stat">🔗 {users.filter(u => u.employee_id).length} Linked</span>
            <span className="stat">📋 {unlinkedEmployees.length} Unlinked Employees</span>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="create-user-btn primary"
          >
            + Create User Account
          </button>
        </div>
      </div>

      {/* Unlinked Employees Alert */}
      {unlinkedEmployees.length > 0 && (
        <div className="alert alert-info">
          <div className="alert-content">
            <h4>📋 {unlinkedEmployees.length} Employees Need User Accounts</h4>
            <p>These employees don't have user accounts yet: {unlinkedEmployees.slice(0, 3).map(emp => emp.name).join(', ')}
            {unlinkedEmployees.length > 3 && ` and ${unlinkedEmployees.length - 3} more`}</p>
          </div>
          <button 
            className="alert-action"
            onClick={() => setShowCreateModal(true)}
          >
            Create Accounts
          </button>
        </div>
      )}

      {/* Users Grid */}
      <div className="users-section">
        <h2>System Users ({users.length})</h2>
        {users.length === 0 ? (
          <div className="empty-security-state">
            <div className="empty-icon">👥</div>
            <h3>No Users Found</h3>
            <p>Create your first user account to get started.</p>
          </div>
        ) : (
          <div className="users-grid">
            {users.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-header">
                  <div className="user-avatar">
                    {user.employees?.name?.charAt(0) || user.id.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <h3>{user.employees?.name || 'No Employee Linked'}</h3>
                    <p>📧 {user.id.slice(0, 8)}... • ID: {user.employees?.employee_id || 'N/A'}</p>
                  </div>
                  <div className={`role-badge ${user.role}`}>
                    {user.role === 'admin' ? '👑' : '👤'} {user.role}
                  </div>
                </div>

                <div className="user-details">
                  <div className="detail-item">
                    <span className="label">Employee:</span>
                    <span className="value">
                      {user.employees ? (
                        <div className="employee-link">
                          <strong>{user.employees.name}</strong>
                          <small>{user.employees.role} - {user.employees.department}</small>
                        </div>
                      ) : (
                        <span className="no-link">Not linked</span>
                      )}
                    </span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Contact:</span>
                    <span className="value">
                      {user.employees ? (
                        <div className="contact-info">
                          <small>📧 {user.employees.email || 'N/A'}</small>
                          <small>📱 {user.employees.phone || 'N/A'}</small>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                </div>

                <div className="user-actions">
                  <div className="action-row">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="role-selector"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                    
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`status-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  <div className="action-row">
                    {!user.employees ? (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowLinkModal(true);
                        }}
                        className="link-btn"
                      >
                        🔗 Link Employee
                      </button>
                    ) : (
                      <button
                        onClick={() => unlinkEmployee(user.id)}
                        className="unlink-btn"
                      >
                        🔓 Unlink
                      </button>
                    )}
                    
                    <button
                      onClick={() => resetPassword(user.id, user.employees?.email || user.id.slice(0, 8))}
                      className="password-btn"
                    >
                      🔑 Reset Password
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New User Account</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={createUser} className="create-form">
              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({...prev, email: e.target.value}))}
                  required
                  placeholder="user@company.com"
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({...prev, password: e.target.value}))}
                  required
                  minLength="6"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({...prev, role: e.target.value}))}
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>Link to Employee Record (Optional)</label>
                <select
                  value={newUser.employee_id}
                  onChange={(e) => setNewUser(prev => ({...prev, employee_id: e.target.value}))}
                >
                  <option value="">Select Employee (Optional)</option>
                  {unlinkedEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.employee_id} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  Create User Account
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Employee Modal */}
      {showLinkModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Link Employee to User Account</h2>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedUser(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="link-form">
              <div className="current-user">
                <h3>User Account:</h3>
                <p>ID: {selectedUser.id.slice(0, 8)}...</p>
                <p>Role: {selectedUser.role}</p>
              </div>

              <div className="employee-selection">
                <h3>Select Employee to Link:</h3>
                <div className="employees-list">
                  {unlinkedEmployees.map(emp => (
                    <div key={emp.id} className="employee-option">
                      <div className="emp-info">
                        <strong>{emp.name}</strong>
                        <small>{emp.role} - {emp.department}</small>
                        <small>ID: {emp.employee_id}</small>
                      </div>
                      <button
                        onClick={() => linkEmployeeToUser(selectedUser.id, emp.id)}
                        className="link-action-btn"
                      >
                        🔗 Link
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => {
                    setShowLinkModal(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
