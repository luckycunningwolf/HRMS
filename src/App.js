import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Attendance from './pages/Attendance';
import LeaveManagement from './pages/LeaveManagement';
import Reports from './pages/Reports';  // Add this import
import Sidebar from './components/Sidebar';

export default function App() {
  return (
    <Router>
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={{ marginLeft: '220px', padding: '1rem', width: '100%' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leaves" element={<LeaveManagement />} />
            <Route path="/reports" element={<Reports />} />  {/* Add this route */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}
