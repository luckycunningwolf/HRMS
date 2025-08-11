import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; // Keep this as Home
import Attendance from './pages/Attendance';
import LeaveManagement from './pages/LeaveManagement';
import Reports from './pages/Reports';
import Performance from './pages/Performance';
import EmployeeDirectory from './pages/EmployeeDirectory';
import Recruitment from './pages/Recruitment';
import Sidebar from './components/Sidebar';

export default function App() {
  return (
    <Router>
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={{ marginLeft: '220px', padding: '1rem', width: '100%' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Home />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/employees" element={<EmployeeDirectory />} />
            <Route path="/recruitment" element={<Recruitment />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}


// Placeholder components for future modules
const PayrollPlaceholder = () => (
  <div style={{ padding: '2rem' }}>
    <h1>💰 Payroll Management</h1>
    <div style={{ 
      background: 'white', 
      padding: '2rem', 
      borderRadius: '8px',
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      <h2>Coming Soon!</h2>
      <p>Payroll management features will be available in the next update.</p>
      <div style={{ marginTop: '1rem', color: '#6c757d' }}>
        <p>Features will include:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>💵 Salary calculations</li>
          <li>📊 Payslip generation</li>
          <li>📈 Tax deductions</li>
          <li>💳 Payment tracking</li>
        </ul>
      </div>
    </div>
  </div>
);

const SecurityPlaceholder = () => (
  <div style={{ padding: '2rem' }}>
    <h1>🔐 Security Management</h1>
    <div style={{ 
      background: 'white', 
      padding: '2rem', 
      borderRadius: '8px',
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      <h2>Coming Soon!</h2>
      <p>Security and user management features will be available in the next update.</p>
      <div style={{ marginTop: '1rem', color: '#6c757d' }}>
        <p>Features will include:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>👤 User management</li>
          <li>🛡️ Role-based access</li>
          <li>📋 Audit logs</li>
          <li>🔒 Permission controls</li>
        </ul>
      </div>
    </div>
  </div>
);

const RecruitmentPlaceholder = () => (
  <div style={{ padding: '2rem' }}>
    <h1>📝 Recruitment Management</h1>
    <div style={{ 
      background: 'white', 
      padding: '2rem', 
      borderRadius: '8px',
      textAlign: 'center',
      marginTop: '2rem'
    }}>
      <h2>Coming Soon!</h2>
      <p>Recruitment and hiring features will be available in the next update.</p>
      <div style={{ marginTop: '1rem', color: '#6c757d' }}>
        <p>Features will include:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>📋 Job postings</li>
          <li>👥 Candidate tracking</li>
          <li>📅 Interview scheduling</li>
          <li>📊 Hiring analytics</li>
        </ul>
      </div>
    </div>
  </div>
);

const NotFound = () => (
  <div style={{ 
    padding: '2rem', 
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  }}>
    <h1 style={{ fontSize: '4rem', margin: 0, color: '#e74c3c' }}>404</h1>
    <h2 style={{ color: '#333', marginBottom: '1rem' }}>Page Not Found</h2>
    <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
      The page you're looking for doesn't exist.
    </p>
    <button 
      onClick={() => window.history.back()}
      style={{
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      Go Back
    </button>
  </div>
);
