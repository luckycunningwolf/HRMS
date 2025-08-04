import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';
import logo from '../assets/logo.png';

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Logo" />
      </div>
      <div className="sidebar-title">HRMS</div>

      <ul className="sidebar-links">
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/attendance">Attendance</Link></li>
        <li><Link to="/leaves">Leave Management</Link></li>
        <li><Link to="/reports">Reports</Link></li>
        <li><Link to="/performance">Performance</Link></li>
        <li><Link to="/payroll">Payroll Management</Link></li>
        <li><Link to="/security">Security</Link></li>
        <li><Link to="/recruitment">Recruitment</Link></li>
      </ul>
    </div>
  );
}
