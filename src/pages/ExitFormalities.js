import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { getCurrentISTDateOnly } from '../utils/dateUtils';
import './ExitFormalities.css';

export default function ExitFormalities() {
  const [employees, setEmployees] = useState([]);
  const [exitRequests, setExitRequests] = useState([]);
  const [showNewExitForm, setShowNewExitForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [newExitRequest, setNewExitRequest] = useState({
    employee_id: '',
    resignation_date: getCurrentISTDateOnly(),
    last_working_day: '',
    exit_reason: 'resignation',
    reason_details: '',
    notice_period_days: 30,
    status: 'pending',
    // Clearance items
    clearances: {
      it_clearance: false,
      hr_clearance: false,
      finance_clearance: false,
      admin_clearance: false,
      project_handover: false,
      asset_return: false,
      knowledge_transfer: false,
      exit_interview: false
    },
    // Final settlement
    final_settlement: {
      pending_salary: 0,
      bonus_amount: 0,
      leave_encashment: 0,
      gratuity_amount: 0,
      deductions: 0,
      total_amount: 0
    },
    notes: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchExitRequests()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchExitRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('exit_formalities')
        .select(`
          *,
          employees (
            id,
            name,
            email,
            department,
            role
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setExitRequests(data || []);
    } catch (error) {
      console.error('Error fetching exit requests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('exit_formalities')
        .insert([{
          ...newExitRequest,
          employee_id: parseInt(newExitRequest.employee_id),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      alert('Exit formality request submitted successfully!');
      setNewExitRequest({
        employee_id: '',
        resignation_date: getCurrentISTDateOnly(),
        last_working_day: '',
        exit_reason: 'resignation',
        reason_details: '',
        notice_period_days: 30,
        status: 'pending',
        clearances: {
          it_clearance: false,
          hr_clearance: false,
          finance_clearance: false,
          admin_clearance: false,
          project_handover: false,
          asset_return: false,
          knowledge_transfer: false,
          exit_interview: false
        },
        final_settlement: {
          pending_salary: 0,
          bonus_amount: 0,
          leave_encashment: 0,
          gratuity_amount: 0,
          deductions: 0,
          total_amount: 0
        },
        notes: ''
      });
      setShowNewExitForm(false);
      fetchExitRequests();
    } catch (error) {
      console.error('Error submitting exit request:', error);
      alert('Error submitting exit request: ' + error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('clearances.')) {
      const clearanceField = name.split('.')[1];
      setNewExitRequest(prev => ({
        ...prev,
        clearances: {
          ...prev.clearances,
          [clearanceField]: checked
        }
      }));
    } else if (name.startsWith('final_settlement.')) {
      const settlementField = name.split('.')[1];
      const updatedSettlement = {
        ...newExitRequest.final_settlement,
        [settlementField]: parseFloat(value) || 0
      };
      
      // Auto-calculate total
      if (settlementField !== 'total_amount') {
        updatedSettlement.total_amount = 
          updatedSettlement.pending_salary +
          updatedSettlement.bonus_amount +
          updatedSettlement.leave_encashment +
          updatedSettlement.gratuity_amount -
          updatedSettlement.deductions;
      }
      
      setNewExitRequest(prev => ({
        ...prev,
        final_settlement: updatedSettlement
      }));
    } else {
      setNewExitRequest(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const updateExitStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('exit_formalities')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      alert(`Exit request ${newStatus}!`);
      fetchExitRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + error.message);
    }
  };

  const updateClearance = async (exitId, clearanceField, value) => {
    try {
      const exitRequest = exitRequests.find(req => req.id === exitId);
      const updatedClearances = {
        ...exitRequest.clearances,
        [clearanceField]: value
      };

      const { error } = await supabase
        .from('exit_formalities')
        .update({ clearances: updatedClearances })
        .eq('id', exitId);

      if (error) throw error;

      // Manually update the local state to reflect the change immediately
      const updatedRequests = exitRequests.map(req => 
        req.id === exitId 
          ? { ...req, clearances: { ...req.clearances, [clearanceField]: value } }
          : req
      );
      setExitRequests(updatedRequests);

      // Also update the selectedEmployee if it's the one being edited
      if (selectedEmployee && selectedEmployee.id === exitId) {
        setSelectedEmployee(prev => ({
          ...prev,
          clearances: {
            ...prev.clearances,
            [clearanceField]: value
          }
        }));
      }

    } catch (error) {
      console.error('Error updating clearance:', error);
      alert('Error updating clearance: ' + error.message);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return { label: 'Approved', icon: '✅', class: 'approved' };
      case 'rejected':
        return { label: 'Rejected', icon: '❌', class: 'rejected' };
      case 'in_progress':
        return { label: 'In Progress', icon: '🔄', class: 'in-progress' };
      case 'completed':
        return { label: 'Completed', icon: '🎉', class: 'completed' };
      default:
        return { label: 'Pending', icon: '⏳', class: 'pending' };
    }
  };

  const getClearanceProgress = (clearances) => {
    const totalItems = Object.keys(clearances).length;
    const completedItems = Object.values(clearances).filter(Boolean).length;
    return { completed: completedItems, total: totalItems, percentage: (completedItems / totalItems) * 100 };
  };

  const filteredExitRequests = exitRequests.filter(request => {
    if (activeTab === 'active') {
      return ['pending', 'in_progress'].includes(request.status);
    } else if (activeTab === 'completed') {
      return ['approved', 'completed'].includes(request.status);
    } else if (activeTab === 'rejected') {
      return request.status === 'rejected';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="exit-loading">
        <div className="loading-spinner"></div>
        <p>Loading exit formalities...</p>
      </div>
    );
  }

  return (
    <div className="exit-formalities">
      {/* Header */}
      <div className="exit-header">
        <div>
          <h1>Exit Formalities</h1>
          <p>Manage employee exit processes and clearances</p>
        </div>
        <button 
          onClick={() => setShowNewExitForm(true)}
          className="new-exit-btn"
        >
          + New Exit Request
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({exitRequests.filter(req => ['pending', 'in_progress'].includes(req.status)).length})
        </button>
        <button
          className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({exitRequests.filter(req => ['approved', 'completed'].includes(req.status)).length})
        </button>
        <button
          className={`tab-button ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected ({exitRequests.filter(req => req.status === 'rejected').length})
        </button>
      </div>

      {/* Exit Requests Grid */}
      <div className="exit-requests-grid">
        {filteredExitRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No exit requests found</h3>
            <p>No exit requests match the current filter criteria.</p>
          </div>
        ) : (
          filteredExitRequests.map(request => {
            const statusDisplay = getStatusDisplay(request.status);
            const clearanceProgress = getClearanceProgress(request.clearances);
            
            return (
              <div key={request.id} className="exit-request-card">
                <div className="card-header">
                  <div className="employee-info">
                    <h3>{request.employees?.name || 'Unknown Employee'}</h3>
                    <p>{request.employees?.role} • {request.employees?.department}</p>
                  </div>
                  <span className={`status-badge ${statusDisplay.class}`}>
                    {statusDisplay.icon} {statusDisplay.label}
                  </span>
                </div>

                <div className="card-body">
                  <div className="exit-details">
                    <div className="detail-item">
                      <span className="label">Resignation Date:</span>
                      <span className="value">{new Date(request.resignation_date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Last Working Day:</span>
                      <span className="value">{request.last_working_day ? new Date(request.last_working_day).toLocaleDateString() : 'TBD'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Exit Reason:</span>
                      <span className="value">{request.exit_reason}</span>
                    </div>
                  </div>

                  <div className="clearance-progress">
                    <div className="progress-header">
                      <span>Clearance Progress</span>
                      <span className="progress-text">
                        {clearanceProgress.completed}/{clearanceProgress.total}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${clearanceProgress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    onClick={() => {
                      setSelectedEmployee(request);
                      setShowDetailsModal(true);
                    }}
                    className="view-details-btn"
                  >
                    View Details
                  </button>
                  
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateExitStatus(request.id, 'in_progress')}
                        className="approve-btn"
                      >
                        Start Process
                      </button>
                      <button
                        onClick={() => updateExitStatus(request.id, 'rejected')}
                        className="reject-btn"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {request.status === 'in_progress' && clearanceProgress.percentage === 100 && (
                    <button
                      onClick={() => updateExitStatus(request.id, 'completed')}
                      className="complete-btn"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Exit Form Modal */}
      {showNewExitForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>New Exit Request</h2>
              <button 
                className="modal-close"
                onClick={() => setShowNewExitForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit} className="exit-form">
              <div className="form-section">
                <h3>Employee Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Employee *</label>
                    <select
                      name="employee_id"
                      value={newExitRequest.employee_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} - {emp.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Resignation Date *</label>
                    <input
                      type="date"
                      name="resignation_date"
                      value={newExitRequest.resignation_date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Working Day</label>
                    <input
                      type="date"
                      name="last_working_day"
                      value={newExitRequest.last_working_day}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notice Period (Days)</label>
                    <input
                      type="number"
                      name="notice_period_days"
                      value={newExitRequest.notice_period_days}
                      onChange={handleChange}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Exit Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Exit Reason *</label>
                    <select
                      name="exit_reason"
                      value={newExitRequest.exit_reason}
                      onChange={handleChange}
                      required
                    >
                      <option value="resignation">Resignation</option>
                      <option value="termination">Termination</option>
                      <option value="retirement">Retirement</option>
                      <option value="contract_end">Contract End</option>
                      <option value="mutual_separation">Mutual Separation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason Details</label>
                  <textarea
                    name="reason_details"
                    value={newExitRequest.reason_details}
                    onChange={handleChange}
                    placeholder="Additional details about the exit reason..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Final Settlement</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Pending Salary (₹)</label>
                    <input
                      type="number"
                      name="final_settlement.pending_salary"
                      value={newExitRequest.final_settlement.pending_salary}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bonus Amount (₹)</label>
                    <input
                      type="number"
                      name="final_settlement.bonus_amount"
                      value={newExitRequest.final_settlement.bonus_amount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Leave Encashment (₹)</label>
                    <input
                      type="number"
                      name="final_settlement.leave_encashment"
                      value={newExitRequest.final_settlement.leave_encashment}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gratuity Amount (₹)</label>
                    <input
                      type="number"
                      name="final_settlement.gratuity_amount"
                      value={newExitRequest.final_settlement.gratuity_amount}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Deductions (₹)</label>
                    <input
                      type="number"
                      name="final_settlement.deductions"
                      value={newExitRequest.final_settlement.deductions}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Amount (₹)</label>
                    <input
                      type="number"
                      name="final_settlement.total_amount"
                      value={newExitRequest.final_settlement.total_amount}
                      readOnly
                      className="readonly-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Additional Notes</h3>
                <div className="form-group">
                  <textarea
                    name="notes"
                    value={newExitRequest.notes}
                    onChange={handleChange}
                    placeholder="Any additional notes or comments..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  Submit Exit Request
                </button>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowNewExitForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>Exit Details - {selectedEmployee.employees?.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="details-section">
                  <h3>Employee Information</h3>
                  <div className="detail-item">
                    <span className="label">Name:</span>
                    <span className="value">{selectedEmployee.employees?.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Role:</span>
                    <span className="value">{selectedEmployee.employees?.role}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Department:</span>
                    <span className="value">{selectedEmployee.employees?.department}</span>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Exit Information</h3>
                  <div className="detail-item">
                    <span className="label">Resignation Date:</span>
                    <span className="value">{new Date(selectedEmployee.resignation_date).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Last Working Day:</span>
                    <span className="value">{selectedEmployee.last_working_day ? new Date(selectedEmployee.last_working_day).toLocaleDateString() : 'TBD'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Notice Period:</span>
                    <span className="value">{selectedEmployee.notice_period_days} days</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Exit Reason:</span>
                    <span className="value">{selectedEmployee.exit_reason}</span>
                  </div>
                </div>
              </div>

              <div className="clearances-section">
                <h3>Clearance Checklist</h3>
                <div className="clearance-grid">
                  {Object.entries(selectedEmployee.clearances).map(([key, value]) => (
                    <div key={key} className="clearance-item">
                      <label className="clearance-label">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => updateClearance(selectedEmployee.id, key, e.target.checked)}
                          disabled={selectedEmployee.status === 'completed'}
                        />
                        <span className="checkmark"></span>
                        <span className="clearance-text">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedEmployee.final_settlement && (
                <div className="settlement-section">
                  <h3>Final Settlement</h3>
                  <div className="settlement-grid">
                    <div className="settlement-item">
                      <span className="label">Pending Salary:</span>
                      <span className="value">₹{selectedEmployee.final_settlement.pending_salary?.toLocaleString()}</span>
                    </div>
                    <div className="settlement-item">
                      <span className="label">Bonus Amount:</span>
                      <span className="value">₹{selectedEmployee.final_settlement.bonus_amount?.toLocaleString()}</span>
                    </div>
                    <div className="settlement-item">
                      <span className="label">Leave Encashment:</span>
                      <span className="value">₹{selectedEmployee.final_settlement.leave_encashment?.toLocaleString()}</span>
                    </div>
                    <div className="settlement-item">
                      <span className="label">Gratuity:</span>
                      <span className="value">₹{selectedEmployee.final_settlement.gratuity_amount?.toLocaleString()}</span>
                    </div>
                    <div className="settlement-item">
                      <span className="label">Deductions:</span>
                      <span className="value negative">-₹{selectedEmployee.final_settlement.deductions?.toLocaleString()}</span>
                    </div>
                    <div className="settlement-item total">
                      <span className="label">Total Amount:</span>
                      <span className="value">₹{selectedEmployee.final_settlement.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedEmployee.notes && (
                <div className="notes-section">
                  <h3>Notes</h3>
                  <p>{selectedEmployee.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
