import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import './LeaveManagement.css';

export default function LeaveManagement() {
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: 'sick',
    start_date: '',
    end_date: '',
    reason: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchEmployees();
    fetchLeaveRequests();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email');
      
      if (error) throw error;
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Error loading employees: ' + error.message);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (leaveError) throw leaveError;
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, name');
      
      if (employeeError) throw employeeError;
      
      const enrichedLeaveRequests = leaveData.map(leave => {
        const employee = employeeData.find(emp => emp.id === leave.employee_id);
        return {
          ...leave,
          employee_name: employee ? employee.name : 'Unknown Employee',
          status: leave.status ? leave.status.trim().toLowerCase() : 'pending'
        };
      });
      
      setLeaveRequests(enrichedLeaveRequests);
      
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      alert('Error loading leave requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id) {
      alert('Please select an employee');
      return;
    }
    
    if (!formData.start_date || !formData.end_date) {
      alert('Please select start and end dates');
      return;
    }
    
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      alert('End date cannot be before start date');
      return;
    }
    
    try {
      const submitData = {
        employee_id: parseInt(formData.employee_id),
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason.trim() || '',
        status: 'pending'
      };
      
      const { error } = await supabase
        .from('leave_requests')
        .insert([submitData]);
      
      if (error) throw error;
      
      alert('Leave request submitted successfully!');
      setShowForm(false);
      
      setFormData({
        employee_id: '',
        leave_type: 'sick',
        start_date: '',
        end_date: '',
        reason: '',
        status: 'pending'
      });
      
      fetchLeaveRequests();
      
    } catch (error) {
      console.error('Error submitting leave request:', error);
      alert('Error: ' + error.message);
    }
  };

  const updateLeaveStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      alert(`Leave request ${newStatus}!`);
      fetchLeaveRequests();
      
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating leave status: ' + error.message);
    }
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusDisplay = (status) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
        return { label: 'Approved', icon: '✅' };
      case 'rejected':
        return { label: 'Rejected', icon: '❌' };
      case 'pending':
      default:
        return { label: 'Pending', icon: '⏳' };
    }
  };

  const shouldShowActionButtons = (status) => {
    return status.toLowerCase().trim() === 'pending';
  };

  return (
    <div className="leave-management">
      {/* Header */}
      <div className="leave-header">
        <div>
          <h1>Leave Management</h1>
          <p>Manage employee leave requests efficiently</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`new-request-btn ${showForm ? 'cancel' : ''}`}
        >
          {showForm ? '✕ Cancel' : '+ New Leave Request'}
        </button>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div className="leave-form-container">
          <h3 className="form-title">Submit New Leave Request</h3>
          
          <form onSubmit={handleSubmit} className="leave-form">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label required">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  required
                  className="form-select"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Leave Type</label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                  className="form-select"
                >
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="annual">Annual Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label required">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Reason for Leave</label>
              <textarea
                placeholder="Please provide the reason for your leave request..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                required
                className="form-textarea"
              />
            </div>

            <button type="submit" className="submit-btn">
              Submit Leave Request
            </button>
          </form>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="leave-table-container">
        <div className="table-header">
          <h2>Leave Requests ({leaveRequests.length})</h2>
        </div>

        {loading && (
          <div className="loading-state">
            <p>
              <span className="loading-spinner"></span>
              Loading leave requests...
            </p>
          </div>
        )}
        
        {!loading && leaveRequests.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No leave requests found. Submit the first one using the button above!</p>
          </div>
        )}

        {!loading && leaveRequests.length > 0 && (
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead className="table-head">
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th className="center">Days</th>
                  <th className="center">Reason</th>
                  <th className="center">Status</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {leaveRequests.map((request) => {
                  const statusDisplay = getStatusDisplay(request.status);
                  return (
                    <tr key={request.id}>
                      <td>
                        <div className="employee-info">
                          <div className="employee-name">{request.employee_name}</div>
                          <div className="employee-id">ID: {request.employee_id}</div>
                        </div>
                      </td>
                      <td>
                        <span className="leave-type-badge">
                          {request.leave_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="date-display">
                        {formatDate(request.start_date)}
                      </td>
                      <td className="date-display">
                        {formatDate(request.end_date)}
                      </td>
                      <td className="center">
                        <span className="days-badge">
                          {calculateDays(request.start_date, request.end_date)}
                        </span>
                      </td>
                      <td className="reason-cell">
                        <div className="reason-text" title={request.reason}>
                          {request.reason}
                        </div>
                      </td>
                      <td className="center">
                        <span className={`status-badge ${request.status}`}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>
                      </td>
                      <td className="center">
                        {shouldShowActionButtons(request.status) ? (
                          <div className="action-buttons">
                            <button
                              onClick={() => updateLeaveStatus(request.id, 'approved')}
                              className="action-btn approve"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => updateLeaveStatus(request.id, 'rejected')}
                              className="action-btn reject"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        ) : (
                          <span className="action-disabled">
                            {statusDisplay.icon} {statusDisplay.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
