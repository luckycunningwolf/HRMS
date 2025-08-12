import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

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

  return user ? children : <Login />;
}
