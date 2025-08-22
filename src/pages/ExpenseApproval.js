import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { 
  formatDateToDDMMYYYY, 
  formatDateTimeIST, 
  getTimeAgoIST 
} from '../utils/dateUtils';
import './ExpenseApproval.css';

export default function ExpenseApproval() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [reimbursementFile, setReimbursementFile] = useState(null);
  const [reimbursementDetails, setReimbursementDetails] = useState('');
  const [expenseStats, setExpenseStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    filterExpenses();
    calculateStats();
  }, [expenses, selectedStatus, searchTerm]);

    const fetchExpenses = async () => {
    try {
      setLoading(true);
      console.log('🚀 Fetching expenses...');
      
      // Simple query first
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Raw expense data:', data);
      console.log('❌ Any errors:', error);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // If we got data, manually fetch employee info
      if (data && data.length > 0) {
        const expensesWithEmployees = [];
        
        for (const expense of data) {
          let employeeInfo = null;
          
          if (expense.employee_id) {
            const { data: empData } = await supabase
              .from('employees')
              .select('name, email, role, department')
              .eq('id', expense.employee_id)
              .single();
            
            employeeInfo = empData;
          }
          
          expensesWithEmployees.push({
            ...expense,
            employees: employeeInfo || {
              name: 'Unknown Employee',
              email: 'unknown@company.com',
              role: 'Employee',
              department: 'General'
            }
          });
        }
        
        console.log('✅ Final expenses with employees:', expensesWithEmployees);
        setExpenses(expensesWithEmployees);
      } else {
        console.log('📭 No expense data found');
        setExpenses([]);
      }

    } catch (error) {
      console.error('💥 Fetch expenses error:', error);
      alert(`Error loading expenses: ${error.message}`);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(expense => expense.status === selectedStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.employees?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.employees?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.amount?.toString().includes(searchTerm)
      );
    }

    setFilteredExpenses(filtered);
  };

  const calculateStats = () => {
    const stats = {
      total: expenses.length,
      pending: expenses.filter(exp => exp.status === 'pending').length,
      approved: expenses.filter(exp => exp.status === 'approved').length,
      rejected: expenses.filter(exp => exp.status === 'rejected').length,
      totalAmount: expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0),
      pendingAmount: expenses
        .filter(exp => exp.status === 'pending')
        .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
    };
    setExpenseStats(stats);
  };

  const uploadReimbursementFile = async (file, expenseId) => {
    if (!file) return null;

    try {
      setUploadingFile(true);
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `reimbursement_${expenseId}_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('expense-bills')
        .upload(`reimbursements/${fileName}`, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('expense-bills')
        .getPublicUrl(`reimbursements/${fileName}`);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleApproveExpense = async (expense, withFile = false) => {
    try {
      setProcessingAction(true);
      let reimbursementFileUrl = null;

      // Upload reimbursement file if provided
      if (withFile && reimbursementFile) {
        reimbursementFileUrl = await uploadReimbursementFile(reimbursementFile, expense.id);
      }

      // Update expense status
      const updateData = {
        status: 'approved',
        updated_at: new Date().toISOString(),
        reimbursement_file_url: reimbursementFileUrl,
        reimbursement_details: reimbursementDetails || null,
        approved_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expense.id);

      if (error) throw error;

      // Update local state
      setExpenses(expenses.map(exp => 
        exp.id === expense.id 
          ? { ...exp, ...updateData }
          : exp
      ));

      // Reset form
      setReimbursementFile(null);
      setReimbursementDetails('');
      setShowApprovalModal(false);
      setSelectedExpense(null);

      alert('Expense approved successfully!');
    } catch (error) {
      console.error('Error approving expense:', error);
      alert('Error approving expense: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectExpense = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingAction(true);
      const updateData = {
        status: 'rejected',
        rejection_reason: rejectReason,
        updated_at: new Date().toISOString(),
        rejected_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', selectedExpense.id);

      if (error) throw error;

      setExpenses(expenses.map(exp => 
        exp.id === selectedExpense.id 
          ? { ...exp, ...updateData }
          : exp
      ));

      setShowRejectModal(false);
      setSelectedExpense(null);
      setRejectReason('');
      alert('Expense rejected successfully!');
    } catch (error) {
      console.error('Error rejecting expense:', error);
      alert('Error rejecting expense: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const openApprovalModal = (expense) => {
    setSelectedExpense(expense);
    setShowApprovalModal(true);
    setReimbursementFile(null);
    setReimbursementDetails('');
  };

  const openRejectModal = (expense) => {
    setSelectedExpense(expense);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload only JPEG, PNG, or PDF files');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }

    setReimbursementFile(file);
  };

  const downloadFile = async (fileUrl, description) => {
    if (!fileUrl) return;
    
    try {
      const fileName = fileUrl.split('/').pop() || `expense-receipt-${Date.now()}`;
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${description.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${fileName}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return 'status-pending';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '⏳';
    }
  };

  if (loading) {
    return (
      <div className="expense-approval-loading">
        <div className="loading-spinner"></div>
        <p>Loading expense requests...</p>
      </div>
    );
  }

  return (
    <div className="expense-approval">
      {/* Header */}
      <div className="expense-header">
        <div className="header-left">
          <h1>💸 Expense Approval</h1>
          <p>Review and approve employee expense reimbursement requests</p>
        </div>
        <div className="header-stats">
          <div className="stat-card pending">
            <span className="stat-number">{expenseStats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card amount">
            <span className="stat-number">₹{expenseStats.pendingAmount.toLocaleString('en-IN')}</span>
            <span className="stat-label">Pending Amount</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-item total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{expenseStats.total}</h3>
            <p>Total Expenses</p>
            <small>₹{expenseStats.totalAmount.toLocaleString('en-IN')} total amount</small>
          </div>
        </div>

        <div className="stat-item pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{expenseStats.pending}</h3>
            <p>Pending Approval</p>
            <small>₹{expenseStats.pendingAmount.toLocaleString('en-IN')} pending</small>
          </div>
        </div>

        <div className="stat-item approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{expenseStats.approved}</h3>
            <p>Approved</p>
            <small>Ready for reimbursement</small>
          </div>
        </div>

        <div className="stat-item rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>{expenseStats.rejected}</h3>
            <p>Rejected</p>
            <small>With reasons provided</small>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="expense-filters">
        <div className="filters-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by employee, description, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="results-count">
            {filteredExpenses.length} of {expenses.length} expenses
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="expense-list">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map(expense => (
            <div key={expense.id} className="expense-card">
              <div className="expense-main">
                <div className="expense-employee">
                  <div className="employee-avatar">
                    {expense.employees?.name?.charAt(0) || '?'}
                  </div>
                  <div className="employee-info">
                    <h4>{expense.employees?.name || 'Unknown Employee'}</h4>
                    <p>{expense.employees?.role} • {expense.employees?.department}</p>
                    <small>{expense.employees?.email}</small>
                  </div>
                </div>

                <div className="expense-details">
                  <h3 className="expense-description">{expense.description}</h3>
                  <div className="expense-amount">₹{parseFloat(expense.amount).toLocaleString('en-IN')}</div>
                  <div className="expense-meta">
                    <span className="expense-date">
                      📅 {formatDateToDDMMYYYY(expense.created_at)}
                    </span>
                    <span className="expense-time">
                      🕒 {getTimeAgoIST(expense.created_at)}
                    </span>
                  </div>
                </div>

                <div className="expense-status-section">
                  <span className={`status-badge ${getStatusBadgeClass(expense.status)}`}>
                    {getStatusIcon(expense.status)} {expense.status.toUpperCase()}
                  </span>
                  
                  <div className="file-info">
                    {expense.file_url && (
                      <button 
                        className="file-download-btn employee-receipt"
                        onClick={() => downloadFile(expense.file_url, expense.description)}
                        title="Download Employee Receipt"
                      >
                        📎 Employee Receipt
                      </button>
                    )}
                    {expense.reimbursement_file_url && (
                      <button 
                        className="file-download-btn reimbursement-file"
                        onClick={() => downloadFile(expense.reimbursement_file_url, `reimbursement_${expense.description}`)}
                        title="Download Reimbursement Document"
                      >
                        📋 Reimbursement Doc
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="expense-actions">
                <button
                  className="action-btn view"
                  onClick={() => setSelectedExpense(expense)}
                  title="View Details"
                >
                  👁️ View
                </button>

                {expense.status === 'pending' && (
                  <>
                    <button
                      className="action-btn approve"
                      onClick={() => openApprovalModal(expense)}
                      disabled={processingAction}
                      title="Approve with Reimbursement"
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="action-btn reject"
                      onClick={() => openRejectModal(expense)}
                      disabled={processingAction}
                      title="Reject Expense"
                    >
                      ❌ Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <h3>No expense requests found</h3>
            <p>
              {selectedStatus !== 'all' 
                ? `No ${selectedStatus} expenses found` 
                : 'No expense requests submitted yet'
              }
            </p>
          </div>
        )}
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && !showRejectModal && !showApprovalModal && (
        <div className="modal-overlay" onClick={() => setSelectedExpense(null)}>
          <div className="modal-content expense-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Expense Details</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedExpense(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="expense-detail-content">
                <div className="detail-section">
                  <h4>Employee Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Name:</label>
                      <span>{selectedExpense.employees?.name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{selectedExpense.employees?.email}</span>
                    </div>
                    <div className="detail-item">
                      <label>Role:</label>
                      <span>{selectedExpense.employees?.role}</span>
                    </div>
                    <div className="detail-item">
                      <label>Department:</label>
                      <span>{selectedExpense.employees?.department}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Expense Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Description:</label>
                      <span>{selectedExpense.description}</span>
                    </div>
                    <div className="detail-item">
                      <label>Amount:</label>
                      <span className="amount-highlight">
                        ₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className={`status-badge ${getStatusBadgeClass(selectedExpense.status)}`}>
                        {getStatusIcon(selectedExpense.status)} {selectedExpense.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Submitted:</label>
                      <span>{formatDateTimeIST(selectedExpense.created_at)}</span>
                    </div>
                    {selectedExpense.approved_at && (
                      <div className="detail-item">
                        <label>Approved:</label>
                        <span>{formatDateTimeIST(selectedExpense.approved_at)}</span>
                      </div>
                    )}
                    {selectedExpense.rejected_at && (
                      <div className="detail-item">
                        <label>Rejected:</label>
                        <span>{formatDateTimeIST(selectedExpense.rejected_at)}</span>
                      </div>
                    )}
                    {selectedExpense.rejection_reason && (
                      <div className="detail-item">
                        <label>Rejection Reason:</label>
                        <span className="rejection-reason">{selectedExpense.rejection_reason}</span>
                      </div>
                    )}
                    {selectedExpense.reimbursement_details && (
                      <div className="detail-item">
                        <label>Reimbursement Notes:</label>
                        <span>{selectedExpense.reimbursement_details}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Employee Receipt Section */}
                {selectedExpense.file_url && (
                  <div className="detail-section">
                    <h4>Employee Receipt</h4>
                    <div className="receipt-section">
                      <div className="receipt-preview">
                        {selectedExpense.file_url.toLowerCase().includes('.pdf') ? (
                          <div className="pdf-preview">
                            <div className="pdf-icon">📄</div>
                            <p>Employee Receipt (PDF)</p>
                          </div>
                        ) : (
                          <img 
                            src={selectedExpense.file_url} 
                            alt="Employee Receipt" 
                            className="receipt-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        )}
                        <div className="file-error" style={{ display: 'none' }}>
                          <div className="error-icon">📎</div>
                          <p>File Preview Not Available</p>
                        </div>
                      </div>
                      <div className="receipt-actions">
                        <button 
                          className="download-btn"
                          onClick={() => downloadFile(selectedExpense.file_url, selectedExpense.description)}
                        >
                          📥 Download Employee Receipt
                        </button>
                        <button 
                          className="view-btn"
                          onClick={() => window.open(selectedExpense.file_url, '_blank')}
                        >
                          👁️ View Full Size
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reimbursement Document Section */}
                {selectedExpense.reimbursement_file_url && (
                  <div className="detail-section">
                    <h4>Reimbursement Document</h4>
                    <div className="receipt-section">
                      <div className="receipt-preview">
                        {selectedExpense.reimbursement_file_url.toLowerCase().includes('.pdf') ? (
                          <div className="pdf-preview">
                            <div className="pdf-icon">📋</div>
                            <p>Reimbursement Document (PDF)</p>
                          </div>
                        ) : (
                          <img 
                            src={selectedExpense.reimbursement_file_url} 
                            alt="Reimbursement Document" 
                            className="receipt-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        )}
                        <div className="file-error" style={{ display: 'none' }}>
                          <div className="error-icon">📋</div>
                          <p>File Preview Not Available</p>
                        </div>
                      </div>
                      <div className="receipt-actions">
                        <button 
                          className="download-btn"
                          onClick={() => downloadFile(selectedExpense.reimbursement_file_url, `reimbursement_${selectedExpense.description}`)}
                        >
                          📥 Download Reimbursement Doc
                        </button>
                        <button 
                          className="view-btn"
                          onClick={() => window.open(selectedExpense.reimbursement_file_url, '_blank')}
                        >
                          👁️ View Full Size
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                {selectedExpense.status === 'pending' && (
                  <>
                    <button 
                      className="btn-approve"
                      onClick={() => openApprovalModal(selectedExpense)}
                      disabled={processingAction}
                    >
                      ✅ Approve with Reimbursement
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => openRejectModal(selectedExpense)}
                      disabled={processingAction}
                    >
                      ❌ Reject Expense
                    </button>
                  </>
                )}
                <button 
                  className="btn-secondary"
                  onClick={() => setSelectedExpense(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal with File Upload */}
      {showApprovalModal && selectedExpense && (
        <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="modal-content approval-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✅ Approve Expense & Add Reimbursement Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowApprovalModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="approval-content">
                <div className="expense-summary">
                  <h4>Approving Expense</h4>
                  <p><strong>Employee:</strong> {selectedExpense.employees?.name}</p>
                  <p><strong>Description:</strong> {selectedExpense.description}</p>
                  <p><strong>Amount:</strong> ₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}</p>
                </div>

                <div className="reimbursement-section">
                  <h4>Reimbursement Details (Optional)</h4>
                  
                  <div className="form-group">
                    <label>Reimbursement Notes</label>
                    <textarea
                      value={reimbursementDetails}
                      onChange={(e) => setReimbursementDetails(e.target.value)}
                      placeholder="Add payment method, transaction ID, or other reimbursement details..."
                      rows={3}
                      className="reimbursement-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label>Upload Transaction Receipt/Document (Optional)</label>
                    <div className="file-upload-section">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="file-input"
                        id="reimbursement-file"
                      />
                      <label htmlFor="reimbursement-file" className="file-upload-label">
                        <span className="upload-icon">📎</span>
                        {reimbursementFile ? reimbursementFile.name : 'Choose PDF or Image file'}
                      </label>
                      {reimbursementFile && (
                        <div className="file-preview">
                          <span className="file-name">
                            📄 {reimbursementFile.name} ({(reimbursementFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                          <button 
                            type="button"
                            onClick={() => setReimbursementFile(null)}
                            className="remove-file-btn"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    <small className="file-help">
                      Supported formats: PDF, JPEG, PNG (Max 5MB)
                    </small>
                  </div>
                </div>

                <div className="approval-options">
                  <div className="option-buttons">
                    <button
                      className="btn-approve-simple"
                      onClick={() => handleApproveExpense(selectedExpense, false)}
                      disabled={processingAction || uploadingFile}
                    >
                      ✅ Approve Only
                    </button>
                    <button
                      className="btn-approve-with-file"
                      onClick={() => handleApproveExpense(selectedExpense, true)}
                      disabled={processingAction || uploadingFile}
                    >
                      {uploadingFile ? '⏳ Uploading...' : '✅ Approve & Upload Details'}
                    </button>
                  </div>
                  <p className="option-help">
                    Choose "Approve Only" for quick approval, or "Approve & Upload Details" to include reimbursement documentation.
                  </p>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setReimbursementFile(null);
                    setReimbursementDetails('');
                  }}
                  disabled={processingAction || uploadingFile}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedExpense && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>❌ Reject Expense Request</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRejectModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="reject-content">
                <div className="expense-summary">
                  <h4>Rejecting Expense</h4>
                  <p><strong>Employee:</strong> {selectedExpense.employees?.name}</p>
                  <p><strong>Description:</strong> {selectedExpense.description}</p>
                  <p><strong>Amount:</strong> ₹{parseFloat(selectedExpense.amount).toLocaleString('en-IN')}</p>
                </div>

                <div className="rejection-form">
                  <label htmlFor="reject-reason">
                    Reason for Rejection *
                  </label>
                  <textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please provide a clear reason for rejecting this expense request..."
                    rows={4}
                    className="reject-textarea"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn-reject-confirm"
                  onClick={handleRejectExpense}
                  disabled={processingAction || !rejectReason.trim()}
                >
                  {processingAction ? 'Rejecting...' : '❌ Confirm Rejection'}
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  disabled={processingAction}
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
