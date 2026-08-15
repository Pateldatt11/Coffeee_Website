import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import './Login.css';

// NOTE ON SECURITY:
// Admin access is decided by a "role" field stored in Firestore (users/{uid}),
// NOT by a hardcoded username/password in this file.
// Anyone can read this source code in the browser, so any password written
// here would be visible to every visitor. Never hardcode credentials in
// frontend code.
//
// To make an account admin: open Firebase Console -> Firestore -> users ->
// (that user's document) -> add field: role = "admin" (string).
// Everyone else should have role = "customer" (or no role field at all).
//
// IMPORTANT: Also set a Firestore Security Rule so only role === "admin"
// documents/collections can be read/written by an admin. Without a rule,
// a user could bypass this UI check by calling Firestore directly.

const Login = () => {
  const navigate = useNavigate();
  const [user, authLoading] = useAuthState(auth);

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

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
    targets.forEach(el => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', rmvHover);
    });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      targets.forEach(el => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', rmvHover);
      });
    };
  }, [onMouseMove, addHover, rmvHover]);

  // Reset any stale error/form state every time this page is opened fresh.
  useEffect(() => {
    setErrors({});
    setSubmitted(false);
    setFormData({ email: '', password: '' });
  }, []);

  // ── If a session already exists, don't show the login form at all ──
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0d0805',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1.5rem',
        fontFamily: "'DM Sans', sans-serif", color: '#c9956c',
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '2px solid rgba(201,149,108,0.15)',
          borderTop: '2px solid #c9956c',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#a89070' }}>
          Checking your session...
        </p>
      </div>
    );
  }

  if (user && !submitted) {
    return <Navigate to="/" replace />;
  }

  // Checks Firestore for this user's role and returns true if admin
  const checkIsAdmin = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const role = snap.exists() ? snap.data().role : null;
      return role === 'admin';
    } catch (err) {
      console.error('Role check failed:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.email.includes('@')) newErrors.email = 'Enter a valid email';
    if (formData.password.length < 6) newErrors.password = 'Min 6 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const currentUser = auth.currentUser;

      if (currentUser) {
        await setDoc(doc(db, 'users', currentUser.uid), {
          uid: currentUser.uid,
          name: currentUser.displayName || '',
          email: currentUser.email || formData.email,
          provider: currentUser.providerData?.[0]?.providerId || 'password',
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        const admin = await checkIsAdmin(currentUser.uid);
        setIsAdmin(admin);
      }

      // Clear the form and any leftover errors on success
      setErrors({});
      setFormData({ email: '', password: '' });
      setSubmitted(true);
    } catch (error) {
      let msg = "Invalid email or password.";
      if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
      if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";

      setErrors({ firebase: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrors({});

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        name: result.user.displayName || '',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
        provider: 'google',
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const admin = await checkIsAdmin(result.user.uid);
      setIsAdmin(admin);

      setErrors({});
      setFormData({ email: '', password: '' });
      setSubmitted(true);
    } catch (error) {
      console.error("Google Login Error:", error);
      let msg = "Google sign-in failed. Please try again.";

      if (error.code === 'auth/popup-blocked')
        msg = "Popup blocked by browser. Please allow popups.";
      else if (error.code === 'auth/popup-closed-by-user')
        msg = "Sign-in was cancelled.";

      setErrors({ firebase: msg });
    } finally {
      setGoogleLoading(false);
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
            Welcome<br />
            <span className="title-brand">Back</span>
          </h2>
          <p className="visual-sub">
            Your brew is waiting.<br />
            Log in and pick up right where you left off.
          </p>
          <ul className="visual-perks">
            <li><span className="perk-icon">⚡</span>View your order history</li>
            <li><span className="perk-icon">☕</span>Reorder your favourites</li>
            <li><span className="perk-icon">🎯</span>Check loyalty points</li>
            <li><span className="perk-icon">🚀</span>Faster checkout every time</li>
          </ul>
        </div>

        <div className="visual-badge">
          <div className="badge-num">24/7</div>
          <div className="badge-text">Always Open</div>
        </div>
      </div>

      <div className="auth-form-side">
        {submitted ? (
          <div className="success-state">
            <div className="success-icon">☕</div>
            <h2>Welcome<br /><em>Back!</em></h2>
            <p>
              {isAdmin
                ? <>You're logged in as <em>Admin</em>.</>
                : <>Good to see you again.<br />Your brews are waiting.</>}
            </p>

            {isAdmin ? (
              <button
                className="primary-btn"
                onClick={() => navigate('/admin')}
              >
                <span>Go to Admin Panel →</span>
              </button>
            ) : (
              <a href="/order" className="primary-btn"><span>Order Now →</span></a>
            )}

            <a href="/menu" className="ghost-btn"><span>Explore Menu ☕</span></a>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-header">
              <p className="section-tag">Welcome Back</p>
              <h1 className="form-title">Log <em>In</em></h1>
            </div>

            {errors.firebase && (
              <p className="error-msg firebase-error">{errors.firebase}</p>
            )}

            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <span className="google-icon">G</span>
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <div className={`input-group ${errors.email ? 'has-error' : ''}`}>
              <label htmlFor="lg-email">Email Address</label>
              <div className="input-wrap">
                <span className="input-icon">✉️</span>
                <input
                  id="lg-email"
                  type="email"
                  placeholder="you@levelupbrew.in"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>

            <div className={`input-group ${errors.password ? 'has-error' : ''}`}>
              <label htmlFor="lg-pass">Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  id="lg-pass"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="show-pass"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <p className="error-msg">{errors.password}</p>}
            </div>

            <div className="forgot-row">
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>

            <button
              type="submit"
              className="primary-btn submit-btn"
              disabled={loading}
            >
              <span>{loading ? "Logging in..." : "Log In →"}</span>
            </button>

            <p className="switch-text">
              Don't have an account?{' '}
              <Link to="/signup" className="switch-link">Sign Up</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
//   Forget Password Karine Spam , Inbox , Trash Mail Check Karvo


//    Customer Username : -     patidar@gmail.com

//    Password          : -     Datt19#92005



//Admin Page Access Email ID And Password

//User Name : - adminkaka@levelupbrew.in

//Password  : - Admin@123


// Test Mode  Cradidt Card Number  :  -  4100 2800 0000 1007   /  2223003122003222   /  378282246310005   /   371449635398431
//                                   
//                                       6205500000000000004           5/27     187 