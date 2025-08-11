import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { getCurrentISTDateOnly } from '../utils/dateUtils';
import './Recruitment.css';

export default function Recruitment() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    salary: '',
    joining_date: getCurrentISTDateOnly(),
    employee_id: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  const generateEmployeeId = () => {
    const prefix = 'EMP';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  };

  useEffect(() => {
    if (showAddForm && !newEmployee.employee_id) {
      setNewEmployee(prev => ({
        ...prev,
        employee_id: generateEmployeeId(),
        joining_date: getCurrentISTDateOnly()
      }));
    }
  }, [showAddForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('employees')
        .insert([{
          ...newEmployee,
          salary: parseFloat(newEmployee.salary) || 0
        }]);

      if (error) throw error;

      alert('Employee added successfully!');
      setNewEmployee({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: '',
        salary: '',
        joining_date: getCurrentISTDateOnly(),
        employee_id: '',
        is_active: true
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Error adding employee: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="recruitment">
      <div className="recruitment-header">
        <h1>📝 Recruitment Management</h1>
        <p>Add new employees and manage recruitment process</p>
      </div>

      {!showAddForm ? (
        <div className="recruitment-welcome">
          <div className="welcome-card">
            <h2>Add New Employee</h2>
            <p>Start the onboarding process by adding a new team member</p>
            <button 
              className="start-recruitment-btn"
              onClick={() => setShowAddForm(true)}
            >
              ➕ Add New Employee
            </button>
          </div>
        </div>
      ) : (
        <div className="add-employee-form-container">
          <div className="form-header">
            <h2>👤 New Employee Registration</h2>
            <button 
              className="close-form-btn"
              onClick={() => setShowAddForm(false)}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="add-employee-form">
            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={newEmployee.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={newEmployee.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={newEmployee.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Employment Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    name="employee_id"
                    value={newEmployee.employee_id}
                    onChange={handleChange}
                    placeholder="Auto-generated ID"
                  />
                </div>

                <div className="form-group">
                  <label>Role/Position *</label>
                  <select
                    name="role"
                    value={newEmployee.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="Software Developer">Software Developer</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Designer">Designer</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Marketing Manager">Marketing Manager</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Department *</label>
                  <select
                    name="department"
                    value={newEmployee.department}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Technology">Technology</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Administration">Administration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Salary (₹)</label>
                  <input
                    type="number"
                    name="salary"
                    value={newEmployee.salary}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter annual salary"
                  />
                </div>

                <div className="form-group">
                  <label>Joining Date *</label>
                  <input
                    type="date"
                    name="joining_date"
                    value={newEmployee.joining_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={newEmployee.is_active}
                      onChange={handleChange}
                    />
                    <span className="checkbox-custom"></span>
                    Active Employee
                  </label>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Adding Employee...' : '✅ Add Employee'}
              </button>
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
