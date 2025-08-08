import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import './Reports.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function Reports() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllData();
  }, [selectedMonth]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchAttendance(),
        fetchLeaveRequests()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*');
    if (!error) setEmployees(data);
  };

  const fetchAttendance = async () => {
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(selectedMonth + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const { data, error } = await supabase
      .from('attendance')
      .select('*, employees(name)')
      .gte('date', startDate)
      .lte('date', endDate.toISOString().split('T')[0]);
    
    if (!error) setAttendance(data);
  };

  const fetchLeaveRequests = async () => {
    const startDate = `${selectedMonth}-01`;
    const endDate = new Date(selectedMonth + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);

    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, employees(name)')
      .gte('start_date', startDate)
      .lte('end_date', endDate.toISOString().split('T')[0]);
    
    if (!error) setLeaveRequests(data);
  };

  // Calculate statistics
  const calculateStats = () => {
    const totalEmployees = employees.length;
    const totalAttendanceRecords = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'Present').length;
    const absentCount = attendance.filter(a => a.status === 'Absent').length;
    const leaveCount = attendance.filter(a => a.status === 'Leave').length;
    
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
    const approvedLeaves = leaveRequests.filter(l => l.status === 'approved').length;
    const rejectedLeaves = leaveRequests.filter(l => l.status === 'rejected').length;

    const attendanceRate = totalAttendanceRecords > 0 ? 
      ((presentCount / totalAttendanceRecords) * 100).toFixed(1) : 0;

    return {
      totalEmployees,
      totalAttendanceRecords,
      presentCount,
      absentCount,
      leaveCount,
      attendanceRate,
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      totalLeaveRequests: leaveRequests.length
    };
  };

  const stats = calculateStats();

  // Chart data for attendance
  const attendanceChartData = {
    labels: ['Present', 'Absent', 'On Leave'],
    datasets: [
      {
        label: 'Attendance Status',
        data: [stats.presentCount, stats.absentCount, stats.leaveCount],
        backgroundColor: [
          '#28a745',
          '#dc3545',
          '#ffc107'
        ],
        borderColor: [
          '#28a745',
          '#dc3545',
          '#ffc107'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for leave requests
  const leaveRequestsChartData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [
      {
        label: 'Leave Requests',
        data: [stats.pendingLeaves, stats.approvedLeaves, stats.rejectedLeaves],
        backgroundColor: [
          '#ffc107',
          '#28a745',
          '#dc3545'
        ],
        borderColor: [
          '#ffc107',
          '#28a745',
          '#dc3545'
        ],
        borderWidth: 1,
      },
    ],
  };

  // Employee-wise attendance data
  const getEmployeeAttendanceData = () => {
    const employeeData = employees.map(emp => {
      const empAttendance = attendance.filter(a => a.employee_id === emp.id);
      const present = empAttendance.filter(a => a.status === 'Present').length;
      const absent = empAttendance.filter(a => a.status === 'Absent').length;
      const leave = empAttendance.filter(a => a.status === 'Leave').length;
      const total = present + absent + leave;
      const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

      return {
        name: emp.name,
        present,
        absent,
        leave,
        total,
        rate: parseFloat(rate)
      };
    });

    return {
      labels: employeeData.map(e => e.name),
      datasets: [
        {
          label: 'Attendance Rate (%)',
          data: employeeData.map(e => e.rate),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const employeeAttendanceData = getEmployeeAttendanceData();

  // Export to CSV function
  const exportToCSV = (data, filename) => {
    const csvContent = data.map(row => Object.values(row).join(',')).join('\n');
    const header = Object.keys(data[0]).join(',') + '\n';
    const csv = header + csvContent;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAttendanceReport = () => {
    const reportData = employees.map(emp => {
      const empAttendance = attendance.filter(a => a.employee_id === emp.id);
      const present = empAttendance.filter(a => a.status === 'Present').length;
      const absent = empAttendance.filter(a => a.status === 'Absent').length;
      const leave = empAttendance.filter(a => a.status === 'Leave').length;
      const total = present + absent + leave;
      const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

      return {
        'Employee Name': emp.name,
        'Employee Email': emp.email,
        'Total Days': total,
        'Present Days': present,
        'Absent Days': absent,
        'Leave Days': leave,
        'Attendance Rate (%)': rate
      };
    });

    exportToCSV(reportData, `attendance-report-${selectedMonth}.csv`);
  };

  const exportLeaveReport = () => {
    const reportData = leaveRequests.map(leave => ({
      'Employee Name': leave.employees?.name || 'Unknown',
      'Leave Type': leave.leave_type,
      'Start Date': leave.start_date,
      'End Date': leave.end_date,
      'Status': leave.status,
      'Reason': leave.reason,
      'Applied Date': new Date(leave.created_at).toLocaleDateString()
    }));

    exportToCSV(reportData, `leave-report-${selectedMonth}.csv`);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Report Analytics',
      },
    },
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Reports</h1>
        <p>Loading reports data...</p>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <h1>📊 Reports & Analytics</h1>
        <div className="reports-controls">
          <label>
            Select Month:
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                marginLeft: '10px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </label>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === 'overview' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={activeTab === 'attendance' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('attendance')}
        >
          👥 Attendance
        </button>
        <button
          className={activeTab === 'leaves' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('leaves')}
        >
          🏖️ Leaves
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-details">
                <h3>{stats.totalEmployees}</h3>
                <p>Total Employees</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-details">
                <h3>{stats.attendanceRate}%</h3>
                <p>Attendance Rate</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-details">
                <h3>{stats.totalLeaveRequests}</h3>
                <p>Leave Requests</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-details">
                <h3>{stats.pendingLeaves}</h3>
                <p>Pending Approvals</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Attendance Distribution</h3>
              <div className="chart-container">
                <Pie data={attendanceChartData} options={chartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h3>Leave Requests Status</h3>
              <div className="chart-container">
                <Bar data={leaveRequestsChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Attendance Analytics</h2>
            <button onClick={exportAttendanceReport} className="export-btn">
              📥 Export CSV
            </button>
          </div>

          <div className="chart-card full-width">
            <h3>Employee Attendance Rates</h3>
            <div className="chart-container">
              <Bar data={employeeAttendanceData} options={chartOptions} />
            </div>
          </div>

          <div className="table-container">
            <h3>Detailed Attendance Report</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Leave</th>
                  <th>Total</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const empAttendance = attendance.filter(a => a.employee_id === emp.id);
                  const present = empAttendance.filter(a => a.status === 'Present').length;
                  const absent = empAttendance.filter(a => a.status === 'Absent').length;
                  const leave = empAttendance.filter(a => a.status === 'Leave').length;
                  const total = present + absent + leave;
                  const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

                  return (
                    <tr key={emp.id}>
                      <td>{emp.name}</td>
                      <td className="present">{present}</td>
                      <td className="absent">{absent}</td>
                      <td className="leave">{leave}</td>
                      <td>{total}</td>
                      <td>
                        <span className={`rate-badge ${rate >= 80 ? 'good' : rate >= 60 ? 'average' : 'poor'}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leaves Tab */}
      {activeTab === 'leaves' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Leave Management Reports</h2>
            <button onClick={exportLeaveReport} className="export-btn">
              📥 Export CSV
            </button>
          </div>

          <div className="stats-row">
            <div className="mini-stat">
              <span className="mini-stat-value">{stats.pendingLeaves}</span>
              <span className="mini-stat-label">Pending</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value">{stats.approvedLeaves}</span>
              <span className="mini-stat-label">Approved</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value">{stats.rejectedLeaves}</span>
              <span className="mini-stat-label">Rejected</span>
            </div>
          </div>

          <div className="table-container">
            <h3>Leave Requests Details</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(leave => {
                  const startDate = new Date(leave.start_date);
                  const endDate = new Date(leave.end_date);
                  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                  return (
                    <tr key={leave.id}>
                      <td>{leave.employees?.name || 'Unknown'}</td>
                      <td>
                        <span className="leave-type-badge">
                          {leave.leave_type}
                        </span>
                      </td>
                      <td>{new Date(leave.start_date).toLocaleDateString()}</td>
                      <td>{new Date(leave.end_date).toLocaleDateString()}</td>
                      <td>{days}</td>
                      <td>
                        <span className={`status-badge ${leave.status}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td>{new Date(leave.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
