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
      
      // Get leave requests
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (leaveError) throw leaveError;
      
      // Get employee names separately
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, name');
      
      if (employeeError) throw employeeError;
      
      // Combine the data and clean status values
      const enrichedLeaveRequests = leaveData.map(leave => {
        const employee = employeeData.find(emp => emp.id === leave.employee_id);
        return {
          ...leave,
          employee_name: employee ? employee.name : 'Unknown Employee',
          status: leave.status ? leave.status.trim().toLowerCase() : 'pending' // Clean and normalize status
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
    
    // Validation
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
        status: 'pending'  // Always set as exactly 'pending'
      };
      
      const { error } = await supabase
        .from('leave_requests')
        .insert([submitData]);
      
      if (error) throw error;
      
      alert('Leave request submitted successfully!');
      setShowForm(false);
      
      // Reset form
      setFormData({
        employee_id: '',
        leave_type: 'sick',
        start_date: '',
        end_date: '',
        reason: '',
        status: 'pending'
      });
      
      // Refresh the list
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

  // Helper function to get status display properties
  const getStatusDisplay = (status) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
        return {
          label: 'Approved',
          backgroundColor: '#d4edda',
          color: '#155724',
          icon: '✅'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          icon: '❌'
        };
      case 'pending':
      default:
        return {
          label: 'Pending',
          backgroundColor: '#fff3cd',
          color: '#856404',
          icon: '⏳'
        };
    }
  };

  // Helper function to determine if action buttons should show
  const shouldShowActionButtons = (status) => {
    const normalizedStatus = status.toLowerCase().trim();
    return normalizedStatus === 'pending';
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>Leave Management</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '12px 24px',
            backgroundColor: showForm ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.opacity = '0.9'}
          onMouseOut={(e) => e.target.style.opacity = '1'}
        >
          {showForm ? 'Cancel' : '+ New Leave Request'}
        </button>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#495057' }}>
            Submit New Leave Request
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#495057' }}>
                  Employee *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#495057' }}>
                  Leave Type *
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="annual">Annual Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#495057' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#495057' }}>
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#495057' }}>
                Reason for Leave *
              </label>
              <textarea
                placeholder="Please provide the reason for your leave request..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                rows={4}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <button 
              type="submit" 
              style={{
                padding: '12px 30px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Submit Leave Request
            </button>
          </form>
        </div>
      )}

      {/* Leave Requests Table */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ margin: 0, color: '#495057' }}>
            Leave Requests ({leaveRequests.length})
          </h2>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#6c757d' }}>Loading leave requests...</p>
          </div>
        )}
        
        {!loading && leaveRequests.length === 0 && (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6c757d' 
          }}>
            <p>No leave requests found. Submit the first one using the button above!</p>
          </div>
        )}

        {!loading && leaveRequests.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    Employee
                  </th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    Leave Type
                  </th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    Start Date
                  </th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    End Date
                  </th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    Days
                  </th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    Reason
                  </th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '16px 12px', 
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#495057',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((request, index) => {
                  const statusDisplay = getStatusDisplay(request.status);
                  return (
                    <tr 
                      key={request.id}
                      style={{ 
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        borderBottom: '1px solid #e9ecef'
                      }}
                    >
                      <td style={{ padding: '16px 12px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#495057' }}>
                            {request.employee_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            ID: {request.employee_id}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#e7f3ff',
                          color: '#0056b3',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {request.leave_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', color: '#495057' }}>
                        {formatDate(request.start_date)}
                      </td>
                      <td style={{ padding: '16px 12px', color: '#495057' }}>
                        {formatDate(request.end_date)}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <span style={{ 
                          fontWeight: '600',
                          color: '#495057',
                          padding: '4px 8px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px'
                        }}>
                          {calculateDays(request.start_date, request.end_date)}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', maxWidth: '200px' }}>
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#6c757d',
                          fontSize: '13px'
                        }} title={request.reason}>
                          {request.reason}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          backgroundColor: statusDisplay.backgroundColor,
                          color: statusDisplay.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        {shouldShowActionButtons(request.status) ? (
                          <div style={{ 
                            display: 'flex', 
                            gap: '6px', 
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                          }}>
                            <button
                              onClick={() => updateLeaveStatus(request.id, 'approved')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => updateLeaveStatus(request.id, 'rejected')}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                              onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#6c757d',
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
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
