import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { 
  formatDateToDDMMYYYY, 
  formatDateTimeIST 
} from '../utils/dateUtils';
import './GoalsKPI.css';

export default function GoalsKPI() {
  const [goalsKPIs, setGoalsKPIs] = useState([]);
  const [stats, setStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    totalKPIs: 0,
    averageProgress: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: 'all', // 'all', 'goals', 'kpis'
    status: 'all',
    employee: '',
    department: ''
  });
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Inline style objects
  const cardStyle = {
    background: 'white',
    backgroundColor: 'white',
    backgroundImage: 'none',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    border: '1px solid #e9ecef',
    minHeight: '120px',
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s'
  };

  const cardTopBorder = {
    content: '',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px'
  };

  const iconStyle = (color) => ({
    fontSize: '2rem',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
    color: color === '#ffc107' ? '#212529' : 'white'
  });

  const contentStyle = {
    background: 'transparent',
    backgroundColor: 'transparent',
    flex: 1,
    minWidth: 0
  };

  const numberStyle = {
    margin: '0 0 0.25rem 0',
    fontSize: '2rem',
    fontWeight: '700',
    color: '#333',
    lineHeight: 1
  };

  const labelStyle = {
    margin: '0',
    color: '#495057',
    fontWeight: '500',
    fontSize: '1rem',
    lineHeight: 1.2
  };

  useEffect(() => {
    fetchGoalsKPIs();
    fetchEmployees();
  }, [filter]);

  const fetchGoalsKPIs = async () => {
    try {
      setLoading(true);
      console.log('Fetching from database with filters:', filter);
      
      // Try to fetch from admin_goals_overview first, if it doesn't exist, create the data manually
      let query = supabase.from('admin_goals_overview').select('*');
      
      // Apply filters
      if (filter.type !== 'all') {
        // Convert 'goals' to 'goal' and 'kpis' to 'kpi' to match your original filter values
        const typeValue = filter.type === 'goals' ? 'goal' : filter.type === 'kpis' ? 'kpi' : filter.type;
        query = query.eq('type', typeValue);
      }
      if (filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }
      if (filter.employee) {
        query = query.eq('employee_name', filter.employee);
      }
      if (filter.department) {
        query = query.eq('department', filter.department);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('admin_goals_overview not found, fetching from individual tables:', error);
        // Fallback: fetch from individual tables and create the overview data
        await fetchFromIndividualTables();
        return;
      }

      console.log('Fetched data from admin_goals_overview:', data);
      setGoalsKPIs(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching goals and KPIs:', error);
      // Fallback to individual tables
      await fetchFromIndividualTables();
    } finally {
      setLoading(false);
    }
  };

  const fetchFromIndividualTables = async () => {
    try {
      console.log('Fetching from individual goals and kpis tables...');
      
      // Fetch goals with employee data
      const goalsQuery = supabase
        .from('goals')
        .select(`
          *,
          employees!goals_employee_id_fkey(name, email, department, role)
        `);
      
      // Fetch KPIs with employee data
      const kpisQuery = supabase
        .from('kpis')
        .select(`
          *,
          employees!kpis_employee_id_fkey(name, email, department, role)
        `);

      const [goalsResult, kpisResult] = await Promise.all([
        goalsQuery,
        kpisQuery
      ]);

      if (goalsResult.error) console.error('Goals fetch error:', goalsResult.error);
      if (kpisResult.error) console.error('KPIs fetch error:', kpisResult.error);

      // Transform data to match admin_goals_overview structure
      const goals = (goalsResult.data || []).map(item => ({
        ...item,
        type: 'goal',
        employee_name: item.employees?.name || 'Unknown',
        employee_email: item.employees?.email || '',
        department: item.employees?.department || 'N/A'
      }));

      const kpis = (kpisResult.data || []).map(item => ({
        ...item,
        type: 'kpi', 
        employee_name: item.employees?.name || 'Unknown',
        employee_email: item.employees?.email || '',
        department: item.employees?.department || 'N/A'
      }));

      let combinedData = [...goals, ...kpis];
      
      // Apply filters to combined data
      if (filter.type !== 'all') {
        const typeValue = filter.type === 'goals' ? 'goal' : filter.type === 'kpis' ? 'kpi' : filter.type;
        combinedData = combinedData.filter(item => item.type === typeValue);
      }
      if (filter.status !== 'all') {
        combinedData = combinedData.filter(item => item.status === filter.status);
      }
      if (filter.employee) {
        combinedData = combinedData.filter(item => item.employee_name === filter.employee);
      }
      if (filter.department) {
        combinedData = combinedData.filter(item => item.department === filter.department);
      }

      console.log('Combined and filtered data:', combinedData);
      setGoalsKPIs(combinedData);
      calculateStats(combinedData);
    } catch (error) {
      console.error('Error fetching from individual tables:', error);
      setGoalsKPIs([]);
      calculateStats([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('name, department')
        .order('name');

      if (error) throw error;

      setEmployees(data || []);
      const uniqueDepartments = [...new Set(data?.map(e => e.department).filter(Boolean))];
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const calculateStats = (data) => {
    const goals = data.filter(item => item.type === 'goal');
    const kpis = data.filter(item => item.type === 'kpi');
    
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const totalKPIs = kpis.length;
    
    const totalItems = data.length;
    const averageProgress = totalItems > 0 
      ? data.reduce((sum, item) => {
          const progress = item.target_value > 0 
            ? (item.current_value / item.target_value) * 100 
            : 0;
          return sum + Math.min(progress, 100);
        }, 0) / totalItems
      : 0;

    setStats({
      totalGoals,
      completedGoals,
      totalKPIs,
      averageProgress: Math.round(averageProgress)
    });
  };

  const getProgressPercentage = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#3b82f6',
      completed: '#10b981',
      paused: '#f59e0b',
      cancelled: '#ef4444'
    };
    return colors[status] || colors.active;
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="goals-kpi-loading">
        <div className="loading-spinner"></div>
        <p>Loading goals and KPIs overview...</p>
      </div>
    );
  }

  return (
    <div className="goals-kpi">
      <div className="goals-header">
        <div className="header-left">
          <h1> Goals & KPI Overview</h1>
          <p>Monitor all employee goals and KPIs across the organization</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={() => fetchGoalsKPIs()}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards with Inline Styles */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {/* Total Goals Card */}
        <div style={{...cardStyle}}>
          <div 
            style={{...cardTopBorder, background: '#007bff'}}
          ></div>
          <div style={iconStyle('#007bff')}>🎯</div>
          <div style={contentStyle}>
            <h3 style={numberStyle}>{stats.totalGoals}</h3>
            <p style={labelStyle}>Total Goals</p>
          </div>
        </div>
        
        {/* Completed Goals Card */}
        <div style={{...cardStyle}}>
          <div 
            style={{...cardTopBorder, background: '#28a745'}}
          ></div>
          <div style={iconStyle('#28a745')}>✅</div>
          <div style={contentStyle}>
            <h3 style={numberStyle}>{stats.completedGoals}</h3>
            <p style={labelStyle}>Completed Goals</p>
          </div>
        </div>
        
        {/* Active KPIs Card */}
        <div style={{...cardStyle}}>
          <div 
            style={{...cardTopBorder, background: '#17a2b8'}}
          ></div>
          <div style={iconStyle('#17a2b8')}>📈</div>
          <div style={contentStyle}>
            <h3 style={numberStyle}>{stats.totalKPIs}</h3>
            <p style={labelStyle}>Active KPIs</p>
          </div>
        </div>
        
        {/* Average Progress Card */}
        <div style={{...cardStyle}}>
          <div 
            style={{...cardTopBorder, background: '#ffc107'}}
          ></div>
          <div style={iconStyle('#ffc107')}>⭐</div>
          <div style={contentStyle}>
            <h3 style={numberStyle}>{stats.averageProgress}%</h3>
            <p style={labelStyle}>Avg Progress</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="goals-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Type:</label>
            <select 
              value={filter.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">All</option>
              <option value="goals">Goals</option>
              <option value="kpis">KPIs</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filter.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Department:</label>
            <select 
              value={filter.department} 
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Employee:</label>
            <select 
              value={filter.employee} 
              onChange={(e) => handleFilterChange('employee', e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.name} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-summary">
          <span className="results-count">
            {goalsKPIs.length} items found
          </span>
        </div>
      </div>

      {/* Goals & KPIs Table */}
      <div className="goals-table-container">
        {goalsKPIs.length > 0 ? (
          <table className="goals-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Category</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {goalsKPIs.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <td>
                    <span className={`type-badge ${item.type}`}>
                      {item.type === 'goal' ? '🎯' : '📈'} {item.type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="item-title">
                      <h4>{item.title}</h4>
                      {item.description && (
                        <p className="item-description">
                          {item.description.length > 100 
                            ? `${item.description.substring(0, 100)}...`
                            : item.description
                          }
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="employee-info">
                      <strong>{item.employee_name}</strong>
                      <small className="employee-email">{item.employee_email}</small>
                    </div>
                  </td>
                  <td>{item.department || 'N/A'}</td>
                  <td>
                    <span className="category-tag">{item.category || 'General'}</span>
                  </td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar-fill"
                          style={{ 
                            width: `${getProgressPercentage(item.current_value, item.target_value)}%`,
                            backgroundColor: getStatusColor(item.status)
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {item.current_value || 0} / {item.target_value || 0} {item.unit || ''}
                        <br />
                        <small>({getProgressPercentage(item.current_value, item.target_value).toFixed(1)}%)</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{formatDateToDDMMYYYY(item.end_date)}</td>
                  <td>
                    <button
                      className="action-btn view"
                      onClick={() => openDetailModal(item)}
                      title="View Details"
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Goals or KPIs Found</h3>
            <p>No goals or KPIs match your current filters</p>
            <button 
              className="reset-filters-btn"
              onClick={() => setFilter({
                type: 'all',
                status: 'all',
                employee: '',
                department: ''
              })}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content goals-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedItem.type === 'goal' ? '🎯' : '📈'} {selectedItem.title}
              </h2>
              <button 
                className="modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h4>Basic Information</h4>
                  <div className="detail-item">
                    <label>Type:</label>
                    <span className={`type-badge ${selectedItem.type}`}>
                      {selectedItem.type === 'goal' ? '🎯 Goal' : '📈 KPI'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Category:</label>
                    <span>{selectedItem.category || 'General'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedItem.status) }}
                    >
                      {selectedItem.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Deadline:</label>
                    <span>{formatDateToDDMMYYYY(selectedItem.end_date)}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Employee Information</h4>
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedItem.employee_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedItem.employee_email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Department:</label>
                    <span>{selectedItem.department}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section full-width">
                <h4>Description</h4>
                <p className="description-text">
                  {selectedItem.description || 'No description provided'}
                </p>
              </div>

              <div className="detail-section full-width">
                <h4>Progress Details</h4>
                <div className="progress-detail">
                  <div className="progress-visual">
                    <div className="large-progress-bar">
                      <div 
                        className="large-progress-fill"
                        style={{ 
                          width: `${getProgressPercentage(selectedItem.current_value, selectedItem.target_value)}%`,
                          backgroundColor: getStatusColor(selectedItem.status)
                        }}
                      ></div>
                    </div>
                    <div className="progress-numbers">
                      <span className="current-value">
                        {selectedItem.current_value || 0} {selectedItem.unit || ''}
                      </span>
                      <span className="target-value">
                        / {selectedItem.target_value || 0} {selectedItem.unit || ''}
                      </span>
                    </div>
                  </div>
                  <div className="progress-percentage">
                    {getProgressPercentage(selectedItem.current_value, selectedItem.target_value).toFixed(1)}% Complete
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
