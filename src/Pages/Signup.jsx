import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import './Signup.css';

// ── Why this check exists ──
// signInWithPopup is unreliable on mobile browsers: popups get blocked,
// silently closed, or fail with a generic error. Firebase's own docs
// recommend signInWithRedirect on mobile. This just checks the device
// type so we can pick the right method automatically.
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent);
};

// ── Generates a strong password using the browser's CRYPTOGRAPHIC random
// number generator (crypto.getRandomValues), not Math.random(). Math.random()
// is predictable and not meant for anything security-related. This guarantees
// at least one lowercase, one uppercase, one number, and one symbol, then
// fills the rest randomly and shuffles (also using crypto random).
function generateSecurePassword(length = 12) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  const symbols = '!@#$%^&*';
  const all = lower + upper + nums + symbols;

  const randomChar = (charset) => {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return charset[arr[0] % charset.length];
  };

  let chars = [
    randomChar(lower),
    randomChar(upper),
    randomChar(nums),
    randomChar(symbols),
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(randomChar(all));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

const Signup = () => {
  const navigate = useNavigate();
  const [user, loading] = useAuthState(auth);

  const [showPass, setShowPass]           = useState(false);
  const [formLoading, setFormLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors]               = useState({});
  const [formData, setFormData]           = useState({ name: '', email: '', password: '', confirm: '' });

  // ── Password choice popup state ──
  const [showPwdPopup, setShowPwdPopup]   = useState(false);
  const [pwdChoiceMade, setPwdChoiceMade] = useState(false);
  const pwdBoxRef = useRef(null);

  const dotRef  = useRef(null);
  const ringRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (dotRef.current)  { dotRef.current.style.left  = `${e.clientX}px`; dotRef.current.style.top  = `${e.clientY}px`; }
    if (ringRef.current) { ringRef.current.style.left = `${e.clientX}px`; ringRef.current.style.top = `${e.clientY}px`; }
  }, []);

  const addHover = useCallback(() => ringRef.current?.classList.add('hovered'), []);
  const rmvHover = useCallback(() => ringRef.current?.classList.remove('hovered'), []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    const targets = document.querySelectorAll('button, a, input, .visual-perks li');
    targets.forEach(el => { el.addEventListener('mouseenter', addHover); el.addEventListener('mouseleave', rmvHover); });
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      targets.forEach(el => { el.removeEventListener('mouseenter', addHover); el.removeEventListener('mouseleave', rmvHover); });
    };
  }, [onMouseMove, addHover, rmvHover]);

  // ── Close the popup if user clicks anywhere outside the password box ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pwdBoxRef.current && !pwdBoxRef.current.contains(e.target)) {
        setShowPwdPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveUserAndGo = async (firebaseUser) => {
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || formData.name.trim() || 'Google User',
      email: firebaseUser.email || formData.email.trim(),
      photoURL: firebaseUser.photoURL || '',
      provider: 'google',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    navigate('/');
  };

  // ── Runs once when the page loads. Catches the user coming BACK from
  // Google after a redirect-based sign-up (used on mobile). Without this,
  // a mobile user would be sent to Google, sent back, and nothing would
  // happen — because the popup flow never fires on redirect. ──
  useEffect(() => {
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          setGoogleLoading(true);
          await saveUserAndGo(result.user);
        }
      } catch (error) {
        console.error('Google redirect sign-up error:', error);
        setErrors({ firebase: 'Google sign-in failed. Please try again.' });
      } finally {
        setGoogleLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── If already logged in → go to Home ──
  if (loading) {
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
          Brewing your session...
        </p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim())                            newErrors.name     = 'Full name is required';
    if (!formData.email || !formData.email.includes('@')) newErrors.email    = 'Please enter a valid email address';
    if (formData.password.length < 6)                    newErrors.password = 'Password must be at least 6 characters long';
    if (formData.password !== formData.confirm)          newErrors.confirm  = 'Passwords do not match';
    return newErrors;
  };

  // ── Click/focus on password box → open popup, but only if user hasn't
  // already chosen and the field is still empty ──
  const handlePasswordBoxClick = () => {
    if (!pwdChoiceMade && formData.password === '') {
      setShowPwdPopup(true);
    }
  };

  // ── Option 1: Generate ──
  const handleGenerateClick = () => {
    const pwd = generateSecurePassword(12);
    setFormData(prev => ({ ...prev, password: pwd, confirm: pwd }));
    setShowPass(true);
    setShowPwdPopup(false);
    setPwdChoiceMade(true);
    setErrors(prev => ({ ...prev, password: undefined, confirm: undefined }));
  };

  // ── Option 2: Write own — just close the popup, let them type ──
  const handleWriteOwnClick = () => {
    setShowPwdPopup(false);
    setPwdChoiceMade(true);
  };

  /* ── Email signup ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }

    setErrors({});
    setFormLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await updateProfile(userCredential.user, { displayName: formData.name.trim() });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: formData.name.trim(),
        email: formData.email.trim(),
        provider: 'password',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      navigate('/');
    } catch (error) {
      let msg = 'Something went wrong. Please try again.';
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
      else if (error.code === 'auth/weak-password')   msg = 'Password is too weak.';
      setErrors({ firebase: msg });
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Google signup ── */
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrors({});
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Mobile: redirect flow (page navigates to Google and back — no popup).
    // The result is picked up by the getRedirectResult useEffect above.
    if (isMobileDevice()) {
      try {
        await signInWithRedirect(auth, provider);
        // Execution stops here — browser navigates away.
      } catch (error) {
        console.error('Google redirect start error:', error);
        setErrors({ firebase: 'Google sign-in failed. Please try again.' });
        setGoogleLoading(false);
      }
      return;
    }

    // Desktop: popup flow (unchanged, works fine here).
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserAndGo(result.user);
    } catch (error) {
      let msg = 'Google sign-in failed. Please try again.';
      if (error.code === 'auth/popup-blocked')                msg = 'Popup was blocked. Please allow popups and try again.';
      else if (error.code === 'auth/cancelled-popup-request') msg = 'Sign-in cancelled.';
      setErrors({ firebase: msg });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="cursor-dot"  ref={dotRef}  />
      <div className="cursor-ring" ref={ringRef} />

      {/* ── Visual side ── */}
      <div className="auth-visual">
        <img src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=80" alt="Coffee atmosphere" className="auth-bg-img" />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <p className="visual-eyebrow"><span />LevelUP Brew</p>
          <h2 className="visual-title">Join the<br /><span className="title-brand">Crew</span></h2>
          <p className="visual-sub">Surat's favourite tech-café community.<br />Order faster. Earn rewards. Brew more.</p>
          <ul className="visual-perks">
            <li><span className="perk-icon">⚡</span>Exclusive member discounts</li>
            <li><span className="perk-icon">☕</span>Priority order queue</li>
            <li><span className="perk-icon">🎯</span>Loyalty reward points</li>
            <li><span className="perk-icon">🚀</span>Early access to new brews</li>
          </ul>
        </div>
        <div className="visual-badge">
          <div className="badge-num">★ 4.9</div>
          <div className="badge-text">Member Rating</div>
        </div>
      </div>

      {/* ── Form side ── */}
      <div className="auth-form-side">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-header">
            <p className="section-tag">Get Started</p>
            <h1 className="form-title">Create <em>Account</em></h1>
          </div>

          {errors.firebase && <p className="error-msg firebase-error">{errors.firebase}</p>}

          <button type="button" className="google-btn" onClick={handleGoogleSignIn} disabled={googleLoading}>
            <span className="google-icon">G</span>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="divider"><span>OR</span></div>

          <div className={`input-group ${errors.name ? 'has-error' : ''}`}>
            <label htmlFor="name">Full Name</label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input id="name" type="text" placeholder="Admin Brewster" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            {errors.name && <p className="error-msg">{errors.name}</p>}
          </div>

          <div className={`input-group ${errors.email ? 'has-error' : ''}`}>
            <label htmlFor="email">Email Address</label>
            <div className="input-wrap">
              <span className="input-icon">✉️</span>
              <input id="email" type="email" placeholder="you@levelupbrew.in" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            {errors.email && <p className="error-msg">{errors.email}</p>}
          </div>

          {/* ── Password field with click-to-open choice popup ── */}
          <div className={`input-group ${errors.password ? 'has-error' : ''}`} ref={pwdBoxRef}>
            <label htmlFor="password">Password</label>
            <div className="input-wrap pwd-input-wrap">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onFocus={handlePasswordBoxClick}
                onClick={handlePasswordBoxClick}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button type="button" className="show-pass" onClick={() => setShowPass(!showPass)}>
                {showPass ? '🙈' : '👁️'}
              </button>

              {/* ── The popup itself ── */}
              {showPwdPopup && (
                <div className="pwd-popup">
                  <p className="pwd-popup-title">How would you like to set your password?</p>
                  <div className="pwd-popup-actions">
                    <button type="button" className="pwd-popup-btn pwd-popup-generate" onClick={handleGenerateClick}>
                      🎲 Generate Password
                    </button>
                    <button type="button" className="pwd-popup-btn pwd-popup-own" onClick={handleWriteOwnClick}>
                      ✏️ Write My Own
                    </button>
                  </div>
                </div>
              )}
            </div>
            {errors.password && <p className="error-msg">{errors.password}</p>}
          </div>

          <div className={`input-group ${errors.confirm ? 'has-error' : ''}`}>
            <label htmlFor="confirm">Confirm Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔑</span>
              <input id="confirm" type={showPass ? 'text' : 'password'} placeholder="Repeat your password"
                value={formData.confirm} onChange={(e) => setFormData({ ...formData, confirm: e.target.value })} />
            </div>
            {errors.confirm && <p className="error-msg">{errors.confirm}</p>}
          </div>

          <button type="submit" className="primary-btn submit-btn" disabled={formLoading}>
            <span>{formLoading ? 'Creating Account...' : 'Create Account →'}</span>
          </button>

          <p className="switch-text">
            Already a member?{' '}
            <a href="/login" className="switch-link">Log In</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;