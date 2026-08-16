import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Profile.css';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Payment method labels + colors (kept inside the same warm coffee palette
// as the rest of the site, just tinted differently per method)
const PAYMENT_META = {
  card: { label: 'Card', className: 'pay-card' },
  cod: { label: 'Cash on Delivery', className: 'pay-cod' },
  other: { label: 'Other', className: 'pay-other' },
};

// OrderOnline.jsx saves paymentMethod as the literal string 'Razorpay' or
// 'Cash on Delivery' — not the short 'card'/'cod' keys — so normalize
// before looking up the badge style, or every order shows as "Other".
const getPaymentMeta = (method) => {
  const m = (method || '').toLowerCase();
  if (m.includes('razorpay') || m.includes('card')) return PAYMENT_META.card;
  if (m.includes('cash') || m.includes('cod')) return PAYMENT_META.cod;
  return PAYMENT_META.other;
};

// ── Token redemption tiers (mirrors OrderOnline.jsx) — used here only
// to render the progress bar + "next reward" markers, no redemption
// logic happens on this page. ──
const TOKEN_TIER_STEPS = [
  { amount: 500, label: '10% Off' },
  { amount: 1000, label: '20% Off' },
  { amount: 1500, label: '35% Off' },
  { amount: 2000, label: 'Free Coffee' },
];

const emptyProfile = {
  name: '',
  username: '',
  dob: '',
  address: '',
  phone: '',
  email: '',
  photoURL: '',
};

const emptyRewards = { wallet: 0, tokens: 0, referralCount: 0 };

const Profile = () => {
  const [user, authLoading] = useAuthState(auth);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(emptyProfile);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Gift cards / rewards state ──
  const [rewards, setRewards] = useState(emptyRewards);
  const [copied, setCopied] = useState(false);
  // The referral link stays hidden behind a "Grab Referral Link" button
  // until clicked — keeps the card clean and avoids the raw link just
  // sitting in the DOM/page for anyone glancing at it.
  const [showReferral, setShowReferral] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ── Feedback modal state (order rating: taste, presentation etc.) ──
  // feedbackOrder holds the order currently being rated, or null when
  // the modal is closed. Kept separate from `orders` so typing a
  // comment doesn't re-render the whole order list on every keystroke.
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // ── Cursor dot/ring + scroll fade-in, matching Menu.jsx / OrderOnline.jsx ──
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

  // Redirect out if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Load profile from Firestore
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const loaded = {
            name: data.name || user.displayName || '',
            username: data.username || '',
            dob: data.dob || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || user.email || '',
            photoURL: data.photoURL || user.photoURL || '',
          };
          if (!cancelled) {
            setProfile(loaded);
            setDraft(loaded);
            setRewards({
              wallet: typeof data.wallet === 'number' ? data.wallet : 0,
              tokens: typeof data.tokens === 'number' ? data.tokens : 0,
              referralCount: typeof data.referralCount === 'number' ? data.referralCount : 0,
            });
          }
        } else {
          const fallback = {
            ...emptyProfile,
            name: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
          };
          if (!cancelled) {
            setProfile(fallback);
            setDraft(fallback);
            setRewards(emptyRewards);
          }
        }
      } catch (err) {
        console.error('Profile load failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => { cancelled = true; };
  }, [user]);

  // Load order + payment history
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        // No orderBy here on purpose — combining where() + orderBy() on
        // different fields needs a Firestore composite index. Sorting
        // client-side avoids that setup step entirely.
        // NOTE: field is 'userId' (not 'uid') — must match both the
        // Firestore security rules and whatever OrderOnline.jsx saves
        // on the order document, or this query silently returns nothing.
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return bTime - aTime;
          });
        if (!cancelled) setOrders(list);
      } catch (err) {
        console.error('Orders load failed:', err);
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    };

    loadOrders();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const hoverTargets = document.querySelectorAll(
      'button, a, .photo-dropzone, .order-item, .order-line-item, .feedback-star'
    );
    hoverTargets.forEach((el) => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', rmvHover);
    });

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      hoverTargets.forEach((el) => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', rmvHover);
      });
      observer.disconnect();
    };
    // Re-scan whenever orders/edit-mode/feedback-modal render new DOM
    // nodes that need hover/fade-in wiring.
  }, [onMouseMove, addHover, rmvHover, orders, editMode, loading, ordersLoading, feedbackOrder]);

  const displayName = profile.name || user?.displayName || user?.email?.split('@')[0] || 'Brewer';

  const handleFieldChange = (field) => (e) => {
    setDraft((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const startEdit = () => {
    setDraft(profile);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditMode(false);
  };

  const saveEdit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { ...draft }, { merge: true });
      setProfile(draft);
      setEditMode(false);
    } catch (err) {
      console.error('Profile save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Photo drag & drop ──
  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Firestore documents cap out at 1MB, and a straight-from-camera photo
  // easily blows past that as a base64 string — saving it would then
  // throw and the photo would silently never save. Downscaling to a
  // small square first keeps every upload well under the limit.
  const resizeImage = (file, maxSize = 300, quality = 0.85) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const [photoError, setPhotoError] = useState('');

  const applyPhoto = async (file) => {
    if (!file || !file.type.startsWith('image/') || !user) return;
    setPhotoError('');
    try {
      const dataUrl = await resizeImage(file);

      // Belt-and-braces check: Firestore fields max out around 1MB.
      // A resized JPEG should land far below this, but guard anyway.
      const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
      if (approxBytes > 900 * 1024) {
        setPhotoError('Image is too large even after compression — try a smaller photo.');
        return;
      }

      // Stored directly on the user doc as a data URL for simplicity.
      // Swap this for a Firebase Storage upload + getDownloadURL if you'd
      // rather keep Firestore documents small.
      // setDoc + merge (not updateDoc) so this also works the very first
      // time — updateDoc throws if the users/{uid} doc doesn't exist yet.
      await setDoc(doc(db, 'users', user.uid), { photoURL: dataUrl }, { merge: true });
      setProfile((prev) => ({ ...prev, photoURL: dataUrl }));
      setDraft((prev) => ({ ...prev, photoURL: dataUrl }));
    } catch (err) {
      console.error('Photo upload failed:', err);
      setPhotoError('Photo upload failed — please try again.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    applyPhoto(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    applyPhoto(file);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const d = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Order docs may or may not carry their own snapshot of shipping/contact
  // info (captured at checkout time). If they don't, we fall back to the
  // user's current profile so the order card is never left blank.
  const getOrderContact = (order) => ({
    name: order.customerName || order.name || profile.name || displayName,
    address: order.address || order.shippingAddress || profile.address || '—',
    phone: order.phone || profile.phone || '—',
    email: order.email || profile.email || '—',
  });

  // ── Referral link + copy-to-clipboard ──
  const referralLink = user ? `${window.location.origin}/signup?ref=${user.uid}` : '';

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Highest tier the user has already unlocked (for the progress bar's
  // "next" target — caps at the top tier so the bar doesn't overflow).
  const nextTierAmount = TOKEN_TIER_STEPS.find((t) => rewards.tokens < t.amount)?.amount
    ?? TOKEN_TIER_STEPS[TOKEN_TIER_STEPS.length - 1].amount;
  const progressPercent = Math.min(100, Math.round((rewards.tokens / nextTierAmount) * 100));

  // ── Feedback: open modal for a specific order ──
  const openFeedback = (order) => {
    setFeedbackOrder(order);
    setFeedbackRating(0);
    setFeedbackHoverRating(0);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
  };

  const closeFeedback = () => {
    if (submittingFeedback) return; // don't let them close mid-submit
    setFeedbackOrder(null);
  };

  // Saves to a NEW 'feedback' collection (separate from 'orders' so the
  // admin panel can list/sort/average all feedback without scanning every
  // order). Also flags the order itself with feedbackGiven: true so the
  // "Rate your order" button doesn't show again for this order.
  const submitFeedback = async () => {
    if (!feedbackOrder || !user || feedbackRating === 0) return;
    setSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        orderId: feedbackOrder.id,
        userId: user.uid,
        customerName: profile.name || displayName,
        items: (feedbackOrder.items || []).map((i) => i.name).filter(Boolean),
        rating: feedbackRating,
        comment: feedbackComment.trim(),
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'orders', feedbackOrder.id), { feedbackGiven: true });

      // Update local state immediately so the button disappears without
      // needing to re-fetch the whole order list.
      setOrders((prev) =>
        prev.map((o) => (o.id === feedbackOrder.id ? { ...o, feedbackGiven: true } : o))
      );

      setFeedbackSubmitted(true);
      // Auto-close shortly after showing the "thanks" state.
      setTimeout(() => setFeedbackOrder(null), 1400);
    } catch (err) {
      console.error('Feedback submit failed:', err);
      alert('Could not submit your feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Brewing your profile…</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />
      <div className="container profile-container">

        {/* ── Photo + identity header ── */}
        <div className="profile-header fade-in">
          <div
            className={`photo-dropzone ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={displayName} className="avatar-img-lg" />
            ) : (
              <span className="avatar-initials-lg">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="photo-overlay">
              <span>Drag &amp; drop or click to change photo</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-file-input"
              onChange={handleFileSelect}
            />
          </div>

          <div className="profile-heading">
            <h1 className="profile-name">Hey, {displayName}!</h1>
            <p className="profile-sub">{profile.email}</p>
            {photoError && <p className="photo-error">{photoError}</p>}
          </div>
        </div>

        {/* ── Editable details card ── */}
        <div className="profile-card fade-in">
          <div className="profile-card-head">
            <h2>My Details</h2>
            {!editMode ? (
              <button className="nav-link signup-btn" onClick={startEdit}>
                Edit Profile
              </button>
            ) : (
              <div className="edit-actions">
                <button className="nav-link login-btn" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <button className="nav-link signup-btn" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div className="profile-fields">
            <div className="field-group">
              <label>Full Name</label>
              {editMode ? (
                <input value={draft.name} onChange={handleFieldChange('name')} placeholder="Your name" />
              ) : (
                <p>{profile.name || '—'}</p>
              )}
            </div>

            <div className="field-group">
              <label>Username</label>
              {editMode ? (
                <input value={draft.username} onChange={handleFieldChange('username')} placeholder="username" />
              ) : (
                <p>{profile.username ? `@${profile.username}` : '—'}</p>
              )}
            </div>

            <div className="field-group">
              <label>Date of Birth</label>
              {editMode ? (
                <input type="date" value={draft.dob} onChange={handleFieldChange('dob')} />
              ) : (
                <p>{profile.dob || '—'}</p>
              )}
            </div>

            <div className="field-group">
              <label>Phone Number</label>
              {editMode ? (
                <input value={draft.phone} onChange={handleFieldChange('phone')} placeholder="+91 9xxxxxxxxx" />
              ) : (
                <p>{profile.phone || '—'}</p>
              )}
            </div>

            <div className="field-group">
              <label>Email</label>
              {editMode ? (
                <input type="email" value={draft.email} onChange={handleFieldChange('email')} placeholder="you@example.com" />
              ) : (
                <p>{profile.email || '—'}</p>
              )}
            </div>

            <div className="field-group field-wide">
              <label>Address</label>
              {editMode ? (
                <textarea
                  value={draft.address}
                  onChange={handleFieldChange('address')}
                  placeholder="Flat / Street / City / Pincode"
                  rows={3}
                />
              ) : (
                <p>{profile.address || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Rewards & Referrals card ── */}
        <div className="profile-card rewards-card fade-in">
          <div className="profile-card-head">
            <h2>Rewards &amp; Referrals</h2>
          </div>

          <div className="rewards-grid">
            <div className="reward-box">
              <p className="reward-label">Wallet Balance</p>
              <h3 className="reward-value">₹{rewards.wallet}</h3>
              <p className="reward-note">Auto-applied at checkout</p>
            </div>
            <div className="reward-box">
              <p className="reward-label">Tokens</p>
              <h3 className="reward-value">{rewards.tokens}</h3>
              <p className="reward-note">5 tokens per coffee ordered</p>
            </div>
            <div className="reward-box">
              <p className="reward-label">Friends Referred</p>
              <h3 className="reward-value">{rewards.referralCount}</h3>
              <p className="reward-note">₹50 earned per referral</p>
            </div>
          </div>

          <div className="token-progress-wrap">
            <div className="token-progress-labels">
              <span>{rewards.tokens} tokens</span>
              <span>Next reward at {nextTierAmount}</span>
            </div>
            <div className="token-progress-bar">
              <div className="token-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="token-tier-markers">
              {TOKEN_TIER_STEPS.map((tier) => (
                <span
                  key={tier.amount}
                  className={rewards.tokens >= tier.amount ? 'tier-reached' : ''}
                >
                  {tier.amount} → {tier.label}
                </span>
              ))}
            </div>
          </div>

          <div className="referral-box">
            <p className="reward-label">Refer a Friend</p>

            {!showReferral ? (
              <button
                type="button"
                className="nav-link signup-btn referral-reveal-btn"
                onClick={() => setShowReferral(true)}
              >
                🎁 Grab Your Referral Link
              </button>
            ) : (
              <>
                <div className="referral-input-row">
                  <input
                    readOnly
                    className="referral-input"
                    value={referralLink}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="nav-link signup-btn referral-copy-btn"
                    onClick={copyReferralLink}
                  >
                    {copied ? 'Copied ✓' : 'Copy Link'}
                  </button>
                </div>
                <p className="referral-hint">
                  Share this link — you earn ₹50 for every friend who signs up using it.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Orders + payment history ── */}
        <div className="profile-card orders-card fade-in">
          <div className="profile-card-head">
            <h2>My Orders</h2>
          </div>

          {ordersLoading ? (
            <p className="orders-empty">Loading your orders…</p>
          ) : orders.length === 0 ? (
            <p className="orders-empty">No orders yet — go treat yourself ☕</p>
          ) : (
            <ul className="orders-list">
              {orders.map((order, orderIdx) => {
                const meta = getPaymentMeta(order.paymentMethod);
                const items = order.items || [];
                const contact = getOrderContact(order);
                const status = (order.status || 'placed').toLowerCase();
                const canRate = status === 'completed' && !order.feedbackGiven;

                return (
                  <li
                    key={order.id}
                    className="order-item order-item-full fade-in"
                    style={{ transitionDelay: `${(orderIdx % 8) * 0.07}s` }}
                  >
                    {/* Order header */}
                    <div className="order-main">
                      <span className="order-id">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                      <span className={`status-badge status-${status}`}>
                        {order.status || 'Placed'}
                      </span>
                    </div>

                    {/* Item-by-item breakdown: image, name, qty, price */}
                    <div className="order-items-detailed">
                      {items.length === 0 ? (
                        <p className="order-items-empty">Order details unavailable</p>
                      ) : (
                        items.map((it, idx) => (
                          <div className="order-line-item" key={it.id || `${order.id}-${idx}`}>
                            <img
                              src={it.img || it.image || it.photoURL || '/coffee-placeholder.png'}
                              alt={it.name || 'Coffee item'}
                              className="order-line-img"
                              onError={(e) => { e.currentTarget.src = '/coffee-placeholder.png'; }}
                            />
                            <div className="order-line-info">
                              <span className="order-line-name">{it.name || 'Unnamed item'}</span>
                              <span className="order-line-qty">Qty: {it.quantity ?? it.qty ?? 1}</span>
                            </div>
                            <span className="order-line-price">
                              ₹{it.price ?? 0}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Reward breakdown, if this order used wallet/tokens */}
                    {(order.walletUsed > 0 || order.tokenDiscount > 0 || order.tokensEarned > 0) && (
                      <div className="order-rewards-line">
                        {order.subtotal ? <span>Subtotal: ₹{order.subtotal}</span> : null}
                        {order.tokenDiscount > 0 && <span>Token Discount: −₹{order.tokenDiscount}</span>}
                        {order.walletUsed > 0 && <span>Wallet Used: −₹{order.walletUsed}</span>}
                        {order.tokensEarned > 0 && <span>🪙 Earned: +{order.tokensEarned}</span>}
                      </div>
                    )}

                    {/* Shipping / contact snapshot for this order */}
                    <div className="order-contact-grid">
                      <div className="order-contact-field">
                        <label>Name</label>
                        <p>{contact.name}</p>
                      </div>
                      <div className="order-contact-field">
                        <label>Phone</label>
                        <p>{contact.phone}</p>
                      </div>
                      <div className="order-contact-field">
                        <label>Email</label>
                        <p>{contact.email}</p>
                      </div>
                      <div className="order-contact-field order-contact-wide">
                        <label>Delivery Address</label>
                        <p>{contact.address}</p>
                      </div>
                    </div>

                    {/* Payment + total footer */}
                    <div className="order-footer">
                      <span className={`pay-badge ${meta.className}`}>{meta.label}</span>
                      <span className="order-total">Total: ₹{order.total ?? order.amount ?? '0'}</span>
                    </div>

                    {/* Feedback CTA — only for completed orders not yet rated */}
                    {canRate && (
                      <div className="order-feedback-cta">
                        <button className="nav-link signup-btn" onClick={() => openFeedback(order)}>
                          ⭐ Rate this order
                        </button>
                      </div>
                    )}
                    {status === 'completed' && order.feedbackGiven && (
                      <p className="order-feedback-done">✓ Thanks — you've rated this order</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Feedback Modal ── */}
      {feedbackOrder && (
        <div className="details-overlay" onClick={closeFeedback}>
          <div className="details-modal feedback-modal" onClick={(e) => e.stopPropagation()}>
            <button className="details-close" onClick={closeFeedback}>✕</button>

            {feedbackSubmitted ? (
              <div className="feedback-thanks">
                <div className="success-icon">☕</div>
                <h2>Thank <em>You!</em></h2>
                <p>Your feedback helps us brew it better next time.</p>
              </div>
            ) : (
              <div className="details-body">
                <p className="category-tag">Order #{feedbackOrder.id.slice(-6).toUpperCase()}</p>
                <h2>How was your coffee?</h2>

                <div className="feedback-stars" role="radiogroup" aria-label="Rate your order">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="feedback-star"
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                      onMouseEnter={() => setFeedbackHoverRating(star)}
                      onMouseLeave={() => setFeedbackHoverRating(0)}
                      onClick={() => setFeedbackRating(star)}
                    >
                      {(feedbackHoverRating || feedbackRating) >= star ? '★' : '☆'}
                    </button>
                  ))}
                </div>

                <textarea
                  className="form-input form-textarea feedback-comment"
                  placeholder="Optional: tell us more — too sweet, too cold, perfect, etc."
                  rows={3}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                />

                <button
                  className="primary-btn"
                  disabled={feedbackRating === 0 || submittingFeedback}
                  onClick={submitFeedback}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {submittingFeedback ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;