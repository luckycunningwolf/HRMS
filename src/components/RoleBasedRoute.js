// src/components/RoleBasedRoute.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

export default function RoleBasedRoute({ allowedRoles, children }) {
  const { user, userProfile, loading, signOut } = useAuth(); // ✅ Get signOut from context

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #81d4fa 0%, #a5d6a7 100%)',
        color: 'white',
        fontSize: '1.2rem',
        fontWeight: '600'
      }}>
        <div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!userProfile) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #81d4fa 0%, #a5d6a7 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <h2>Profile Loading...</h2>
          <p>Setting up your account access</p>
        </div>
      </div>
    );
  }

  if (!userProfile.is_active) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #81d4fa 0%, #a5d6a7 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <h2>Account Inactive</h2>
          <p>Your account has been deactivated. Please contact your administrator.</p>
          <button 
            onClick={() => signOut()} // ✅ Use signOut from context
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #81d4fa 0%, #a5d6a7 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <h2>🔒 Access Denied</h2>
          <p>You don't have permission to access this portal.</p>
          <p>Required role: <strong>{allowedRoles.join(' or ')}</strong></p>
          <p>Your role: <strong>{userProfile.role}</strong></p>
          <button 
            onClick={() => window.location.href = '/employee'}
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem',
              marginRight: '1rem'
            }}
          >
            Go to Employee Portal
          </button>
          <button 
            onClick={() => signOut()} // ✅ Use signOut from context
            style={{
              padding: '1rem 2rem',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return children;
}
