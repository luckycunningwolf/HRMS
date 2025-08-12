import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { getCurrentISTDateOnly } from '../utils/dateUtils';
import './Recruitment.css';

export default function Recruitment() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    // Basic Info
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    salary: '',
    joining_date: getCurrentISTDateOnly(),
    employee_id: '',
    is_active: true,
    
    // Personal Details
    dob: '',
    wedding_anniversary: '',
    
    // Identification
    pan: '',
    aadhar: '',
    passport: '',
    
    // Bank Details
    bank_name: '',
    bank_account: '',
    bank_ifsc: '',
    
    // Emergency Contact
    emergency_contact: '',
    
    // Employment Details
    probation_period: '',
    confirmation_date: '',
    
    // Addresses
    address_permanent: '',
    address_current: ''
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
      // Format bank details and emergency contacts as JSON objects
      const bankInfo = `Bank Name: ${newEmployee.bank_name}, Account Number: ${newEmployee.bank_account}, IFSC: ${newEmployee.bank_ifsc}`;
      
      const submission = {
        ...newEmployee,
        salary: parseFloat(newEmployee.salary) || 0,
        bank_details: { info: bankInfo },
        emergency_contacts: [{ contact: newEmployee.emergency_contact }],
        created_at: new Date().toISOString(),
      };

      // Remove individual bank fields that are now in bank_details
      delete submission.bank_name;
      delete submission.bank_account;
      delete submission.bank_ifsc;
      delete submission.emergency_contact;

      const { error } = await supabase
        .from('employees')
        .insert([submission]);

      if (error) throw error;

      alert('Employee added successfully!');
      
      // Reset form
      setNewEmployee({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: '',
        salary: '',
        joining_date: getCurrentISTDateOnly(),
        employee_id: '',
        is_active: true,
        dob: '',
        wedding_anniversary: '',
        pan: '',
        aadhar: '',
        passport: '',
        bank_name: '',
        bank_account: '',
        bank_ifsc: '',
        emergency_contact: '',
        probation_period: '',
        confirmation_date: '',
        address_permanent: '',
        address_current: ''
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
        <div>
          <h1>Recruitment Management</h1>
          <p>Add new employees and manage recruitment process</p>
        </div>
      </div>

      {!showAddForm ? (
        <div className="recruitment-welcome">
          <div className="welcome-card">
            <div className="welcome-icon">👥</div>
            <h2>Add New Employee</h2>
            <p>Start the onboarding process by adding a new team member with comprehensive details</p>
            <button 
              className="start-recruitment-btn"
              onClick={() => setShowAddForm(true)}
            >
              + Add New Employee
            </button>
          </div>
        </div>
      ) : (
        <div className="add-employee-form-container">
          <div className="form-header">
            <h2>New Employee Registration</h2>
            <button 
              className="close-form-btn"
              onClick={() => setShowAddForm(false)}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="add-employee-form">
            {/* Personal Information */}
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

                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={newEmployee.dob}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Wedding Anniversary</label>
                  <input
                    type="date"
                    name="wedding_anniversary"
                    value={newEmployee.wedding_anniversary}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Identification Documents */}
            <div className="form-section">
              <h3>Identification Documents</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    name="pan"
                    value={newEmployee.pan}
                    onChange={handleChange}
                    placeholder="Enter PAN number"
                  />
                </div>

                <div className="form-group">
                  <label>Aadhar Number</label>
                  <input
                    type="text"
                    name="aadhar"
                    value={newEmployee.aadhar}
                    onChange={handleChange}
                    placeholder="Enter Aadhar number"
                  />
                </div>

                <div className="form-group">
                  <label>Passport Number</label>
                  <input
                    type="text"
                    name="passport"
                    value={newEmployee.passport}
                    onChange={handleChange}
                    placeholder="Enter passport number"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="form-section">
              <h3>Bank Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={newEmployee.bank_name}
                    onChange={handleChange}
                    placeholder="Enter bank name"
                  />
                </div>

                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    name="bank_account"
                    value={newEmployee.bank_account}
                    onChange={handleChange}
                    placeholder="Enter account number"
                  />
                </div>

                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    name="bank_ifsc"
                    value={newEmployee.bank_ifsc}
                    onChange={handleChange}
                    placeholder="Enter IFSC code"
                  />
                </div>

                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    name="emergency_contact"
                    value={newEmployee.emergency_contact}
                    onChange={handleChange}
                    placeholder="Enter emergency contact"
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
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

                <div className="form-group">
                  <label>Probation Period (months)</label>
                  <input
                    type="number"
                    name="probation_period"
                    value={newEmployee.probation_period}
                    onChange={handleChange}
                    min="0"
                    placeholder="Enter probation period"
                  />
                </div>

                <div className="form-group">
                  <label>Confirmation Date</label>
                  <input
                    type="date"
                    name="confirmation_date"
                    value={newEmployee.confirmation_date}
                    onChange={handleChange}
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

            {/* Addresses */}
            <div className="form-section">
              <h3>Address Details</h3>
              <div className="form-grid address-grid">
                <div className="form-group full-width">
                  <label>Permanent Address</label>
                  <textarea
                    name="address_permanent"
                    value={newEmployee.address_permanent}
                    onChange={handleChange}
                    placeholder="Enter permanent address"
                    rows="3"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Current Address</label>
                  <textarea
                    name="address_current"
                    value={newEmployee.address_current}
                    onChange={handleChange}
                    placeholder="Enter current address"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Adding Employee...' : 'Add Employee'}
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
