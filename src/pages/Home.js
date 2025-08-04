import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import EmployeeForm from '../components/EmployeeForm';
import './Home.css'; // You can style with CSS here

export default function Home() {
  const [employees, setEmployees] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from('employees').select('id, name, role, email');
      if (error) throw error;
      setEmployees(data);
      fetchAttendanceSummary(data.map(emp => emp.id));
    } catch (err) {
      console.error('Fetch error:', err.message);
      setError(err.message);
    }
  };

  const fetchAttendanceSummary = async (employeeIds) => {
    const start = new Date();
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    const { data, error } = await supabase
      .from('attendance')
      .select('employee_id, status')
      .gte('date', start.toISOString().split('T')[0])
      .lt('date', end.toISOString().split('T')[0]);

    if (error) {
      console.error('Attendance error:', error.message);
      return;
    }

    const summary = {};
    for (const entry of data) {
      if (!summary[entry.employee_id]) {
        summary[entry.employee_id] = { Present: 0, Absent: 0, Leave: 0 };
      }
      summary[entry.employee_id][entry.status] += 1;
    }

    setAttendanceSummary(summary);
  };

  const calculatePercentage = (summary) => {
    const total = summary.Present + summary.Absent + summary.Leave;
    return total > 0 ? ((summary.Present / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>HR Management System</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <EmployeeForm onEmployeeAdded={fetchEmployees} />

      <h2>Employee List with Attendance Summary</h2>
      <div className="employee-grid">
        {employees.map((emp) => {
          const summary = attendanceSummary[emp.id] || { Present: 0, Absent: 0, Leave: 0 };
          const percentage = calculatePercentage(summary);
          return (
            <div className="employee-card" key={emp.id}>
              <h3>{emp.name}</h3>
              <p><strong>Role:</strong> {emp.role || 'N/A'}</p>
              <p><strong>Email:</strong> {emp.email || 'N/A'}</p>
              <div className="attendance-summary">
                <div className="attendance-item present">
                  <span>✔️ Present</span>
                  <span>{summary.Present}</span>
                </div>
                <div className="attendance-item absent">
                  <span>❌ Absent</span>
                  <span>{summary.Absent}</span>
                </div>
                <div className="attendance-item leave">
                  <span>🏖️ Leave</span>
                  <span>{summary.Leave}</span>
                </div>
                <div className="attendance-percentage">
                  <span>📊 Attendance Rate  </span>
                  <strong>{percentage}%</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
