import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  collection,
  serverTimestamp,
  onSnapshot,
  doc,
  writeBatch,
  increment
} from 'firebase/firestore';
import useRazorpay from '../hooks/useRazorpay';
import { auth, db } from '../firebase';
import { coffeeMenu } from '../data/menuData';
import { generateBillPDF } from '../utils/generateBill';
import './OrderOnline.css';

const paymentMethods = [
  { id: 'razorpay', name: 'Razorpay (UPI / Card / Wallet)', icon: '💳', recommended: true },
  { id: 'cod',       name: 'Cash on Delivery',                icon: '💵' },
];

const TOKEN_TIERS = [
  { min: 2000, cost: 2000, percent: 100, label: 'Free Coffee (2000 tokens)' },
  { min: 1500, cost: 1500, percent: 35,  label: '35% Off (1500 tokens)' },
  { min: 1000, cost: 1000, percent: 20,  label: '20% Off (1000 tokens)' },
  { min: 500,  cost: 500,  percent: 10,  label: '10% Off (500 tokens)' },
];

const PENDING_CART_KEY = 'brewhaven_pending_cart_item';
const PENDING_WISHLIST_CART_KEY = 'brewhaven_pending_wishlist_cart_items';

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

  const [saveFailed, setSaveFailed] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

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

  const [menuItems, setMenuItems] = useState(
    coffeeMenu.map((item, index) => ({ id: String(index + 1), stock: 10, ...item }))
  );

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        if (!snap.empty) {
          setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
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
    const currentStock = Number(item.stock ?? 0);
    if (currentStock <= 0) {
      alert(`Sorry, ${item.name} is currently out of stock.`);
      return;
    }

    setCart(prev => {
      const exists = prev.find(c => c.id === item.id);
      if (exists) {
        if (exists.qty >= currentStock) {
          alert(`Only ${currentStock} units of ${item.name} available in stock.`);
          return prev;
        }
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const goToCustomize = (item) => {
    navigate(`/customize/${item.id}`, { state: { item } });
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev.map(c => {
        if (c.id === id) {
          const itemInMenu = menuItems.find(m => m.id === id);
          const maxStock = Number(itemInMenu?.stock ?? 999);
          const newQty = c.qty + delta;

          if (delta > 0 && newQty > maxStock) {
            alert(`Only ${maxStock} units available in stock.`);
            return c;
          }
          return { ...c, qty: Math.max(1, newQty) };
        }
        return c;
      }).filter(c => c.qty > 0)
    );
  };

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const bestTier = TOKEN_TIERS.find(t => tokens >= t.min) || null;
  const tokenDiscountAmount = (useTokens && bestTier)
    ? Math.round((totalPrice * bestTier.percent) / 100)
    : 0;
  const afterTokenDiscount = Math.max(0, totalPrice - tokenDiscountAmount);
  const walletApplied = Math.min(wallet, afterTokenDiscount);
  const finalTotal = Math.max(0, afterTokenDiscount - walletApplied);
  const tokensEarned = totalItems * 5;

  const filtered = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

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

  const persistOrder = async ({ method, paymentId = '' }) => {
    const batch = writeBatch(db);

    const newOrderRef = doc(collection(db, 'orders'));
    batch.set(newOrderRef, {
      userId: user?.uid || null,
      customerName: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      note: formData.note,
      paymentMethod: method,
      paymentId,
      subtotal: totalPrice,
      tokenDiscount: tokenDiscountAmount,
      walletUsed: walletApplied,
      tokensEarned,
      amount: finalTotal,
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

    cart.forEach((item) => {
      if (item.id) {
        const itemRef = doc(db, 'menu', String(item.id));
        batch.update(itemRef, {
          stock: increment(-Number(item.qty || 1))
        });
      }
    });

    if (user) {
      const tierTokensSpent = (useTokens && bestTier) ? bestTier.cost : 0;
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        wallet: increment(-walletApplied),
        tokens: increment(tokensEarned - tierTokensSpent),
      });
    }

    await batch.commit();
    return newOrderRef.id;
  };

  const handleOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    for (let c of cart) {
      const liveItem = menuItems.find(m => m.id === c.id);
      const stock = Number(liveItem?.stock ?? 0);
      if (stock < c.qty) {
        alert(`Sorry, only ${stock} units of "${c.name}" are currently available. Please update your cart.`);
        return;
      }
    }

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
          alert('Something went wrong placing your order. Please try again.');
        }
      })();
      return;
    }

    if (selectedPayment === 'razorpay') {
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
            alert('Something went wrong placing your order. Please try again.');
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

        {/* BUTTON 1 (LEFT): AI CHATBOT */}
        <button
          className="ai-chatbot-btn"
          onClick={() => {
            const chatTrigger = document.querySelector('.chatbot-toggle, #chat-widget-button, .ai-assistant-toggle');
            if (chatTrigger) chatTrigger.click();
          }}
          aria-label="AI Assistant"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {/* Chat bubble body */}
            <path d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.1-3.4A7.96 7.96 0 0 1 4 12Z" />
            {/* AI sparkle inside bubble */}
            <path d="M12 8.2l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9.9-2Z" fill="currentColor" stroke="none" />
          </svg>
          <span className="ai-sparkle-badge" />
        </button>

        {/* BUTTON 2 (RIGHT): CART FAB */}
        <button
          className={`cart-fab ${totalItems > 0 ? 'has-items' : ''}`}
          onClick={() => setCartOpen(true)}
          aria-label="View Cart"
        >
          <svg viewBox="0 0 24 24">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
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
              const itemStock = Number(item.stock ?? 0);
              const isSoldOut = itemStock <= 0;

              return (
                <div
                  className={`order-card fade-in ${isSoldOut ? 'sold-out-card' : ''}`}
                  key={item.id}
                  style={{ transitionDelay: `${(index % 8) * 0.07}s` }}
                >
                  <div className="order-img-wrap">
                    <img src={item.img} alt={item.name} className="order-img" loading="lazy" />
                    <div className="card-overlay" />
                    <span className="card-category">{item.category}</span>
                    {isSoldOut && <span className="sold-out-badge">SOLD OUT</span>}
                  </div>
                  <div className="order-info">
                    <h3>{item.name}</h3>
                    <p className="order-price">₹ {item.price}</p>

                    <div className="card-actions">
                      {isSoldOut ? (
                        <button className="add-btn sold-out-btn" disabled>
                          <span>Sold Out</span>
                        </button>
                      ) : inCart ? (
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

                      <button
                        className="customize-btn"
                        onClick={() => goToCustomize(item)}
                        disabled={isSoldOut}
                      >
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