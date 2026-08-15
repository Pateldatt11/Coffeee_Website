import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import './Forgotpassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode') || '';

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    const loadEmail = async () => {
      if (!oobCode) return;
      try {
        const resetEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(resetEmail);
      } catch (err) {
        console.error('Reset code verification failed:', err);
        setError('This reset link is invalid or expired. Please request a new one.');
      }
    };

    loadEmail();
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!oobCode) {
      setError('Missing reset code. Open the reset link from your email again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error('Password reset failed:', err);

      if (err?.code === 'auth/expired-action-code') {
        setError('This reset link expired. Please request a new one.');
      } else if (err?.code === 'auth/invalid-action-code') {
        setError('This reset link is invalid. Please request a new one.');
      } else if (err?.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Could not reset your password right now. Please try again.');
      }
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
            New<br />
            <span className="title-brand">Password</span>
          </h2>
          <p className="visual-sub">
            Create a fresh password and get back in.<br />
            Your reset link will only work once.
          </p>
          <ul className="visual-perks">
            <li><span className="perk-icon">🔐</span>One-time reset link</li>
            <li><span className="perk-icon">🛡️</span>Secure password update</li>
            <li><span className="perk-icon">☕</span>Back to your account fast</li>
            <li><span className="perk-icon">⏱️</span>Link can expire</li>
          </ul>
        </div>

        <div className="visual-badge">
          <div className="badge-num">Reset</div>
          <div className="badge-text">Password</div>
        </div>
      </div>

      <div className="auth-form-side">
        {success ? (
          <div className="success-state">
            <div className="success-icon">✅</div>
            <h2>Password<br /><em>Updated</em></h2>
            <p>
              Your password has been reset for <strong>{email || 'your account'}</strong>.
              You can now log in with your new password.
            </p>
            <Link to="/login" className="primary-btn"><span>Go to Login →</span></Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-header">
              <p className="section-tag">Reset Password</p>
              <h1 className="form-title">Set a <em>New Password</em></h1>
            </div>

            <p className="helper-text">
              {email
                ? <>Resetting password for <strong>{email}</strong>.</>
                : 'Open the reset link from your email to continue.'}
            </p>

            {error && <p className="error-msg firebase-error">{error}</p>}

            <div className="input-group">
              <label htmlFor="new-password">New Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="primary-btn submit-btn" disabled={loading}>
              <span>{loading ? 'Updating...' : 'Update Password →'}</span>
            </button>

            <p className="switch-text">
              Remembered it already?{' '}
              <Link to="/login" className="switch-link">Log In</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;