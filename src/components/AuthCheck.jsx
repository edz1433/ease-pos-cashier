import React, { useState, useEffect } from 'react';

const AuthCheck = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE_URL;

      const response = await fetch(`${baseUrl}/api/auth/check`, {
        credentials: 'include', // include cookies
      });

      if (response.ok) {
        const data = await response.json();

        if (data.authenticated) {
          setUser(data.user);
          setLoading(false);
        } else {
          window.location.href = `${baseUrl}/`;
        }
      } else {
        window.location.href = `${baseUrl}/`;
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      window.location.href = `${process.env.REACT_APP_API_BASE_URL}/`;
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <div
          style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  // Only render children if user is authenticated
  return React.cloneElement(children, { user });
};

// Spinner animation
const styles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
const styleSheet = document.createElement('style');
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default AuthCheck;
