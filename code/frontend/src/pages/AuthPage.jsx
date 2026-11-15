import React, { useState } from 'react';
import axios from 'axios';
import LandingPage from '../components/LandingPage'; // Import your main landing page component

// Your API endpoint
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AuthPage({ onAuthSuccess }) {
  const [authError, setAuthError] = useState('');

  const getErrorMessage = (err, fallback) => {
    if (err.response?.data?.message) {
      const detail = err.response.data.error;
      return detail ? `${err.response.data.message} (${detail})` : err.response.data.message;
    }
    if (typeof err.response?.data === 'string' && err.response.data.trim()) {
      return `Server error (${err.response.status}): ${err.response.data.slice(0, 120)}`;
    }
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'Request timed out. The server may be waking up from sleep. Please try again.';
    }
    if (err.code === 'ERR_NETWORK' || !err.response) {
      return 'Unable to reach the server. Please check your internet connection or verify the backend service is running.';
    }
    return err.message || fallback;
  };

  const handleLogin = async (username, password, role) => {
    setAuthError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
        role,
      });
      onAuthSuccess(response.data.user); // On success, update the main app state
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Login failed. Please check your credentials and try again.'));
    }
  };

  const handleSignUp = async (username, password, role, hospitalName, specialCode) => {
    setAuthError('');
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        username, password, role, hospitalName, specialCode
      });
      // ✅ CRUCIAL: This line sends the "success" signal to the UI.
      return true;
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Registration failed. Please try again.'));
      // ✅ CRUCIAL: This line sends the "failure" signal to the UI.
      return false;
    }
  };

  return (
    <LandingPage
      onLogin={handleLogin}
      onSignUp={handleSignUp}
      authError={authError}
    />
  );
}