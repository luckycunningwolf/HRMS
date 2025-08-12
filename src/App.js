import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Exact case
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard'; // Exact case
import EmployeeDirectory from './pages/EmployeeDirectory';
import Attendance from './pages/Attendance';
import LeaveManagement from './pages/LeaveManagement';
import Performance from './pages/Performance';
import Reports from './pages/Reports';
import Recruitment from './pages/Recruitment';
import ExitFormalities from './pages/ExitFormalities';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <div className="app">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={<EmployeeDirectory />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/leaves" element={<LeaveManagement />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/recruitment" element={<Recruitment />} />
                <Route path="/exit-formalities" element={<ExitFormalities />} />
              </Routes>
            </main>
          </div>
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  );
}

export default App;
