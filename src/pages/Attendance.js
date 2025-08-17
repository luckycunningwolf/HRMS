import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { 
  formatDateToDDMMYYYY, 
  formatDateForInput, 
  getCurrentISTDateOnly,
  formatTimeIST,
  getTimeAgoIST
} from '../utils/dateUtils';
import './Attendance.css';

export default function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(getCurrentISTDateOnly());
  const [history, setHistory] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('mark');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bulkAction, setBulkAction] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({});
  const [employeeLastUpdated, setEmployeeLastUpdated] = useState({});

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (viewMode === 'mark') {
      checkExistingAttendance();
      fetchEmployeeLastUpdated();
    } else if (viewMode === 'history') {
      fetchHistory();
    } else if (viewMode === 'analytics') {
      fetchAnalytics();
    }
  }, [selectedDate, selectedMonth, viewMode]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('employees').select('id, name');
      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAttendance = async () => {
    try {
      // Get the latest attendance record for each employee on the selected date
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, created_at')
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking existing attendance:', error);
        return;
      }

      // Get the most recent status for each employee
      const existingData = {};
      data?.forEach(record => {
        if (!existingData[record.employee_id]) {
          existingData[record.employee_id] = record.status;
        }
      });
      setAttendanceData(existingData);
    } catch (error) {
      console.error('Error checking existing attendance:', error);
    }
  };

  const fetchEmployeeLastUpdated = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching last updated:', error);
        return;
      }

      const lastUpdatedMap = {};
      data?.forEach(record => {
        if (!lastUpdatedMap[record.employee_id]) {
          lastUpdatedMap[record.employee_id] = record.created_at;
        }
      });

      setEmployeeLastUpdated(lastUpdatedMap);
    } catch (error) {
      console.error('Error fetching last updated:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const from = new Date(selectedMonth + '-01');
      const to = new Date(from);
      to.setMonth(to.getMonth() + 1);

      const { data, error } = await supabase
        .from('attendance')
        .select('id, date, status, employee_id, created_at')
        .gte('date', from.toISOString().split('T')[0])
        .lt('date', to.toISOString().split('T'));

      if (error) {
        console.error('Error fetching history:', error);
        return;
      }

      setHistory(data || []);
      generateSummaries(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const from = new Date(selectedMonth + '-01');
      const to = new Date(from);
      to.setMonth(to.getMonth() + 1);
      
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_id, status, date, created_at')
        .gte('date', from.toISOString().split('T')[0])
        .lt('date', to.toISOString().split('T'));

      if (error) {
        console.error('Error fetching analytics:', error);
        return;
      }

      generateAdvancedAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSummaries = (records) => {
    const summaryMap = {};
    records.forEach(({ employee_id, status, created_at }) => {
      if (!summaryMap[employee_id]) {
        summaryMap[employee_id] = {
          Present: 0,
          Absent: 0,
          Leave: 0,
          lastUpdated: created_at,
        };
      }

      summaryMap[employee_id][status] = (summaryMap[employee_id][status] || 0) + 1;

      if (
        !summaryMap[employee_id].lastUpdated ||
        new Date(created_at) > new Date(summaryMap[employee_id].lastUpdated)
      ) {
        summaryMap[employee_id].lastUpdated = created_at;
      }
    });

    for (const id in summaryMap) {
      summaryMap[id].lastUpdated = getTimeAgoIST(summaryMap[id].lastUpdated);
    }

    setSummaries(summaryMap);
  };

  const generateAdvancedAnalytics = (records) => {
    const analytics = {
      totalDays: new Set(records.map(r => r.date)).size,
      totalRecords: records.length,
      statusBreakdown: { Present: 0, Absent: 0, Leave: 0 },
      weeklyTrends: {},
      topPerformers: [],
      averageAttendanceRate: 0,
      mostActiveDay: '',
      leastActiveDay: ''
    };

    const employeeStats = {};
    const dailyRecords = {};

    records.forEach(({ employee_id, status, date }) => {
      analytics.statusBreakdown[status] = (analytics.statusBreakdown[status] || 0) + 1;

      if (!employeeStats[employee_id]) {
        const employee = employees.find(emp => emp.id === employee_id);
        employeeStats[employee_id] = {
          name: employee?.name || 'Unknown',
          Present: 0,
          Absent: 0,
          Leave: 0,
          total: 0
        };
      }
      employeeStats[employee_id][status] += 1;
      employeeStats[employee_id].total += 1;

      dailyRecords[date] = (dailyRecords[date] || 0) + 1;

      const weekDay = new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long',
        timeZone: 'Asia/Kolkata'
      });
      analytics.weeklyTrends[weekDay] = (analytics.weeklyTrends[weekDay] || 0) + 1;
    });

    analytics.topPerformers = Object.entries(employeeStats)
      .map(([id, stats]) => ({
        ...stats,
        id,
        attendanceRate: stats.total > 0 ? ((stats.Present / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 5);

    const rates = Object.values(employeeStats)
      .map(emp => emp.total > 0 ? (emp.Present / emp.total) * 100 : 0);
    analytics.averageAttendanceRate = rates.length > 0 
      ? (rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(1)
      : 0;

    const sortedDays = Object.entries(dailyRecords)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedDays.length > 0) {
      analytics.mostActiveDay = {
        date: formatDateToDDMMYYYY(sortedDays),
        count: sortedDays[1]
      };
      analytics.leastActiveDay = {
        date: formatDateToDDMMYYYY(sortedDays[sortedDays.length - 1]),
        count: sortedDays[sortedDays.length - 1][1]
      };
    }

    setStats(analytics);
  };

  const handleStatusChange = (employeeId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedEmployees.size === 0) return;

    const newAttendanceData = { ...attendanceData };
    selectedEmployees.forEach(employeeId => {
      newAttendanceData[employeeId] = bulkAction;
    });
    setAttendanceData(newAttendanceData);
    setSelectedEmployees(new Set());
    setBulkAction('');
  };

  const toggleEmployeeSelection = (employeeId) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const selectAllEmployees = () => {
    const filteredEmpIds = getFilteredEmployees().map(emp => emp.id);
    setSelectedEmployees(new Set(filteredEmpIds));
  };

  const clearSelection = () => {
    setSelectedEmployees(new Set());
  };

  const getFilteredEmployees = () => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterStatus === 'all') return matchesSearch;
      
      const empStatus = attendanceData[emp.id];
      if (filterStatus === 'marked') return matchesSearch && empStatus;
      if (filterStatus === 'unmarked') return matchesSearch && !empStatus;
      return matchesSearch && empStatus === filterStatus;
    });
  };

  // FIXED: Updated handleSubmit function
  const handleSubmit = async () => {
    const entries = Object.entries(attendanceData).map(([employee_id, status]) => ({
      employee_id: parseInt(employee_id), // Ensure employee_id is integer
      status,
      date: selectedDate,
      notes: 'Marked via admin portal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (entries.length === 0) {
      alert('Please mark attendance for at least one employee.');
      return;
    }

    try {
      setSubmitting(true);

      // Method 1: Simple insert (allows multiple records per day)
      const { error } = await supabase
        .from('attendance')
        .insert(entries);

      if (error) throw error;

      alert(`Attendance saved for ${entries.length} employees!`);
      setAttendanceData({});
      setSelectedEmployees(new Set());
      fetchEmployeeLastUpdated(); // Refresh last updated info
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      
      // If you want to handle duplicates manually, use this approach:
      if (error.message.includes('duplicate') || error.code === '23505') {
        try {
          // Check for existing records and update/insert accordingly
          for (const entry of entries) {
            const { data: existing } = await supabase
              .from('attendance')
              .select('id')
              .eq('employee_id', entry.employee_id)
              .eq('date', entry.date)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (existing) {
              // Update the most recent record
              await supabase
                .from('attendance')
                .update({
                  status: entry.status,
                  notes: entry.notes + ' (Updated)',
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            } else {
              // Insert new record
              await supabase
                .from('attendance')
                .insert([entry]);
            }
          }
          
          alert(`Attendance updated for ${entries.length} employees!`);
          setAttendanceData({});
          setSelectedEmployees(new Set());
          fetchEmployeeLastUpdated();
          
        } catch (updateError) {
          console.error('Error during manual upsert:', updateError);
          alert('Error saving attendance: ' + updateError.message);
        }
      } else {
        alert('Error saving attendance: ' + error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStats = () => {
    const marked = Object.values(attendanceData).filter(Boolean).length;
    const present = Object.values(attendanceData).filter(s => s === 'Present').length;
    const absent = Object.values(attendanceData).filter(s => s === 'Absent').length;
    const leave = Object.values(attendanceData).filter(s => s === 'Leave').length;
    
    return { marked, total: employees.length, present, absent, leave };
  };

  if (loading && viewMode === 'mark') {
    return (
      <div className="attendance-loading">
        <div className="loading-spinner"></div>
        <p>Loading attendance system...</p>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="attendance-header">
        <div className="header-left">
          <h1>Attendance Management</h1>
          <p>Track and manage employee attendance efficiently</p>
        </div>
        <div className="header-right">
          <div className="view-tabs">
            <button 
              className={`tab-btn ${viewMode === 'mark' ? 'active' : ''}`}
              onClick={() => setViewMode('mark')}
            >
              Mark Attendance
            </button>
            <button 
              className={`tab-btn ${viewMode === 'history' ? 'active' : ''}`}
              onClick={() => setViewMode('history')}
            >
              History
            </button>
            <button 
              className={`tab-btn ${viewMode === 'analytics' ? 'active' : ''}`}
              onClick={() => setViewMode('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Mark Attendance View */}
      {viewMode === 'mark' && (
        <div className="mark-attendance-section">
          {/* Controls */}
          <div className="attendance-controls">
            <div className="date-control">
              <label>
                <span className="label-icon">📅</span>
                Select Date:
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="date-input"
                />
              </label>
            </div>

            <div className="search-filter-controls">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Employees</option>
                <option value="marked">Marked</option>
                <option value="unmarked">Unmarked</option>
                <option value="Present">Present Only</option>
                <option value="Absent">Absent Only</option>
                <option value="Leave">On Leave Only</option>
              </select>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-card total">
              <span className="stat-icon">👥</span>
              <div className="stat-content">
                <span className="stat-number">{getFilteredEmployees().length}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
            <div className="stat-card marked">
              <span className="stat-icon">✅</span>
              <div className="stat-content">
                <span className="stat-number">{getStatusStats().marked}</span>
                <span className="stat-label">Marked</span>
              </div>
            </div>
            <div className="stat-card present">
              <span className="stat-icon">🟢</span>
              <div className="stat-content">
                <span className="stat-number">{getStatusStats().present}</span>
                <span className="stat-label">Present</span>
              </div>
            </div>
            <div className="stat-card absent">
              <span className="stat-icon">🔴</span>
              <div className="stat-content">
                <span className="stat-number">{getStatusStats().absent}</span>
                <span className="stat-label">Absent</span>
              </div>
            </div>
            <div className="stat-card leave">
              <span className="stat-icon">🏖️</span>
              <div className="stat-content">
                <span className="stat-number">{getStatusStats().leave}</span>
                <span className="stat-label">Leave</span>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="bulk-actions">
            <div className="bulk-selection">
              <button onClick={selectAllEmployees} className="bulk-btn">
                Select All ({getFilteredEmployees().length})
              </button>
              <button onClick={clearSelection} className="bulk-btn">
                Clear ({selectedEmployees.size})
              </button>
            </div>
            
            {selectedEmployees.size > 0 && (
              <div className="bulk-operations">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="bulk-select"
                >
                  <option value="">Bulk Action</option>
                  <option value="Present">Mark as Present</option>
                  <option value="Absent">Mark as Absent</option>
                  <option value="Leave">Mark as Leave</option>
                </select>
                <button 
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="apply-bulk-btn"
                >
                  Apply to {selectedEmployees.size} employees
                </button>
              </div>
            )}
          </div>

          {/* Employee List */}
          {getFilteredEmployees().length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No employees found</h3>
              <p>
                {employees.length === 0 
                  ? "No employees in the database. Please add employees first." 
                  : "No employees match your current search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="employees-grid">
              {getFilteredEmployees().map((emp) => (
                <div 
                  key={emp.id} 
                  className={`employee-attendance-card ${selectedEmployees.has(emp.id) ? 'selected' : ''}`}
                >
                  <div className="employee-header">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.has(emp.id)}
                      onChange={() => toggleEmployeeSelection(emp.id)}
                      className="employee-checkbox"
                    />
                    <div className="employee-info">
                      <h3 className="employee-name">{emp.name}</h3>
                      <p className="employee-department">ID: {emp.id}</p>
                    </div>
                    <div className={`status-indicator ${attendanceData[emp.id]?.toLowerCase() || 'unmarked'}`}>
                      {attendanceData[emp.id] ? 
                        (attendanceData[emp.id] === 'Present' ? '✅' : 
                         attendanceData[emp.id] === 'Absent' ? '❌' : '🏖️') 
                        : '⏳'}
                    </div>
                  </div>
                  
                  <div className="attendance-buttons">
                    <button
                      className={`attendance-btn present ${attendanceData[emp.id] === 'Present' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(emp.id, 'Present')}
                    >
                      ✅ Present
                    </button>
                    <button
                      className={`attendance-btn absent ${attendanceData[emp.id] === 'Absent' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(emp.id, 'Absent')}
                    >
                      ❌ Absent
                    </button>
                    <button
                      className={`attendance-btn leave ${attendanceData[emp.id] === 'Leave' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(emp.id, 'Leave')}
                    >
                      🏖️ Leave
                    </button>
                  </div>

                  <div className="last-updated-info">
                    <span>Last updated: {
                      employeeLastUpdated[emp.id] 
                        ? getTimeAgoIST(employeeLastUpdated[emp.id])
                        : 'Never'
                    }</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <div className="submit-section">
            <button 
              className="submit-attendance-btn"
              onClick={handleSubmit}
              disabled={submitting || Object.keys(attendanceData).length === 0}
            >
              {submitting ? (
                <>
                  <span className="loading-spinner-small"></span>
                  Saving Attendance...
                </>
              ) : (
                <>
                  💾 Save Attendance ({getStatusStats().marked} employees)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* History View */}
      {viewMode === 'history' && (
        <div className="history-section">
          <div className="history-controls">
            <label className="month-selector">
              <span className="label-icon">📅</span>
              Select Month:
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="month-input"
              />
            </label>
          </div>

          <div className="history-grid">
            {Object.entries(summaries).map(([employeeId, summary]) => {
              const employee = employees.find(emp => emp.id.toString() === employeeId);
              return (
                <div key={employeeId} className="history-card">
                  <div className="history-header">
                    <h3>{employee?.name || 'Unknown Employee'}</h3>
                    <span className="department-tag">ID: {employeeId}</span>
                  </div>
                  <div className="history-stats">
                    <div className="stat-row">
                      <span className="stat-item present">✅ {summary.Present}</span>
                      <span className="stat-item absent">❌ {summary.Absent}</span>
                      <span className="stat-item leave">🏖️ {summary.Leave}</span>
                    </div>
                    <div className="attendance-rate">
                      <span>Attendance: {((summary.Present / (summary.Present + summary.Absent + summary.Leave)) * 100).toFixed(1)}%</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${((summary.Present / (summary.Present + summary.Absent + summary.Leave)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="last-updated">
                      Last updated: {summary.lastUpdated}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Analytics View */}
      {viewMode === 'analytics' && (
        <div className="analytics-section">
          <div className="analytics-controls">
            <label className="month-selector">
              <span className="label-icon">📊</span>
              Analytics for:
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="month-input"
              />
            </label>
          </div>

          <div className="analytics-grid">
            {/* Overview Card */}
            <div className="analytics-card overview">
              <h3>📈 Overview</h3>
              <div className="overview-stats">
                <div className="overview-item">
                  <span className="overview-number">{stats.totalDays || 0}</span>
                  <span className="overview-label">Days Tracked</span>
                </div>
                <div className="overview-item">
                  <span className="overview-number">{stats.totalRecords || 0}</span>
                  <span className="overview-label">Total Records</span>
                </div>
                <div className="overview-item">
                  <span className="overview-number">{stats.averageAttendanceRate}%</span>
                  <span className="overview-label">Avg Attendance</span>
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="analytics-card status-breakdown">
              <h3>📊 Status Breakdown</h3>
              <div className="status-stats">
                <div className="status-item present">
                  <span className="status-icon">✅</span>
                  <span className="status-count">{stats.statusBreakdown?.Present || 0}</span>
                  <span className="status-label">Present</span>
                </div>
                <div className="status-item absent">
                  <span className="status-icon">❌</span>
                  <span className="status-count">{stats.statusBreakdown?.Absent || 0}</span>
                  <span className="status-label">Absent</span>
                </div>
                <div className="status-item leave">
                  <span className="status-icon">🏖️</span>
                  <span className="status-count">{stats.statusBreakdown?.Leave || 0}</span>
                  <span className="status-label">Leave</span>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="analytics-card top-performers">
              <h3>🏆 Top Performers</h3>
              <div className="performers-list">
                {stats.topPerformers?.slice(0, 5).map((performer, index) => (
                  <div key={performer.id} className="performer-item">
                    <span className="rank">#{index + 1}</span>
                    <div className="performer-info">
                      <span className="name">{performer.name}</span>
                    </div>
                    <span className="rate">{performer.attendanceRate.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Insights */}
            <div className="analytics-card activity-insights">
              <h3>📅 Activity Insights</h3>
              <div className="insights-grid">
                <div className="insight-item">
                  <span className="insight-label">Most Active Day</span>
                  <span className="insight-value">
                    {stats.mostActiveDay?.date || 'N/A'}
                    <small>({stats.mostActiveDay?.count || 0} records)</small>
                  </span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">Least Active Day</span>
                  <span className="insight-value">
                    {stats.leastActiveDay?.date || 'N/A'}
                    <small>({stats.leastActiveDay?.count || 0} records)</small>
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Trends */}
            <div className="analytics-card weekly-trends">
              <h3>📈 Weekly Trends</h3>
              <div className="trends-list">
                {Object.entries(stats.weeklyTrends || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([day, count]) => (
                    <div key={day} className="trend-item">
                      <span className="day">{day}</span>
                      <div className="trend-bar">
                        <div 
                          className="trend-fill"
                          style={{ 
                            width: `${(count / Math.max(...Object.values(stats.weeklyTrends || {}))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
