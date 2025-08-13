import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
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

  // FIXED: Generate PDF for individual employee
  const generateEmployeePDF = (employee) => {
    const doc = new jsPDF();
    const empAttendance = attendance.filter(a => a.employee_id === employee.id);
    const present = empAttendance.filter(a => a.status === 'Present').length;
    const absent = empAttendance.filter(a => a.status === 'Absent').length;
    const leave = empAttendance.filter(a => a.status === 'Leave').length;
    const total = present + absent + leave;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    // Header
    doc.setFillColor(129, 212, 250);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Report', 15, 20);

    // Employee Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', 15, 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Name: ${employee.name}`, 15, 55);
    doc.text(`Email: ${employee.email || 'N/A'}`, 15, 65);
    doc.text(`Employee ID: ${employee.employee_id || employee.id}`, 15, 75);
    doc.text(`Department: ${employee.department || 'N/A'}`, 15, 85);
    doc.text(`Report Period: ${selectedMonth}`, 15, 95);

    // Summary Stats
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Attendance Summary', 15, 115);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Total Working Days: ${total}`, 15, 125);
    doc.text(`Present Days: ${present}`, 15, 135);
    doc.text(`Absent Days: ${absent}`, 15, 145);
    doc.text(`Leave Days: ${leave}`, 15, 155);
    doc.text(`Attendance Rate: ${rate}%`, 15, 165);

    // Detailed Attendance Table
    const attendanceDetails = empAttendance.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.status,
      record.status === 'Present' ? '✓' : record.status === 'Absent' ? '✗' : '🏖️'
    ]);

    // FIXED: Use autoTable as a function, not a method
    autoTable(doc, {
      head: [['Date', 'Status', 'Mark']],
      body: attendanceDetails,
      startY: 180,
      theme: 'grid',
      headStyles: {
        fillColor: [129, 212, 250],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [240, 249, 255]
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 15, pageHeight - 10);
    doc.text('HR Management System', 150, pageHeight - 10);

    // Save PDF
    doc.save(`${employee.name.replace(/\s+/g, '_')}_Attendance_Report_${selectedMonth}.pdf`);
  };

  // Chart data for attendance
  const attendanceChartData = {
    labels: ['Present', 'Absent', 'On Leave'],
    datasets: [
      {
        label: 'Attendance Status',
        data: [stats.presentCount, stats.absentCount, stats.leaveCount],
        backgroundColor: [
          'rgba(165, 214, 167, 0.8)',
          'rgba(239, 154, 154, 0.8)',
          'rgba(255, 204, 128, 0.8)'
        ],
        borderColor: [
          '#a5d6a7',
          '#ef9a9a',
          '#ffcc80'
        ],
        borderWidth: 2,
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
          'rgba(255, 204, 128, 0.8)',
          'rgba(165, 214, 167, 0.8)',
          'rgba(239, 154, 154, 0.8)'
        ],
        borderColor: [
          '#ffcc80',
          '#a5d6a7',
          '#ef9a9a'
        ],
        borderWidth: 2,
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
      labels: employeeData.map(e => e.name.length > 10 ? e.name.substring(0, 10) + '...' : e.name),
      datasets: [
        {
          label: 'Attendance Rate (%)',
          data: employeeData.map(e => e.rate),
          backgroundColor: 'rgba(129, 212, 250, 0.6)',
          borderColor: '#81d4fa',
          borderWidth: 2,
        },
      ],
    };
  };

  const employeeAttendanceData = getEmployeeAttendanceData();

  const exportToPDF = (columns, data, filename) => {
    const doc = new jsPDF();
    autoTable(doc, { head: [columns], body: data });
    doc.save(`${filename}.pdf`);
  };

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
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Loading reports data...</p>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Comprehensive insights and data visualization</p>
        </div>
        <div className="reports-controls">
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
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </button>
        <button
          className={`tab-button ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          Leaves
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const columns = [
                    'Employee Name',
                    'Employee Email',
                    'Total Days',
                    'Present Days',
                    'Absent Days',
                    'Leave Days',
                    'Attendance Rate (%)'
                  ];
                  const data = employees.map(emp => {
                    const empAttendance = attendance.filter(a => a.employee_id === emp.id);
                    const present = empAttendance.filter(a => a.status === 'Present').length;
                    const absent = empAttendance.filter(a => a.status === 'Absent').length;
                    const leave = empAttendance.filter(a => a.status === 'Leave').length;
                    const total = present + absent + leave;
                    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
                    return [emp.name, emp.email, total, present, absent, leave, rate];
                  });
                  exportToPDF(columns, data, `attendance-report-${selectedMonth}`);
                }}
                className="export-btn"
              >
                📄 Export PDF
              </button>
              <button onClick={exportAttendanceReport} className="export-btn">
                📥 Export CSV
              </button>
            </div>
          </div>

          <div className="chart-card full-width">
            <h3>Employee Attendance Rates</h3>
            <div className="chart-container">
              <Bar data={employeeAttendanceData} options={chartOptions} />
            </div>
          </div>

          <div className="table-container">
            <h3>Detailed Attendance Report</h3>
            <div className="table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Leave</th>
                    <th>Total</th>
                    <th>Rate</th>
                    <th>Actions</th>
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
                        <td>
                          <div className="employee-info">
                            <span className="employee-name">{emp.name}</span>
                            <span className="employee-id">ID: {emp.employee_id || emp.id}</span>
                          </div>
                        </td>
                        <td className="present">{present}</td>
                        <td className="absent">{absent}</td>
                        <td className="leave">{leave}</td>
                        <td>{total}</td>
                        <td>
                          <span className={`rate-badge ${rate >= 80 ? 'good' : rate >= 60 ? 'average' : 'poor'}`}>
                            {rate}%
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => generateEmployeePDF(emp)}
                            className="pdf-btn"
                            title="Generate PDF Report"
                          >
                            📄 PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Leaves Tab */}
      {activeTab === 'leaves' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Leave Management Reports</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const columns = ['Employee Name', 'Start Date', 'End Date', 'Reason', 'Status'];
                  const data = leaveRequests.map(l => {
                    const emp = employees.find(e => e.id === l.employee_id);
                    return [emp ? emp.name : 'N/A', new Date(l.start_date).toLocaleDateString(), new Date(l.end_date).toLocaleDateString(), l.reason, l.status];
                  });
                  exportToPDF(columns, data, `leave-report-${selectedMonth}`);
                }}
                className="export-btn"
              >
                📄 Export PDF
              </button>
              <button onClick={exportLeaveReport} className="export-btn">
                📥 Export CSV
              </button>
            </div>
          </div>

          <div className="stats-row">
            <div className="mini-stat pending">
              <span className="mini-stat-value">{stats.pendingLeaves}</span>
              <span className="mini-stat-label">Pending</span>
            </div>
            <div className="mini-stat approved">
              <span className="mini-stat-value">{stats.approvedLeaves}</span>
              <span className="mini-stat-label">Approved</span>
            </div>
            <div className="mini-stat rejected">
              <span className="mini-stat-value">{stats.rejectedLeaves}</span>
              <span className="mini-stat-label">Rejected</span>
            </div>
          </div>

          <div className="table-container">
            <h3>Leave Requests Details</h3>
            <div className="table-wrapper">
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
        </div>
      )}
    </div>
  );
}
