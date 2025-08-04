import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import './Attendance.css';

export default function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState([]);
  const [summaries, setSummaries] = useState({});

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('id, name');
      if (!error) setEmployees(data);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      const from = new Date(selectedDate);
      from.setDate(1);
      const to = new Date(from);
      to.setMonth(to.getMonth() + 1);

      const { data, error } = await supabase
        .from('attendance')
        .select('id, date, status, employee_id, created_at')
        .gte('date', from.toISOString().split('T')[0])
        .lt('date', to.toISOString().split('T')[0]);

      if (!error) {
        setHistory(data);
        generateSummaries(data);
      }
    };
    fetchHistory();
  }, [selectedDate]);

  const generateSummaries = (records) => {
    const summaryMap = {};
    records.forEach(({ employee_id, status, created_at }) => {
      if (!summaryMap[employee_id]) {
        summaryMap[employee_id] = {
          Present: 0,
          Absent: 0,
          Leave: 0,
          lastUpdated: created_at,
        };
      }

      summaryMap[employee_id][status] = (summaryMap[employee_id][status] || 0) + 1;

      if (
        !summaryMap[employee_id].lastUpdated ||
        new Date(created_at) > new Date(summaryMap[employee_id].lastUpdated)
      ) {
        summaryMap[employee_id].lastUpdated = created_at;
      }
    });

    // Format the timestamp
    for (const id in summaryMap) {
      const dt = new Date(summaryMap[id].lastUpdated);
      summaryMap[id].lastUpdated = dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    }

    setSummaries(summaryMap);
  };

  const handleStatusChange = (employeeId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleSubmit = async () => {
    const entries = Object.entries(attendanceData).map(([employee_id, status]) => ({
      employee_id,
      status,
      date: selectedDate,
    }));

    const { error } = await supabase.from('attendance').insert(entries);
    if (!error) {
      alert('Attendance saved!');
      setAttendanceData({});
    } else {
      alert('Error saving attendance');
    }
  };

  return (
    <div className="attendance-container">
      <h2>Mark Attendance</h2>

      <label className="date-picker-label">
        Select Date:
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </label>

      <table className="attendance-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Summary (This Month)</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const summary = summaries[emp.id] || { Present: 0, Absent: 0, Leave: 0 };
            return (
              <tr key={emp.id}>
                <td>{emp.name}</td>
                <td>
                  <select
                    value={attendanceData[emp.id] || ''}
                    onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                  </select>
                </td>
                <td>
                  <div className="summary-box">
                    <span>✔️ Present: {summary.Present}</span>
                    <span>❌ Absent: {summary.Absent}</span>
                    <span>🏖️ Leave: {summary.Leave}</span>
                    <span>🕒 Last Updated: {summary.lastUpdated || 'N/A'}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button className="submit-btn" onClick={handleSubmit}>
        Submit Attendance
      </button>
    </div>
  );
}
