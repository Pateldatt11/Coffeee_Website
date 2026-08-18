import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, collection, serverTimestamp, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import useRazorpay from '../hooks/useRazorpay';
import { auth, db } from '../firebase';
import { coffeeMenu } from '../data/menuData'; // fallback only, used until Firestore 'menu' is seeded
import { generateBillPDF } from '../utils/generateBill';
import './OrderOnline.css';

const paymentMethods = [
  { id: 'razorpay', name: 'Razorpay (UPI / Card / Wallet)', icon: '💳', recommended: true },
  { id: 'cod',       name: 'Cash on Delivery',               icon: '💵' },
];

// ── Token redemption tiers ──
// Checked highest-first so a user sitting on e.g. 1600 tokens gets
// offered the 1500-token/35%-off tier (the best one they can afford),
// not the 500-token tier.
const TOKEN_TIERS = [
  { min: 2000, cost: 2000, percent: 100, label: 'Free Coffee (2000 tokens)' },
  { min: 1500, cost: 1500, percent: 35,  label: '35% Off (1500 tokens)' },
  { min: 1000, cost: 1000, percent: 20,  label: '20% Off (1000 tokens)' },
  { min: 500,  cost: 500,  percent: 10,  label: '10% Off (500 tokens)' },
];

// Key used to hand off a customized item from CustomizeCoffee.jsx back
// into this page's cart (see the pickup effect near the top of the
// component). Kept as a constant so both files can stay in sync.
const PENDING_CART_KEY = 'brewhaven_pending_cart_item';

// Key used to hand off a BATCH of items from Wishlist.jsx (via the
// "Add to Cart" / "Add All to Cart" buttons there) into this page's
// cart. Same idea as PENDING_CART_KEY above but holds an array, since
// more than one favorite can be queued up at once.
const PENDING_WISHLIST_CART_KEY = 'brewhaven_pending_wishlist_cart_items';

// Minimal inline theme so this works even without touching OrderOnline.css.
// Colors match the same palette used across Nav.css / Profile.css.
const rewardStyles = {
  wrap: {
    marginTop: '1.2rem',
    marginBottom: '1.2rem',
    padding: '1.1rem 1.2rem',
    background: 'rgba(212, 163, 115, 0.07)',
    border: '1px solid rgba(201, 149, 108, 0.25)',
    borderRadius: '10px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.88rem',
    color: '#e0c9a6',
    marginBottom: '0.5rem',
  },
  note: { color: '#a89070', fontSize: '0.75rem' },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.85rem',
    color: '#e0c9a6',
    marginTop: '0.6rem',
    cursor: 'pointer',
  },
  summary: {
    marginTop: '0.8rem',
    paddingTop: '0.8rem',
    borderTop: '1px dashed rgba(201, 149, 108, 0.3)',
    fontSize: '0.85rem',
    color: '#cbb89a',
  },
  finalLine: {
    color: '#e0c9a6',
    fontWeight: 700,
    fontSize: '1rem',
    marginTop: '0.3rem',
  },
};

const OrderOnline = () => {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('razorpay');
  const [user] = useAuthState(auth);

  // FIX: if the payment succeeded but we could NOT save the order to
  // Firestore, we show a different, honest state instead of a fake
  // "Order Placed" success — the customer already paid, so they need
  // their payment ID to get this manually resolved, not a lie.
  const [saveFailed, setSaveFailed] = useState(false);

  // Holds the order data used to generate the downloadable bill.
  // Built locally (not re-fetched from Firestore) so the "Download Bill"
  // button works even in the saveFailed case, where nothing was saved.
  const [placedOrder, setPlacedOrder] = useState(null);

  // ================= REWARDS: wallet + tokens =================
  // Live-subscribed so a balance change elsewhere (e.g. a referral
  // bonus landing while this tab is open) reflects immediately.
  const [wallet, setWallet] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [useTokens, setUseTokens] = useState(false);

  useEffect(() => {
    if (!user) { setWallet(0); setTokens(0); return; }
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setWallet(typeof data.wallet === 'number' ? data.wallet : 0);
          setTokens(typeof data.tokens === 'number' ? data.tokens : 0);
        }
      },
      (err) => console.error('Wallet/token listener error:', err)
    );
    return () => unsub();
  }, [user]);

  // ================= MENU (live from Firestore) =================
  const [menuItems, setMenuItems] = useState(
    coffeeMenu.map((item, index) => ({ id: String(index + 1), ...item }))
  );

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        if (!snap.empty) {
          setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        // if empty, keep the static fallback already in state
      },
      (err) => console.error('Menu listener error:', err)
    );
    return () => unsub();
  }, []);

  const allCategories = ['All', ...new Set(menuItems.map(i => i.category))];

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', note: ''
  });

  const [paymentDetails, setPaymentDetails] = useState(null);

  const { initiatePayment, isProcessing, clearError } = useRazorpay();

  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // Merges a batch of incoming items into the current cart — if an item
  // with the same id already exists, its qty is bumped instead of adding
  // a duplicate row. Used by both pickup effects below.
  const mergeIntoCart = (prevCart, incomingItems) => {
    let next = [...prevCart];
    incomingItems.forEach((item) => {
      const idx = next.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        next[idx] = { ...next[idx], qty: next[idx].qty + (item.qty || 1) };
      } else {
        next = [...next, { ...item, qty: item.qty || 1 }];
      }
    });
    return next;
  };

  // ================= PICK UP A CUSTOMIZED ITEM =================
  // CustomizeCoffee.jsx stages one finished item in localStorage, then
  // navigates back here. On mount we grab it, drop it straight into the
  // cart, clear the staging key, and pop the cart open so the person
  // sees it landed. Runs once — customized items get their own unique
  // id (see CustomizeCoffee.jsx), so they never merge with a plain
  // "Add to Cart" entry of the same base coffee.
  //
  // ================= PICK UP WISHLIST → CART ITEMS =================
  // Wishlist.jsx queues one or more favorited items into
  // PENDING_WISHLIST_CART_KEY (as an array) before navigating here, via
  // its "Add to Cart" / "Add All to Cart" buttons. Same pickup-on-mount
  // pattern as above, just for a batch instead of a single item.
  useEffect(() => {
    let gotSomething = false;

    try {
      const pending = localStorage.getItem(PENDING_CART_KEY);
      if (pending) {
        const pendingItem = JSON.parse(pending);
        setCart((prev) => mergeIntoCart(prev, [pendingItem]));
        gotSomething = true;
      }
    } catch (err) {
      console.error('Could not restore customized item:', err);
    } finally {
      localStorage.removeItem(PENDING_CART_KEY);
    }

    try {
      const pendingBatch = localStorage.getItem(PENDING_WISHLIST_CART_KEY);
      if (pendingBatch) {
        const items = JSON.parse(pendingBatch);
        if (Array.isArray(items) && items.length > 0) {
          setCart((prev) => mergeIntoCart(prev, items));
          gotSomething = true;
        }
      }
    } catch (err) {
      console.error('Could not restore wishlist cart items:', err);
    } finally {
      localStorage.removeItem(PENDING_WISHLIST_CART_KEY);
    }

    if (gotSomething) setCartOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const hoverTargets = document.querySelectorAll('button, a, .order-card, .filter-btn, .payment-option');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', rmvHover);
    });

    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      hoverTargets.forEach(el => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', rmvHover);
      });
      observer.disconnect();
    };
  }, [onMouseMove, addHover, rmvHover, activeCategory, menuItems]);

  const addToCart = (item) => {
    setCart(prev => {
      const exists = prev.find(c => c.id === item.id);
      if (exists) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const goToCustomize = (item) => {
    navigate(`/customize/${item.id}`, { state: { item } });
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
        .filter(c => c.qty > 0)
    );
  };

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  // ── Reward math ──
  // Best tier the user can currently afford with their token balance.
  const bestTier = TOKEN_TIERS.find(t => tokens >= t.min) || null;
  const tokenDiscountAmount = (useTokens && bestTier)
    ? Math.round((totalPrice * bestTier.percent) / 100)
    : 0;
  const afterTokenDiscount = Math.max(0, totalPrice - tokenDiscountAmount);
  // Wallet always auto-applies (up to whatever's left to pay) — no toggle needed.
  const walletApplied = Math.min(wallet, afterTokenDiscount);
  const finalTotal = Math.max(0, afterTokenDiscount - walletApplied);
  // 5 tokens earned per coffee (i.e. per unit quantity across the whole cart).
  const tokensEarned = totalItems * 5;

  const filtered = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  // Builds the plain-object snapshot used to render the downloadable bill.
  // Uses local state (cart, totals) rather than re-reading Firestore, so
  // it works even when the Firestore write itself failed (saveFailed case).
  const buildOrderForBill = (orderId, method, paymentId = '') => ({
    id: orderId,
    items: cart.map(item => ({
      name: item.name, price: item.price, qty: item.qty, img: item.img || '',
      customization: item.customization || null,
    })),
    subtotal: totalPrice,
    tokenDiscount: tokenDiscountAmount,
    walletUsed: walletApplied,
    tokensEarned,
    amount: finalTotal,
    paymentMethod: method,
    paymentId,
    createdAt: new Date(),
  });

  // FIX: previously this caught its own errors and did nothing further,
  // so the caller had no way to know the write failed. Now it re-throws,
  // so handleOrder can react properly instead of blindly showing success.
  // Also returns the new Firestore doc ID so the bill can reference it.
  const persistOrder = async ({ method, paymentId = '' }) => {
    const docRef = await addDoc(collection(db, 'orders'), {
      userId: user?.uid || null,
      customerName: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      note: formData.note,
      paymentMethod: method,
      paymentId,
      // Reward breakdown kept on the order doc so Profile.jsx / Adminpanel.jsx
      // can show exactly how much was wallet vs token vs actually paid.
      subtotal: totalPrice,
      tokenDiscount: tokenDiscountAmount,
      walletUsed: walletApplied,
      tokensEarned,
      amount: finalTotal,
      // FIX: added `img` so the order history (Profile.jsx) can show a
      // picture of what was ordered — previously only id/name/category/
      // price/qty were stored, so every order card fell back to a
      // placeholder image with no way to recover the real one.
      // Also carries `customization` (size/milk/roast/shot/sugar/straw)
      // when the item came through the Customize page, so past orders
      // remember exactly how it was made.
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        qty: item.qty,
        img: item.img || '',
        customization: item.customization || null,
      })),
      status: 'placed',
      createdAt: serverTimestamp()
    });

    // Settle the user's wallet + tokens for this order: deduct whatever
    // wallet/tokens were spent, credit the tokens earned from this purchase.
    if (user) {
      const tierTokensSpent = (useTokens && bestTier) ? bestTier.cost : 0;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          wallet: increment(-walletApplied),
          tokens: increment(tokensEarned - tierTokensSpent),
        });
      } catch (err) {
        // Order itself is already saved at this point — don't fail the
        // whole checkout over a rewards-ledger update issue, just log it.
        console.error('Wallet/token settlement failed:', err);
      }
    }

    return docRef.id;
  };

  const handleOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Cash on Delivery — no money has changed hands yet, but we still
    // want to know if the save failed instead of silently losing the order.
    if (selectedPayment === 'cod') {
      (async () => {
        try {
          const orderId = await persistOrder({ method: 'Cash on Delivery' });
          setSaveFailed(false);
          setPaymentDetails({ method: 'Cash on Delivery', amount: finalTotal });
          setPlacedOrder(buildOrderForBill(orderId, 'Cash on Delivery'));
          setOrderPlaced(true);
          setCartOpen(false);
        } catch (error) {
          console.error('Could not save order to Firestore:', error);
          alert('Something went wrong placing your order. Please try again, or contact us if the problem continues.');
        }
      })();
      return;
    }

    // Razorpay Payment
    if (selectedPayment === 'razorpay') {
      // Wallet/token discounts already cover the whole order — nothing
      // left to charge, so skip the payment gateway entirely.
      if (finalTotal <= 0) {
        (async () => {
          try {
            const orderId = await persistOrder({ method: 'Wallet/Tokens (Fully Covered)' });
            setSaveFailed(false);
            setPaymentDetails({ method: 'Wallet/Tokens (Fully Covered)', amount: 0 });
            setPlacedOrder(buildOrderForBill(orderId, 'Wallet/Tokens (Fully Covered)'));
            setOrderPlaced(true);
            setCartOpen(false);
          } catch (error) {
            console.error('Could not save order to Firestore:', error);
            alert('Something went wrong placing your order. Please try again, or contact us if the problem continues.');
          }
        })();
        return;
      }

      initiatePayment({
        amount: finalTotal,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        onSuccess: async (payment) => {
          try {
            const orderId = await persistOrder({
              method: 'Razorpay',
              paymentId: payment.paymentId
            });
            setSaveFailed(false);
            setPaymentDetails({
              method: 'Razorpay',
              paymentId: payment.paymentId,
              amount: payment.amount
            });
            setPlacedOrder(buildOrderForBill(orderId, 'Razorpay', payment.paymentId));
            setOrderPlaced(true);
            setCartOpen(false);
          } catch (error) {
            // CRITICAL CASE: the customer's money was already taken by
            // Razorpay, but we could not record the order. Do NOT show a
            // fake success message. Show the payment ID so this can be
            // manually reconciled instead of silently lost. The bill can
            // still be generated from local state (orderId is null here
            // since nothing was actually saved to Firestore).
            console.error('Payment succeeded but order was NOT saved to Firestore:', error);
            setSaveFailed(true);
            setPaymentDetails({
              method: 'Razorpay',
              paymentId: payment.paymentId,
              amount: payment.amount
            });
            setPlacedOrder(buildOrderForBill(null, 'Razorpay', payment.paymentId));
            setOrderPlaced(true);
            setCartOpen(false);
          }
        },
        onFailure: (error) => {
          console.error('Payment failed:', error);
          alert('Payment failed. Please try again.');
        }
      });
    }
  };

  const resetOrder = () => {
    setOrderPlaced(false);
    setSaveFailed(false);
    setCart([]);
    setFormData({ name: '', phone: '', email: '', address: '', note: '' });
    setPaymentDetails(null);
    setPlacedOrder(null);
    setUseTokens(false);
    clearError();
  };

  const downloadBill = () => {
    generateBillPDF(placedOrder, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
    });
  };

  return (
    <div className="order-page">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      {/* Hero Section */}
      <section className="order-hero">
        <div className="order-hero-content">
          <p className="order-eyebrow"><span />Fresh · Fast · Delivered</p>
          <h1 className="order-title">
            Order<br />
            <span className="title-brand">Brew Haven</span>
          </h1>
          <p className="order-hero-sub">
            Pick your brew, place your order — we'll have it<br />
            ready in minutes. Hot, cold, or iced ⚡☕
          </p>
        </div>

        <button
          className={`cart-fab ${totalItems > 0 ? 'has-items' : ''}`}
          onClick={() => setCartOpen(true)}
        >
          <span className="cart-icon">🛒</span>
          {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
        </button>

        <div className="scroll-hint">
          <span className="scroll-line" /> Scroll to order
        </div>
      </section>

      {/* Menu Section */}
      <section className="order-section">
        <div className="order-container">
          <div className="section-header fade-in">
            <p className="section-tag">Our Menu</p>
            <h2>Choose Your <em>Brew</em></h2>
          </div>

          <div className="filter-bar fade-in">
            {allCategories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>

          <div className="order-grid">
            {filtered.map((item, index) => {
              const inCart = cart.find(c => c.id === item.id);
              return (
                <div
                  className="order-card fade-in"
                  key={item.id}
                  style={{ transitionDelay: `${(index % 8) * 0.07}s` }}
                >
                  <div className="order-img-wrap">
                    <img src={item.img} alt={item.name} className="order-img" loading="lazy" />
                    <div className="card-overlay" />
                    <span className="card-category">{item.category}</span>
                  </div>
                  <div className="order-info">
                    <h3>{item.name}</h3>
                    <p className="order-price">₹ {item.price}</p>

                    <div className="card-actions">
                      {inCart ? (
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                          <span className="qty-num">{inCart.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                      ) : (
                        <button className="add-btn" onClick={() => addToCart(item)}>
                          <span>Add to Cart</span>
                        </button>
                      )}

                      <button className="customize-btn" onClick={() => goToCustomize(item)}>
                        <span>🎨 Customize</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Your <em>Order</em></h2>
              <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <span>☕</span>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div className="cart-item" key={item.id}>
                      <img src={item.img} alt={item.name} className="cart-item-img" />
                      <div className="cart-item-info">
                        <p className="cart-item-name">{item.name}</p>
                        {item.customization && (
                          <p className="cart-item-custom">
                            {[
                              item.customization.size,
                              item.customization.milk,
                              item.customization.shot,
                              item.customization.sugar,
                              item.customization.roast,
                              item.customization.straw ? 'Extra Straw' : null,
                            ].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        <p className="cart-item-price">₹ {item.price} × {item.qty}</p>
                      </div>
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                        <span className="qty-num">{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span>Subtotal</span>
                  <span className="total-price">₹ {totalPrice}</span>
                </div>

                {/* ── Rewards: wallet auto-apply + token redemption ── */}
                {user && (wallet > 0 || tokens > 0) && (
                  <div style={rewardStyles.wrap}>
                    <p className="section-tag" style={{ marginBottom: '0.8rem' }}>Your Rewards</p>

                    {wallet > 0 && (
                      <div style={rewardStyles.row}>
                        <span>💰 Wallet Balance</span>
                        <span>₹{wallet} <span style={rewardStyles.note}>(auto-applied)</span></span>
                      </div>
                    )}

                    {tokens > 0 && (
                      <div style={rewardStyles.row}>
                        <span>🪙 Tokens</span>
                        <span>{tokens}</span>
                      </div>
                    )}

                    {bestTier ? (
                      <label style={rewardStyles.toggleLabel}>
                        <input
                          type="checkbox"
                          checked={useTokens}
                          onChange={(e) => setUseTokens(e.target.checked)}
                        />
                        <span>Use {bestTier.cost} tokens for {bestTier.label}</span>
                      </label>
                    ) : (
                      <p style={rewardStyles.note}>
                        Earn 5 tokens per coffee — 500 tokens unlocks 10% off.
                      </p>
                    )}

                    {(tokenDiscountAmount > 0 || walletApplied > 0) && (
                      <div style={rewardStyles.summary}>
                        {tokenDiscountAmount > 0 && <p>Token Discount: −₹{tokenDiscountAmount}</p>}
                        {walletApplied > 0 && <p>Wallet Applied: −₹{walletApplied}</p>}
                        <p style={rewardStyles.finalLine}>You Pay: ₹{finalTotal}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Section */}
                <div className="payment-section">
                  <p className="section-tag" style={{ marginBottom: '1rem' }}>Select Payment Method</p>
                  <div className="payment-options">
                    {paymentMethods.map(method => (
                      <label
                        key={method.id}
                        className={`payment-option ${selectedPayment === method.id ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedPayment === method.id}
                          onChange={() => setSelectedPayment(method.id)}
                        />
                        <span className="payment-icon">{method.icon}</span>
                        <span className="payment-name">{method.name}</span>
                        {method.recommended && <span className="recommended-badge">Recommended</span>}
                      </label>
                    ))}
                  </div>

                  {selectedPayment === 'razorpay' && (
                    <div className="payment-info-box">
                      <p>UPI, Credit/Debit Card, NetBanking, Wallets supported</p>
                      <div className="payment-icons">
                        <span title="Google Pay">GPay</span>
                        <span title="PhonePe">PhonePe</span>
                        <span title="Paytm">Paytm</span>
                        <span title="Card">💳</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkout Form */}
                <form className="checkout-form" onSubmit={handleOrder}>
                  <p className="section-tag" style={{ marginBottom: '1.2rem' }}>Delivery Details</p>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Your Name"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="Email (for payment receipt)"
                    required={selectedPayment === 'razorpay'}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Delivery Address"
                    required
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Special instructions (optional)"
                    value={formData.note}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                  />

                  <button
                    type="submit"
                    className={`primary-btn place-order-btn ${isProcessing ? 'processing' : ''}`}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : `Pay ₹ ${finalTotal}`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success / Save-Failed Modal */}
      {orderPlaced && (
        <div className="success-overlay" onClick={resetOrder}>
          <div className="success-modal" onClick={e => e.stopPropagation()}>
            {saveFailed ? (
              <>
                <div className="success-icon">⚠️</div>
                <h2>Payment <em>Received</em></h2>
                <p>
                  Your payment of <strong>₹ {paymentDetails?.amount}</strong> went through,
                  but we had a technical problem saving your order details.<br /><br />
                  <strong>Please save this Payment ID and contact us directly</strong> so we can
                  confirm your order manually:<br />
                  <strong>Payment ID: {paymentDetails?.paymentId}</strong>
                </p>
                <button className="primary-btn" onClick={downloadBill} style={{ marginBottom: '0.6rem' }}>
                  📄 Download Bill
                </button>
                <button className="primary-btn" onClick={resetOrder}>
                  Okay
                </button>
              </>
            ) : (
              <>
                <div className="success-icon">☕</div>
                <h2>Order <em>Placed!</em></h2>
                <p>
                  Thank you, <strong>{formData.name || 'Friend'}</strong>!<br />
                  Your order of <strong>₹ {paymentDetails?.amount}</strong> will be delivered to <strong>{formData.address}</strong>.<br /><br />
                  <strong>Payment:</strong> {paymentDetails?.method}
                  {paymentDetails?.paymentId && (
                    <><br />Payment ID: {paymentDetails.paymentId}</>
                  )}
                  {tokensEarned > 0 && (
                    <><br />🪙 You earned {tokensEarned} tokens from this order!</>
                  )}
                </p>
                <button className="primary-btn" onClick={downloadBill} style={{ marginBottom: '0.6rem' }}>
                  📄 Download Bill
                </button>
                <button className="primary-btn" onClick={resetOrder}>
                  Order More ☕
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderOnline;