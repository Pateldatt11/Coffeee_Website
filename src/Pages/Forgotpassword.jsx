import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import './Forgotpassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dotRef = useRef(null);
  const ringRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (dotRef.current) {
      dotRef.current.style.left = `${e.clientX}px`;
      dotRef.current.style.top = `${e.clientY}px`;
    }
    if (ringRef.current) {
      ringRef.current.style.left = `${e.clientX}px`;
      ringRef.current.style.top = `${e.clientY}px`;
    }
  }, []);

  const addHover = useCallback(() => ringRef.current?.classList.add('hovered'), []);
  const rmvHover = useCallback(() => ringRef.current?.classList.remove('hovered'), []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    const targets = document.querySelectorAll('button, a, input');
    targets.forEach((el) => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', rmvHover);
    });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      targets.forEach((el) => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', rmvHover);
      });
    };
  }, [onMouseMove, addHover, rmvHover]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);

      if (err?.code === 'auth/invalid-email') {
        setError('Enter a valid email');
        return;
      }

      if (err?.code === 'auth/unauthorized-continue-uri') {
        setError('Add your site URL to Firebase Auth authorized domains.');
        return;
      }

      if (err?.code === 'auth/user-not-found') {
        setSubmitted(true);
        return;
      }

      setError('Unable to send the reset email right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      <div className="auth-visual">
        <img
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80"
          alt="Coffee atmosphere"
          className="auth-bg-img"
        />
        <div className="auth-visual-overlay" />

        <div className="auth-visual-content">
          <p className="visual-eyebrow"><span />LevelUP Brew</p>
          <h2 className="visual-title">
            Reset<br />
            <span className="title-brand">Access</span>
          </h2>
          <p className="visual-sub">
            No worries. It happens.<br />
            We'll get you a fresh brew of access.
          </p>
          <ul className="visual-perks">
            <li><span className="perk-icon">🔑</span>Secure reset link</li>
            <li><span className="perk-icon">⏱️</span>Expires for safety</li>
            <li><span className="perk-icon">☕</span>Back to your account fast</li>
            <li><span className="perk-icon">🛡️</span>No data shared</li>
          </ul>
        </div>

        <div className="visual-badge">
          <div className="badge-num">1-Click</div>
          <div className="badge-text">Reset Link</div>
        </div>
      </div>

      <div className="auth-form-side">
        {submitted ? (
          <div className="success-state">
            <div className="success-icon">📩</div>
            <h2>Check Your<br /><em>Inbox</em></h2>
            <p>
              If an account exists for <strong>{email}</strong>, Firebase has sent
              a real password reset link so you can create a new password and log back in.
              It can take a minute — check spam too.
            </p>
            <div className="success-actions">
              <Link to="/reset-password" className="primary-btn"><span>Open Reset Page →</span></Link>
              <Link to="/login" className="ghost-btn"><span>Back to Login →</span></Link>
            </div>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-header">
              <p className="section-tag">Forgot Password</p>
              <h1 className="form-title">Reset <em>Password</em></h1>
            </div>

            <p className="helper-text">
              Enter the email linked to your account and we'll send you a link to reset your password.
            </p>

            {error && <p className="error-msg firebase-error">{error}</p>}

            <div className={`input-group ${error ? 'has-error' : ''}`}>
              <label htmlFor="fp-email">Email Address</label>
              <div className="input-wrap">
                <span className="input-icon">✉️</span>
                <input
                  id="fp-email"
                  type="email"
                  placeholder="you@levelupbrew.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="primary-btn submit-btn" disabled={loading}>
              <span>{loading ? 'Sending...' : 'Send Reset Link →'}</span>
            </button>

            <p className="switch-text">
              Remembered your password?{' '}
              <Link to="/login" className="switch-link">Log In</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;