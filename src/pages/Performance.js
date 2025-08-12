import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import './Performance.css';

export default function Performance() {
  const [employees, setEmployees] = useState([]);
  const [performanceReviews, setPerformanceReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewFormData, setReviewFormData] = useState({
    employee_id: '',
    reviewer_id: 1, // Default to admin
    review_period_start: '',
    review_period_end: '',
    overall_rating: 3,
    technical_skills: 3,
    communication: 3,
    teamwork: 3,
    leadership: 3,
    problem_solving: 3,
    attendance_punctuality: 3,
    goals_achievement: 3,
    comments: '',
    strengths: '',
    improvement_areas: '',
    goals_next_period: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchPerformanceReviews()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true);
    if (!error) setEmployees(data);
  };

  const fetchPerformanceReviews = async () => {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select(`
        *,
        employees!performance_reviews_employee_id_fkey(name, email, role),
        reviewer:employees!performance_reviews_reviewer_id_fkey(name)
      `)
      .order('created_at', { ascending: false });
    if (!error) setPerformanceReviews(data);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!reviewFormData.employee_id) {
      alert('Please select an employee');
      return;
    }

    try {
      const { error } = await supabase
        .from('performance_reviews')
        .insert([{
          ...reviewFormData,
          employee_id: parseInt(reviewFormData.employee_id),
          reviewer_id: 1 // Assuming admin user for now
        }]);

      if (error) throw error;

      alert('Performance review submitted successfully!');
      setShowReviewForm(false);
      setReviewFormData({
        employee_id: '',
        reviewer_id: 1,
        review_period_start: '',
        review_period_end: '',
        overall_rating: 3,
        technical_skills: 3,
        communication: 3,
        teamwork: 3,
        leadership: 3,
        problem_solving: 3,
        attendance_punctuality: 3,
        goals_achievement: 3,
        comments: '',
        strengths: '',
        improvement_areas: '',
        goals_next_period: ''
      });
      fetchPerformanceReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review: ' + error.message);
    }
  };

  const calculateAverageRating = (review) => {
    const ratings = [
      review.technical_skills,
      review.communication,
      review.teamwork,
      review.leadership,
      review.problem_solving,
      review.attendance_punctuality,
      review.goals_achievement
    ];
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  const getPerformanceStats = () => {
    const totalReviews = performanceReviews.length;
    const averageRating = totalReviews > 0 
      ? (performanceReviews.reduce((sum, review) => sum + review.overall_rating, 0) / totalReviews).toFixed(1)
      : 0;
    
    const ratingDistribution = {
      excellent: performanceReviews.filter(r => r.overall_rating >= 4.5).length,
      good: performanceReviews.filter(r => r.overall_rating >= 3.5 && r.overall_rating < 4.5).length,
      average: performanceReviews.filter(r => r.overall_rating >= 2.5 && r.overall_rating < 3.5).length,
      poor: performanceReviews.filter(r => r.overall_rating < 2.5).length
    };

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      reviewedEmployees: new Set(performanceReviews.map(r => r.employee_id)).size,
      pendingReviews: employees.length - new Set(performanceReviews.map(r => r.employee_id)).size
    };
  };

  const stats = getPerformanceStats();

  const RatingStars = ({ rating, onChange, disabled = false }) => {
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${!disabled ? 'clickable' : ''}`}
            onClick={!disabled ? () => onChange(star) : undefined}
          >
            ⭐
          </span>
        ))}
        <span className="rating-number">({rating}/5)</span>
      </div>
    );
  };

  const getPerformanceLevel = (rating) => {
    if (rating >= 4.5) return { label: 'Excellent', color: '#28a745' };
    if (rating >= 3.5) return { label: 'Good', color: '#17a2b8' };
    if (rating >= 2.5) return { label: 'Average', color: '#ffc107' };
    return { label: 'Needs Improvement', color: '#dc3545' };
  };

  if (loading) {
    return (
      <div className="performance-container">
        <h1>Performance Management</h1>
        <p>Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="performance-container">
      {/* Header */}
      <div className="performance-header">
        <h1> Performance Management</h1>
        <button 
          onClick={() => setShowReviewForm(!showReviewForm)}
          className="btn-primary"
        >
          {showReviewForm ? 'Cancel' : '+ New Review'}
        </button>
      </div>

      {/* Performance Review Form */}
      {showReviewForm && (
        <div className="review-form-container">
          <h2>📋 Performance Review Form</h2>
          <form onSubmit={handleReviewSubmit} className="review-form">
            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Employee *</label>
                  <select
                    value={reviewFormData.employee_id}
                    onChange={(e) => setReviewFormData({...reviewFormData, employee_id: e.target.value})}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Review Period Start *</label>
                  <input
                    type="date"
                    value={reviewFormData.review_period_start}
                    onChange={(e) => setReviewFormData({...reviewFormData, review_period_start: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Review Period End *</label>
                  <input
                    type="date"
                    value={reviewFormData.review_period_end}
                    onChange={(e) => setReviewFormData({...reviewFormData, review_period_end: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Performance Ratings */}
            <div className="form-section">
              <h3>Performance Ratings</h3>
              <div className="ratings-grid">
                <div className="rating-item">
                  <label>Overall Rating</label>
                  <RatingStars 
                    rating={reviewFormData.overall_rating}
                    onChange={(rating) => setReviewFormData({...reviewFormData, overall_rating: rating})}
                  />
                </div>
                <div className="rating-item">
                  <label>Technical Skills</label>
                  <RatingStars 
                    rating={reviewFormData.technical_skills}
                    onChange={(rating) => setReviewFormData({...reviewFormData, technical_skills: rating})}
                  />
                </div>
                <div className="rating-item">
                  <label>Communication</label>
                  <RatingStars 
                    rating={reviewFormData.communication}
                    onChange={(rating) => setReviewFormData({...reviewFormData, communication: rating})}
                  />
                </div>
                <div className="rating-item">
                  <label>Teamwork</label>
                  <RatingStars 
                    rating={reviewFormData.teamwork}
                    onChange={(rating) => setReviewFormData({...reviewFormData, teamwork: rating})}
                  />
                </div>
                <div className="rating-item">
                  <label>Leadership</label>
                  <RatingStars 
                    rating={reviewFormData.leadership}
                    onChange={(rating) => setReviewFormData({...reviewFormData, leadership: rating})}
                  />
                </div>
                <div className="rating-item">
                  <label>Problem Solving</label>
                  <RatingStars 
                    rating={reviewFormData.problem_solving}
                    onChange={(rating) => setReviewFormData({...reviewFormData, problem_solving: rating})}
                  />
                </div>
                <div className="rating-item">
                  <label>Attendance & Punctuality</label>
                  <RatingStars 
                    rating={reviewFormData.attendance_punctuality}
                    onChange={(rating) => setReviewFormData({...reviewFormData, attendance_punctuality: rating})}
                  />
                </div>
                <div className="rating-item">
                  <label>Goals Achievement</label>
                  <RatingStars 
                    rating={reviewFormData.goals_achievement}
                    onChange={(rating) => setReviewFormData({...reviewFormData, goals_achievement: rating})}
                  />
                </div>
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="form-section">
              <h3>Detailed Feedback</h3>
              <div className="form-group">
                <label>General Comments</label>
                <textarea
                  value={reviewFormData.comments}
                  onChange={(e) => setReviewFormData({...reviewFormData, comments: e.target.value})}
                  rows={4}
                  placeholder="Overall feedback about the employee's performance..."
                />
              </div>
              <div className="form-group">
                <label>Key Strengths</label>
                <textarea
                  value={reviewFormData.strengths}
                  onChange={(e) => setReviewFormData({...reviewFormData, strengths: e.target.value})}
                  rows={3}
                  placeholder="What are the employee's key strengths?"
                />
              </div>
              <div className="form-group">
                <label>Areas for Improvement</label>
                <textarea
                  value={reviewFormData.improvement_areas}
                  onChange={(e) => setReviewFormData({...reviewFormData, improvement_areas: e.target.value})}
                  rows={3}
                  placeholder="What areas need improvement?"
                />
              </div>
              <div className="form-group">
                <label>Goals for Next Period</label>
                <textarea
                  value={reviewFormData.goals_next_period}
                  onChange={(e) => setReviewFormData({...reviewFormData, goals_next_period: e.target.value})}
                  rows={3}
                  placeholder="What are the goals for the next review period?"
                />
              </div>
            </div>

            <button type="submit" className="btn-submit">
              Submit Performance Review
            </button>
          </form>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={activeTab === 'overview' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={activeTab === 'reviews' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('reviews')}
        >
          📋 Reviews
        </button>
        <button
          className={activeTab === 'analytics' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-details">
                <h3>{stats.totalReviews}</h3>
                <p>Total Reviews</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-details">
                <h3>{stats.averageRating}</h3>
                <p>Average Rating</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-details">
                <h3>{stats.reviewedEmployees}</h3>
                <p>Reviewed Employees</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-details">
                <h3>{stats.pendingReviews}</h3>
                <p>Pending Reviews</p>
              </div>
            </div>
          </div>

          {/* Performance Distribution */}
          <div className="performance-distribution">
            <h3>Performance Distribution</h3>
            <div className="distribution-grid">
              <div className="distribution-item excellent">
                <div className="distribution-count">{stats.ratingDistribution.excellent}</div>
                <div className="distribution-label">Excellent (4.5+)</div>
              </div>
              <div className="distribution-item good">
                <div className="distribution-count">{stats.ratingDistribution.good}</div>
                <div className="distribution-label">Good (3.5-4.4)</div>
              </div>
              <div className="distribution-item average">
                <div className="distribution-count">{stats.ratingDistribution.average}</div>
                <div className="distribution-label">Average (2.5-3.4)</div>
              </div>
              <div className="distribution-item poor">
                <div className="distribution-count">{stats.ratingDistribution.poor}</div>
                <div className="distribution-label">Needs Improvement (&lt;2.5)</div>
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="recent-reviews">
            <h3>Recent Reviews</h3>
            <div className="reviews-grid">
              {performanceReviews.slice(0, 6).map(review => {
                const performance = getPerformanceLevel(review.overall_rating);
                return (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <h4>{review.employees?.name}</h4>
                      <span className="review-date">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="review-rating">
                      <RatingStars rating={review.overall_rating} disabled />
                    </div>
                    <div className="review-performance" style={{ color: performance.color }}>
                      {performance.label}
                    </div>
                    <div className="review-period">
                      {new Date(review.review_period_start).toLocaleDateString()} - 
                      {new Date(review.review_period_end).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="tab-content">
          <h2>All Performance Reviews</h2>
          <div className="reviews-table-container">
            <table className="reviews-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Review Period</th>
                  <th>Overall Rating</th>
                  <th>Performance Level</th>
                  <th>Reviewer</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {performanceReviews.map(review => {
                  const performance = getPerformanceLevel(review.overall_rating);
                  return (
                    <tr key={review.id}>
                      <td>
                        <div className="employee-info">
                          <strong>{review.employees?.name}</strong>
                          <small>{review.employees?.email}</small>
                        </div>
                      </td>
                      <td>{review.employees?.role}</td>
                      <td>
                        {new Date(review.review_period_start).toLocaleDateString()} - 
                        {new Date(review.review_period_end).toLocaleDateString()}
                      </td>
                      <td>
                        <RatingStars rating={review.overall_rating} disabled />
                      </td>
                      <td>
                        <span 
                          className="performance-badge"
                          style={{ backgroundColor: performance.color + '20', color: performance.color }}
                        >
                          {performance.label}
                        </span>
                      </td>
                      <td>{review.reviewer?.name || 'Admin'}</td>
                      <td>{new Date(review.created_at).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn-view"
                          onClick={() => setSelectedEmployee(review)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="tab-content">
          <h2>Performance Analytics</h2>
          
          {/* Employee Performance Comparison */}
          <div className="analytics-section">
            <h3>Employee Performance Comparison</h3>
            <div className="performance-comparison">
              {employees.map(emp => {
                const empReviews = performanceReviews.filter(r => r.employee_id === emp.id);
                const avgRating = empReviews.length > 0 
                  ? (empReviews.reduce((sum, review) => sum + review.overall_rating, 0) / empReviews.length).toFixed(1)
                  : 'No Reviews';
                
                return (
                  <div key={emp.id} className="employee-performance-item">
                    <div className="employee-name">{emp.name}</div>
                    <div className="employee-role">{emp.role}</div>
                    <div className="employee-rating">
                      {typeof avgRating === 'number' ? (
                        <RatingStars rating={parseFloat(avgRating)} disabled />
                      ) : (
                        <span className="no-reviews">{avgRating}</span>
                      )}
                    </div>
                    <div className="review-count">
                      {empReviews.length} review{empReviews.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills Analysis */}
          <div className="analytics-section">
            <h3>Skills Analysis</h3>
            <div className="skills-analysis">
              {performanceReviews.length > 0 && (
                <div className="skills-grid">
                  {[
                    { key: 'technical_skills', label: 'Technical Skills' },
                    { key: 'communication', label: 'Communication' },
                    { key: 'teamwork', label: 'Teamwork' },
                    { key: 'leadership', label: 'Leadership' },
                    { key: 'problem_solving', label: 'Problem Solving' },
                    { key: 'attendance_punctuality', label: 'Attendance' },
                    { key: 'goals_achievement', label: 'Goals Achievement' }
                  ].map(skill => {
                    const avgSkillRating = (
                      performanceReviews.reduce((sum, review) => sum + review[skill.key], 0) / 
                      performanceReviews.length
                    ).toFixed(1);
                    
                    return (
                      <div key={skill.key} className="skill-item">
                        <div className="skill-label">{skill.label}</div>
                        <div className="skill-rating">
                          <RatingStars rating={parseFloat(avgSkillRating)} disabled />
                        </div>
                        <div className="skill-average">Avg: {avgSkillRating}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedEmployee && (
        <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Performance Review Details</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedEmployee(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="review-details">
                <div className="detail-section">
                  <h3>Employee Information</h3>
                  <p><strong>Name:</strong> {selectedEmployee.employees?.name}</p>
                  <p><strong>Role:</strong> {selectedEmployee.employees?.role}</p>
                  <p><strong>Email:</strong> {selectedEmployee.employees?.email}</p>
                </div>
                
                <div className="detail-section">
                  <h3>Review Period</h3>
                  <p>{new Date(selectedEmployee.review_period_start).toLocaleDateString()} - {new Date(selectedEmployee.review_period_end).toLocaleDateString()}</p>
                </div>

                <div className="detail-section">
                  <h3>Ratings</h3>
                  <div className="ratings-detail">
                    <div className="rating-row">
                      <span>Overall Rating:</span>
                      <RatingStars rating={selectedEmployee.overall_rating} disabled />
                    </div>
                    <div className="rating-row">
                      <span>Technical Skills:</span>
                      <RatingStars rating={selectedEmployee.technical_skills} disabled />
                    </div>
                    <div className="rating-row">
                      <span>Communication:</span>
                      <RatingStars rating={selectedEmployee.communication} disabled />
                    </div>
                    <div className="rating-row">
                      <span>Teamwork:</span>
                      <RatingStars rating={selectedEmployee.teamwork} disabled />
                    </div>
                    <div className="rating-row">
                      <span>Leadership:</span>
                      <RatingStars rating={selectedEmployee.leadership} disabled />
                    </div>
                    <div className="rating-row">
                      <span>Problem Solving:</span>
                      <RatingStars rating={selectedEmployee.problem_solving} disabled />
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Feedback</h3>
                  <div className="feedback-item">
                    <h4>Comments:</h4>
                    <p>{selectedEmployee.comments || 'No comments provided'}</p>
                  </div>
                  <div className="feedback-item">
                    <h4>Strengths:</h4>
                    <p>{selectedEmployee.strengths || 'No strengths noted'}</p>
                  </div>
                  <div className="feedback-item">
                    <h4>Areas for Improvement:</h4>
                    <p>{selectedEmployee.improvement_areas || 'No improvement areas noted'}</p>
                  </div>
                  <div className="feedback-item">
                    <h4>Goals for Next Period:</h4>
                    <p>{selectedEmployee.goals_next_period || 'No goals set'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
