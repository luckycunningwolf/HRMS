import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: '🏠', label: 'Dashboard' },
    { path: '/employees', icon: '👥', label: 'Employee Directory' },
    { path: '/attendance', icon: '📊', label: 'Attendance' },
    { path: '/leaves', icon: '🏖️', label: 'Leave Management' },
    { path: '/performance', icon: '🎯', label: 'Performance' },
    { path: '/reports', icon: '📈', label: 'Reports' },
    { path: '/recruitment', icon: '📝', label: 'Recruitment' },
    { path: '/payroll', icon: '💰', label: 'Payroll Management' },
    { path: '/security', icon: '🔐', label: 'Security' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🏢 HRMS</h2>
        <p>Human Resource Management System</p>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="app-version">v1.0.0</div>
      </div>
    </div>
  );
}
