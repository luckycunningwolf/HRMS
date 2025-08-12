// src/components/AttendanceForm.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';

export default function AttendanceForm() {
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: '',
    status: 'Present',
    remarks: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('id, name');
      if (!error) setEmployees(data);
    };
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('attendance').insert([formData]);
    if (error) {
      setMessage('Error logging attendance.');
    } else {
      setMessage('Attendance logged successfully!');
      setFormData({ employee_id: '', date: '', status: 'Present', remarks: '' });
    }
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', maxWidth: '500px', margin: 'auto' }}>
      <h2>Log Attendance</h2>
      <form onSubmit={handleSubmit}>
        <label>Employee:</label>
        <select name="employee_id" value={formData.employee_id} onChange={handleChange} required>
          <option value="">Select Employee</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        <br /><br />
        <label>Date:</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required />

        <br /><br />
        <label>Status:</label>
        <select name="status" value={formData.status} onChange={handleChange}>
          <option>Present</option>
          <option>Absent</option>
          <option>CL</option>
          <option>SL</option>
          <option>LOP</option>
          <option>Maternity</option>
        </select>

        <br /><br />
        <label>Remarks:</label>
        <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} />

        <br /><br />
        <button type="submit">Submit</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}
