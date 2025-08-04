import React, { useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import './EmployeeForm.css';

export default function EmployeeForm({ onEmployeeAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    pan: '',
    aadhar: '',
    passport: '',
    bank_ifsc: '',
    bank_name: '',
    bank_account: '',
    emergency_contact: '',
    joining_date: '',
    probation_period: '',
    confirmation_date: '',
    address_permanent: '',
    address_current: '',
    wedding_anniversary: '',
    email: '',
    role: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const bankInfo = `Bank Name: ${formData.bank_name}, Account Number: ${formData.bank_account}, IFSC: ${formData.bank_ifsc}`;

    const submission = {
      ...formData,
      bank_details: { info: bankInfo },
      emergency_contacts: [{ contact: formData.emergency_contact }],
      created_at: new Date().toISOString(),
    };

    // Remove fields not expected by backend
    delete submission.bank_name;
    delete submission.bank_account;
    delete submission.bank_ifsc;
    delete submission.emergency_contact;

    const { error } = await supabase.from('employees').insert([submission]);
    if (!error) {
      onEmployeeAdded();
      alert('Employee added successfully');
      setFormData({
        name: '',
        dob: '',
        pan: '',
        aadhar: '',
        passport: '',
        bank_ifsc: '',
        bank_name: '',
        bank_account: '',
        emergency_contact: '',
        joining_date: '',
        probation_period: '',
        confirmation_date: '',
        address_permanent: '',
        address_current: '',
        wedding_anniversary: '',
        email: '',
        role: '',
      });
    } else {
      alert('Error: ' + error.message);
    }
  };

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h2>Add New Employee</h2>

      <div className="form-section">
        <h3>Personal Info</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Wedding Anniversary</label>
            <input type="date" name="wedding_anniversary" value={formData.wedding_anniversary} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Identification</h3>
        <div className="form-row">
          <div className="form-group">
            <label>PAN</label>
            <input type="text" name="pan" value={formData.pan} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Aadhar</label>
            <input type="text" name="aadhar" value={formData.aadhar} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Passport</label>
            <input type="text" name="passport" value={formData.passport} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Contact & Bank</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Bank Name</label>
            <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>IFSC Code</label>
            <input type="text" name="bank_ifsc" value={formData.bank_ifsc} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Emergency Contact</label>
            <input type="text" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Employment</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Joining Date</label>
            <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Probation Period (months)</label>
            <input type="number" name="probation_period" value={formData.probation_period} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Confirmation Date</label>
            <input type="date" name="confirmation_date" value={formData.confirmation_date} onChange={handleChange} />
          </div>
        </div>
        <div className="form-group">
          <label>Role</label>
          <input type="text" name="role" value={formData.role} onChange={handleChange} />
        </div>
      </div>

      <div className="form-section">
        <h3>Addresses</h3>
        <div className="form-row">
          <div className="form-group full-width">
            <label>Permanent Address</label>
            <textarea name="address_permanent" value={formData.address_permanent} onChange={handleChange} />
          </div>
          <div className="form-group full-width">
            <label>Current Address</label>
            <textarea name="address_current" value={formData.address_current} onChange={handleChange} />
          </div>
        </div>
      </div>

      <button type="submit" className="submit-btn">Add Employee</button>
    </form>
  );
}
