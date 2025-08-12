import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { 
  formatDateToDDMMYYYY, 
  formatTimeIST, 
  getCurrentISTTime, 
  getCurrentISTDateDisplay, 
  getTimeAgoIST,
  formatDateTimeIST
} from '../utils/dateUtils';
import './Dashboard.css';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    employees: [],
    attendance: [],
    leaves: [],
    performance: [],
    quickStats: {},
    recentActivities: [],
    pendingApprovals: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [currentTime, setCurrentTime] = useState(getCurrentISTTime());
  const [currentDate, setCurrentDate] = useState(getCurrentISTDateDisplay());

  useEffect(() => {
    fetchDashboardData();
    
    // Update time every second for continuous flow - FIXED ISSUE 1
    const timeInterval = setInterval(() => {
      setCurrentTime(getCurrentISTTime());
      setCurrentDate(getCurrentISTDateDisplay());
    }, 1000); // Changed from 60000 to 1000 for real-time updates

    return () => clearInterval(timeInterval);
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [
        employeesData,
        attendanceData,
        leavesData,
        performanceData
      ] = await Promise.all([
        supabase.from('employees').select('*').eq('is_active', true),
        supabase.from('attendance').select('*').gte('date', getPeriodStart()),
        supabase.from('leave_requests').select('*, employees(name)').gte('start_date', getPeriodStart()),
        supabase.from('performance_reviews').select('*').gte('created_at', getPeriodStart())
      ]);

      const processedData = {
        employees: employeesData.data || [],
        attendance: attendanceData.data || [],
        leaves: leavesData.data || [],
        performance: performanceData.data || [],
        quickStats: calculateQuickStats(employeesData.data, attendanceData.data, leavesData.data),
        recentActivities: generateRecentActivities(attendanceData.data, leavesData.data),
        pendingApprovals: getPendingApprovals(leavesData.data),
        alerts: generateAlerts(employeesData.data, attendanceData.data, leavesData.data)
      };

      setDashboardData(processedData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodStart = () => {
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    switch (selectedPeriod) {
      case 'today':
        return istNow.toISOString().split('T')[0];
      case 'thisWeek':
        const weekStart = new Date(istNow.setDate(istNow.getDate() - istNow.getDay()));
        return weekStart.toISOString().split('T')[0];
      case 'thisMonth':
        return new Date(istNow.getFullYear(), istNow.getMonth(), 1).toISOString().split('T')[0];
      case 'thisYear':
        return new Date(istNow.getFullYear(), 0, 1).toISOString().split('T')[0];
      default:
        return new Date(istNow.getFullYear(), istNow.getMonth(), 1).toISOString().split('T')[0];
    }
  };

  const calculateQuickStats = (employees, attendance, leaves) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const thisMonth = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric' }) - 1;
    
    return {
      totalEmployees: employees?.length || 0,
      activeEmployees: employees?.filter(emp => emp.is_active)?.length || 0,
      todayPresent: attendance?.filter(att => att.date === today && att.status === 'Present')?.length || 0,
      todayAbsent: attendance?.filter(att => att.date === today && att.status === 'Absent')?.length || 0,
      monthlyAttendanceRate: calculateAttendanceRate(attendance),
      pendingLeaves: leaves?.filter(leave => leave.status === 'pending')?.length || 0,
      onLeaveToday: leaves?.filter(leave => isOnLeaveToday(leave))?.length || 0,
      newHiresThisMonth: employees?.filter(emp => {
        const empJoinMonth = new Date(emp.joining_date).toLocaleDateString('en-US', { 
          timeZone: 'Asia/Kolkata', 
          month: 'numeric' 
        }) - 1;
        return empJoinMonth === thisMonth;
      })?.length || 0
    };
  };

  const calculateAttendanceRate = (attendance) => {
    if (!attendance || attendance.length === 0) return 0;
    const present = attendance.filter(att => att.status === 'Present').length;
    return ((present / attendance.length) * 100).toFixed(1);
  };

  const isOnLeaveToday = (leave) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return leave.status === 'approved' && 
           leave.start_date <= today && 
           leave.end_date >= today;
  };

  // FIXED ISSUE 7 - Improved recent activities generation
  const generateRecentActivities = (attendance, leaves) => {
    const activities = [];
    
    // Recent attendance entries with better messages
    attendance?.slice(-5).forEach(att => {
      const employeeName = getEmployeeName(att.employee_id);
      activities.push({
        type: 'attendance',
        message: `${employeeName} marked ${att.status.toLowerCase()}`,
        time: att.created_at || att.date,
        icon: att.status === 'Present' ? '✅' : att.status === 'Absent' ? '❌' : '🏖️',
        priority: 'normal'
      });
    });

    // Recent leave requests with better messages
    leaves?.slice(-5).forEach(leave => {
      activities.push({
        type: 'leave',
        message: `${leave.employees?.name || 'Employee'} requested ${leave.leave_type || 'leave'}`,
        time: leave.created_at,
        icon: '🏖️',
        priority: leave.status === 'pending' ? 'high' : 'normal'
      });
    });

    return activities
      .filter(activity => activity.time) // Filter out activities without time
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 8);
  };

  // Helper function to get employee name by ID
  const getEmployeeName = (employeeId) => {
    const employee = dashboardData.employees.find(emp => emp.id === employeeId);
    return employee?.name || 'Employee';
  };

  const getPendingApprovals = (leaves) => {
    return leaves?.filter(leave => leave.status === 'pending')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) || [];
  };

  const generateAlerts = (employees, attendance, leaves) => {
    const alerts = [];
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Attendance alerts
    const todayAttendance = attendance?.filter(att => att.date === today) || [];
    const expectedAttendance = employees?.filter(emp => emp.is_active)?.length || 0;
    
    if (todayAttendance.length < expectedAttendance) {
      alerts.push({
        type: 'warning',
        title: 'Missing Attendance Records',
        message: `${expectedAttendance - todayAttendance.length} employees haven't marked attendance today`,
        action: 'View Attendance',
        priority: 'high'
      });
    }

    // Leave alerts
    const pendingLeaves = leaves?.filter(leave => leave.status === 'pending')?.length || 0;
    if (pendingLeaves > 0) {
      alerts.push({
        type: 'info',
        title: 'Pending Leave Approvals',
        message: `${pendingLeaves} leave requests need your approval`,
        action: 'Review Leaves',
        priority: 'medium'
      });
    }

    // Performance review alerts
    const thisMonthReviews = employees?.filter(emp => {
      const joinDate = new Date(emp.joining_date);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + 
                        (now.getMonth() - joinDate.getMonth());
      return monthsDiff > 0 && monthsDiff % 6 === 0;
    })?.length || 0;

    if (thisMonthReviews > 0) {
      alerts.push({
        type: 'info',
        title: 'Performance Reviews Due',
        message: `${thisMonthReviews} employees are due for performance review`,
        action: 'Schedule Reviews',
        priority: 'medium'
      });
    }

    return alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  // FIXED ISSUE 4 - Enhanced quick action handler
  const handleQuickAction = (action) => {
    switch (action) {
      case 'addEmployee':
        window.location.href = '/recruitment';
        break;
      case 'markAttendance':
        window.location.href = '/attendance';
        break;
      case 'viewEmployees':
        window.location.href = '/employees';
        break;
      case 'reviewLeaves':
        window.location.href = '/leaves';
        break;
      case 'viewAttendance': // Added this case
        window.location.href = '/attendance';
        break;
      case 'scheduleReviews': // Added this case
        window.location.href = '/performance';
        break;
      case 'viewPerformance': // FIXED ISSUE 6 - Added performance navigation
        window.location.href = '/performance';
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // FIXED ISSUE 4 - Enhanced alert action handler
  const handleAlertAction = (action) => {
    switch (action) {
      case 'View Attendance':
        handleQuickAction('viewAttendance');
        break;
      case 'Review Leaves':
        handleQuickAction('reviewLeaves');
        break;
      case 'Schedule Reviews':
        handleQuickAction('scheduleReviews');
        break;
      default:
        console.log('Unknown alert action:', action);
    }
  };

  const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header Section - FIXED ISSUE 3 - Made title more centered and sleek */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="dashboard-title">Human Resource Dashboard</h1>
            <p className="dashboard-subtitle">Welcome back! Here's your organization overview for {formatDateToDDMMYYYY(new Date())}</p>
          </div>
          <div className="header-controls">
            <div className="current-time">
              <span className="time">{currentTime}</span>
              <span className="date">{currentDate}</span>
            </div>
            {/* FIXED ISSUE 2 - Made period selector more modern */}
            <div className="period-selector-container">
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="period-selector modern"
              >
                <option value="today">📅 Today</option>
                <option value="thisWeek">📊 This Week</option>
                <option value="thisMonth">📈 This Month</option>
                <option value="thisYear">🗓️ This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <button 
          className="quick-action-btn primary"
          onClick={() => handleQuickAction('addEmployee')}
        >
          <span className="btn-icon">👤</span>
          <span className="btn-text">Add Employee</span>
        </button>
        <button 
          className="quick-action-btn secondary"
          onClick={() => handleQuickAction('markAttendance')}
        >
          <span className="btn-icon">📅</span>
          <span className="btn-text">Mark Attendance</span>
        </button>
        <button 
          className="quick-action-btn tertiary"
          onClick={() => handleQuickAction('viewEmployees')}
        >
          <span className="btn-icon">📋</span>
          <span className="btn-text">Employee Directory</span>
        </button>
        <button 
          className="quick-action-btn warning"
          onClick={() => handleQuickAction('reviewLeaves')}
        >
          <span className="btn-icon">⏳</span>
          <span className="btn-text">Review Leaves</span>
          {dashboardData.quickStats.pendingLeaves > 0 && (
            <span className="notification-badge">{dashboardData.quickStats.pendingLeaves}</span>
          )}
        </button>
      </div>

      {/* Alerts Section - FIXED ISSUE 4 - Made alert buttons functional */}
      {dashboardData.alerts.length > 0 && (
        <div className="alerts-section">
          {dashboardData.alerts.slice(0, 3).map((alert, index) => (
            <div key={index} className={`alert alert-${alert.type} priority-${alert.priority}`}>
              <div className="alert-content">
                <h4>{alert.title}</h4>
                <p>{alert.message}</p>
              </div>
              <button 
                className="alert-action"
                onClick={() => handleAlertAction(alert.action)}
              >
                {alert.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-header">
            <div className="metric-icon">👥</div>
            <div className="metric-title">Total Employees</div>
          </div>
          <div className="metric-content">
            <h3>{dashboardData.quickStats.totalEmployees}</h3>
            <div className="metric-subtitle">
              <span className="active-count">{dashboardData.quickStats.activeEmployees} Active</span>
              <span className="new-hires">+{dashboardData.quickStats.newHiresThisMonth} this month</span>
            </div>
          </div>
          <div className="metric-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${dashboardData.quickStats.totalEmployees > 0 ? (dashboardData.quickStats.activeEmployees / dashboardData.quickStats.totalEmployees) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <div className="metric-icon">✅</div>
            <div className="metric-title">Present Today</div>
          </div>
          <div className="metric-content">
            <h3>{dashboardData.quickStats.todayPresent}</h3>
            <div className="metric-subtitle">
              <span className="rate">{dashboardData.quickStats.monthlyAttendanceRate}% monthly rate</span>
            </div>
          </div>
          <div className="metric-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill success" 
                style={{ width: `${dashboardData.quickStats.monthlyAttendanceRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-header">
            <div className="metric-icon">🏖️</div>
            <div className="metric-title">On Leave</div>
          </div>
          <div className="metric-content">
            <h3>{dashboardData.quickStats.onLeaveToday}</h3>
            <div className="metric-subtitle">
              <span className="pending">{dashboardData.quickStats.pendingLeaves} pending approvals</span>
            </div>
          </div>
          {/* FIXED ISSUE 5 - Centered the review button */}
          <div className="metric-action centered">
            <button 
              className="action-btn"
              onClick={() => handleQuickAction('reviewLeaves')}
            >
              Review
            </button>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-header">
            <div className="metric-icon">📈</div>
            <div className="metric-title">Performance Reviews</div>
          </div>
          <div className="metric-content">
            <h3>{dashboardData.performance.length}</h3>
            <div className="metric-subtitle">
              <span>This {selectedPeriod.replace('this', '').toLowerCase()}</span>
            </div>
          </div>
          {/* FIXED ISSUE 6 - Made View Details functional */}
          <div className="metric-trend clickable" onClick={() => handleQuickAction('viewPerformance')}>
            <span className="trend-icon">📊</span>
            <span className="trend-text">View Details</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Left Column */}
        <div className="content-left">
          {/* Pending Approvals Widget */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h3>⏳ Pending Approvals</h3>
              <span className="widget-badge">{dashboardData.pendingApprovals.length}</span>
            </div>
            <div className="widget-content">
              {dashboardData.pendingApprovals.length > 0 ? (
                <div className="approvals-list">
                  {dashboardData.pendingApprovals.slice(0, 4).map(leave => (
                    <div key={leave.id} className="approval-item">
                      <div className="approval-avatar">
                        {leave.employees?.name?.charAt(0) || '?'}
                      </div>
                      <div className="approval-info">
                        <strong>{leave.employees?.name || 'Unknown Employee'}</strong>
                        <p>{leave.leave_type || 'Leave'} for {calculateLeaveDays(leave.start_date, leave.end_date)} days</p>
                        <small className="approval-date">
                          {formatDateToDDMMYYYY(leave.start_date)} - {formatDateToDDMMYYYY(leave.end_date)}
                        </small>
                      </div>
                      <div className="approval-actions">
                        <button className="approve-btn" title="Approve">✓</button>
                        <button className="reject-btn" title="Reject">✗</button>
                      </div>
                    </div>
                  ))}
                  {dashboardData.pendingApprovals.length > 4 && (
                    <div className="view-all-approvals">
                      <button 
                        className="view-all-btn"
                        onClick={() => handleQuickAction('reviewLeaves')}
                      >
                        View All {dashboardData.pendingApprovals.length} Approvals
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <p>All caught up!</p>
                  <small>No pending approvals</small>
                </div>
              )}
            </div>
          </div>

          {/* Today's Attendance Overview */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h3>📊 Today's Attendance</h3>
              <button 
                className="widget-action"
                onClick={() => handleQuickAction('markAttendance')}
              >
                Mark Attendance
              </button>
            </div>
            <div className="widget-content">
              <div className="attendance-summary">
                <div className="attendance-item present">
                  <div className="attendance-icon">✅</div>
                  <div className="attendance-details">
                    <span className="count">{dashboardData.quickStats.todayPresent}</span>
                    <span className="label">Present</span>
                  </div>
                </div>
                <div className="attendance-item absent">
                  <div className="attendance-icon">❌</div>
                  <div className="attendance-details">
                    <span className="count">{dashboardData.quickStats.todayAbsent}</span>
                    <span className="label">Absent</span>
                  </div>
                </div>
                <div className="attendance-item leave">
                  <div className="attendance-icon">🏖️</div>
                  <div className="attendance-details">
                    <span className="count">{dashboardData.quickStats.onLeaveToday}</span>
                    <span className="label">On Leave</span>
                  </div>
                </div>
              </div>
              
              <div className="attendance-progress">
                <div className="progress-label">
                  <span>Attendance Rate</span>
                  <span>{dashboardData.quickStats.monthlyAttendanceRate}%</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${dashboardData.quickStats.monthlyAttendanceRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="content-right">
          {/* Recent Activities - FIXED ISSUE 7 */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h3>🕒 Recent Activities</h3>
              <span className="widget-subtitle">Last 24 hours</span>
            </div>
            <div className="widget-content">
              <div className="activity-list">
                {dashboardData.recentActivities.length > 0 ? (
                  dashboardData.recentActivities.map((activity, index) => (
                    <div key={index} className={`activity-item priority-${activity.priority}`}>
                      <div className="activity-icon">{activity.icon}</div>
                      <div className="activity-content">
                        <p>{activity.message}</p>
                        <small className="activity-time">{getTimeAgoIST(activity.time)}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <p>No recent activities</p>
                    <small>Activities will appear here once you start using the system</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h3>📈 Quick Stats</h3>
              <span className="widget-subtitle">This {selectedPeriod.replace('this', '').toLowerCase()}</span>
            </div>
            <div className="widget-content">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <span className="stat-value">{dashboardData.quickStats.monthlyAttendanceRate}%</span>
                    <span className="stat-label">Attendance Rate</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">🏖️</div>
                  <div className="stat-content">
                    <span className="stat-value">{dashboardData.leaves.length}</span>
                    <span className="stat-label">Leave Requests</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-content">
                    <span className="stat-value">{dashboardData.performance.length}</span>
                    <span className="stat-label">Reviews Done</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">🆕</div>
                  <div className="stat-content">
                    <span className="stat-value">{dashboardData.quickStats.newHiresThisMonth}</span>
                    <span className="stat-label">New Hires</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
