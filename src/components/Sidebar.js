import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';
import logo from '../assets/logo.png';

export default function Sidebar() {
  const location = useLocation(); // ✅ Get current path
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await signOut();
    }
  };

  // ✅ Updated menu items - removed potentially missing pages
  const menuItems = [
    { path: '/', icon: '🏠', label: 'Dashboard' },
    { path: '/employees', icon: '👥', label: 'Employee Directory' },
    { path: '/attendance', icon: '📊', label: 'Attendance' },
    { path: '/leaves', icon: '🏖️', label: 'Leave Management' },
    { path: '/performance', icon: '🎯', label: 'Performance' },
    { path: '/reports', icon: '📈', label: 'Reports' },
    { path: '/expenses', icon: '💰', label: 'Expense Approval' }, 
    { path: '/goals', icon: '🎯', label: 'Goals & KPI' }, 
    { path: '/recruitment', icon: '📝', label: 'Recruitment' },
    { path: '/exit-formalities', icon: '🚪', label: 'Exit Formalities' },
    // { path: '/payroll', icon: '💰', label: 'Payroll Management' }, // ❓ Uncomment if exists
    { path: '/security', icon: '🔐', label: 'Security' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="company-logo">
          <img 
            src={logo}
            alt="Company Logo" 
            className="logo-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="logo-fallback">🏢</div>
        </div>
        <h2>HRMS</h2>
        <p>Amsis Engineering</p>
        {user && (
          <div className="user-info">
            <small>{user.email}</small>
          </div>
        )}
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          // ✅ Check if current path matches menu item path
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`} // ✅ Add active class
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          🚪 Logout
        </button>
        <div className="app-version">v1.0.0</div>
        <div className="company-info">HR Management System</div>
      </div>
    </div>
  );
}
