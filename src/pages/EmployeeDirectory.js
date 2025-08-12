import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { 
  formatDateToDDMMYYYY, 
  formatDateForInput, 
  calculateTenureFromJoining 
} from '../utils/dateUtils';
import './EmployeeDirectory.css';

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, selectedDepartment, selectedRole, selectedStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setEmployees(data || []);
      
      const uniqueDepartments = [...new Set(data?.map(emp => emp.department).filter(Boolean))];
      const uniqueRoles = [...new Set(data?.map(emp => emp.role).filter(Boolean))];
      
      setDepartments(uniqueDepartments);
      setRoles(uniqueRoles);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment);
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(emp => emp.role === selectedRole);
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(emp => emp.is_active === true);
      } else {
        filtered = filtered.filter(emp => emp.is_active === false);
      }
    }

    setFilteredEmployees(filtered);
  };

  const handleEmployeeUpdate = async (updatedEmployee) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update(updatedEmployee)
        .eq('id', updatedEmployee.id);

      if (error) throw error;

      setEmployees(employees.map(emp => 
        emp.id === updatedEmployee.id ? { ...emp, ...updatedEmployee } : emp
      ));
      
      setShowEditModal(false);
      setSelectedEmployee(null);
      alert('Employee updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error updating employee: ' + error.message);
    }
  };

  const getEmployeeInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??';
  };

  if (loading) {
    return (
      <div className="employee-directory-loading">
        <div className="loading-spinner"></div>
        <p>Loading employee directory...</p>
      </div>
    );
  }

  return (
    <div className="employee-directory">
      <div className="directory-header">
        <div className="header-left">
          <h1>Employee Directory</h1>
          <p>Manage and view all employee information</p>
        </div>
        <div className="header-right">
          <button 
            className="add-employee-btn"
            onClick={() => window.location.href = '/recruitment'}
          >
            <span className="btn-icon">+</span>
            Add Employee
          </button>
        </div>
      </div>

      <div className="directory-filters">
        <div className="filters-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search employees by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>

        <div className="results-info">
          <span className="results-count">
            {filteredEmployees.length} of {employees.length} employees
          </span>
          <div className="quick-stats">
            <span className="stat-item">
              {employees.filter(emp => emp.is_active).length} Active
            </span>
            <span className="stat-item">
              {departments.length} Departments
            </span>
            <span className="stat-item">
              {roles.length} Roles
            </span>
          </div>
        </div>
      </div>

      <div className={`employees-container ${viewMode}`}>
        {filteredEmployees.length > 0 ? (
          viewMode === 'list' ? (
            // List View - Horizontal list without cards or avatars
            <div className="employees-list-container">
              <div className="list-header">
                <div className="list-col-name">Name</div>
                <div className="list-col-role">Role</div>
                <div className="list-col-department">Department</div>
                <div className="list-col-email">Email</div>
                <div className="list-col-status">Status</div>
                <div className="list-col-joining">Joined</div>
                <div className="list-col-actions">Actions</div>
              </div>
              {filteredEmployees.map(employee => (
                <div key={employee.id} className="employee-list-item">
                  <div className="list-col-name">
                    <div className="employee-name-info">
                      <span className="name">{employee.name}</span>
                      <span className="employee-id">ID: {employee.employee_id}</span>
                    </div>
                  </div>
                  <div className="list-col-role">{employee.role}</div>
                  <div className="list-col-department">{employee.department}</div>
                  <div className="list-col-email">{employee.email}</div>
                  <div className="list-col-status">
                    <span className={`status-pill ${employee.is_active ? 'active' : 'inactive'}`}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="list-col-joining">
                    <span className="join-date">{formatDateToDDMMYYYY(employee.joining_date)}</span>
                    <span className="tenure">{calculateTenureFromJoining(employee.joining_date)}</span>
                  </div>
                  <div className="list-col-actions">
                    <button
                      className="list-action-btn view"
                      onClick={() => setSelectedEmployee(employee)}
                      title="View Details"
                    >
                      View
                    </button>
                    <button
                      className="list-action-btn edit"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowEditModal(true);
                      }}
                      title="Edit Employee"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Grid View - Cards with avatars (existing functionality)
            filteredEmployees.map(employee => (
              <div key={employee.id} className="employee-card">
                <div className="employee-avatar">
                  <span className="avatar-text">
                    {getEmployeeInitials(employee.name)}
                  </span>
                  <div className={`status-indicator ${employee.is_active ? 'active' : 'inactive'}`}></div>
                </div>
                
                <div className="employee-info">
                  <h3 className="employee-name">{employee.name}</h3>
                  <p className="employee-role">{employee.role}</p>
                  <p className="employee-department">{employee.department}</p>
                  <p className="employee-email">{employee.email}</p>
                  
                  <div className="employee-meta">
                    <span className="joining-date">
                      Joined {formatDateToDDMMYYYY(employee.joining_date)}
                    </span>
                    <span className="tenure">
                      {calculateTenureFromJoining(employee.joining_date)} tenure
                    </span>
                    <span className="employee-id">
                      ID: {employee.employee_id}
                    </span>
                  </div>
                </div>

                <div className="employee-actions">
                  <button
                    className="action-btn view"
                    onClick={() => setSelectedEmployee(employee)}
                    title="View Details"
                  >
                    View
                  </button>
                  <button
                    className="action-btn edit"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setShowEditModal(true);
                    }}
                    title="Edit Employee"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No employees found</h3>
            <p>Try adjusting your search criteria or add new employees</p>
            <button 
              className="add-employee-btn"
              onClick={() => window.location.href = '/recruitment'}
            >
              Add First Employee
            </button>
          </div>
        )}
      </div>

      {selectedEmployee && !showEditModal && (
        <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="modal-content employee-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Employee Details</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedEmployee(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="employee-detail-header">
                <div className="large-avatar">
                  {getEmployeeInitials(selectedEmployee.name)}
                </div>
                <div className="employee-basic-info">
                  <h3>{selectedEmployee.name}</h3>
                  <p className="role">{selectedEmployee.role}</p>
                  <p className="department">{selectedEmployee.department}</p>
                  <span className={`status-badge ${selectedEmployee.is_active ? 'active' : 'inactive'}`}>
                    {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="employee-details-grid">
                <div className="detail-section">
                  <h4>Contact Information</h4>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedEmployee.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedEmployee.phone || 'Not provided'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Employment Details</h4>
                  <div className="detail-item">
                    <label>Employee ID:</label>
                    <span>{selectedEmployee.employee_id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Joining Date:</label>
                    <span>{formatDateToDDMMYYYY(selectedEmployee.joining_date)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Tenure:</label>
                    <span>{calculateTenureFromJoining(selectedEmployee.joining_date)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Salary:</label>
                    <span>₹{selectedEmployee.salary?.toLocaleString('en-IN') || 'Not specified'}</span>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-primary"
                  onClick={() => setShowEditModal(true)}
                >
                  Edit Employee
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          departments={departments}
          roles={roles}
          onSave={handleEmployeeUpdate}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
}

const EditEmployeeModal = ({ employee, departments, roles, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: employee.name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    role: employee.role || '',
    department: employee.department || '',
    salary: employee.salary || '',
    joining_date: formatDateForInput(employee.joining_date) || '',
    is_active: employee.is_active || false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...employee, ...formData, salary: parseFloat(formData.salary) || 0 });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content edit-employee-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Employee</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="edit-employee-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="">Select Role</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Department</label>
                <select name="department" value={formData.department} onChange={handleChange}>
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Salary (₹)</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Joining Date</label>
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                  />
                  <span className="checkbox-custom"></span>
                  Active Employee
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
