import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore';
import useRazorpay from '../hooks/useRazorpay';
import { auth, db } from '../firebase';
import { coffeeMenu } from '../data/menuData'; // fallback only, used until Firestore 'menu' is seeded
import './OrderOnline.css';

const paymentMethods = [
  { id: 'razorpay', name: 'Razorpay (UPI / Card / Wallet)', icon: '💳', recommended: true },
  { id: 'cod',       name: 'Cash on Delivery',               icon: '💵' },
];

const OrderOnline = () => {
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

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
        .filter(c => c.qty > 0)
    );
  };

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const filtered = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory);

  // FIX: previously this caught its own errors and did nothing further,
  // so the caller had no way to know the write failed. Now it re-throws,
  // so handleOrder can react properly instead of blindly showing success.
  const persistOrder = async ({ method, paymentId = '' }) => {
    await addDoc(collection(db, 'orders'), {
      userId: user?.uid || null,
      customerName: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      note: formData.note,
      paymentMethod: method,
      paymentId,
      amount: totalPrice,
      // FIX: added `img` so the order history (Profile.jsx) can show a
      // picture of what was ordered — previously only id/name/category/
      // price/qty were stored, so every order card fell back to a
      // placeholder image with no way to recover the real one.
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        qty: item.qty,
        img: item.img || ''
      })),
      status: 'placed',
      createdAt: serverTimestamp()
    });
  };

  const handleOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Cash on Delivery — no money has changed hands yet, but we still
    // want to know if the save failed instead of silently losing the order.
    if (selectedPayment === 'cod') {
      (async () => {
        try {
          await persistOrder({ method: 'Cash on Delivery' });
          setSaveFailed(false);
          setPaymentDetails({ method: 'Cash on Delivery', amount: totalPrice });
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
      initiatePayment({
        amount: totalPrice,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        onSuccess: async (payment) => {
          try {
            await persistOrder({
              method: 'Razorpay',
              paymentId: payment.paymentId
            });
            setSaveFailed(false);
            setPaymentDetails({
              method: 'Razorpay',
              paymentId: payment.paymentId,
              amount: payment.amount
            });
            setOrderPlaced(true);
            setCartOpen(false);
          } catch (error) {
            // CRITICAL CASE: the customer's money was already taken by
            // Razorpay, but we could not record the order. Do NOT show a
            // fake success message. Show the payment ID so this can be
            // manually reconciled instead of silently lost.
            console.error('Payment succeeded but order was NOT saved to Firestore:', error);
            setSaveFailed(true);
            setPaymentDetails({
              method: 'Razorpay',
              paymentId: payment.paymentId,
              amount: payment.amount
            });
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
    clearError();
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
                  <span>Total Amount</span>
                  <span className="total-price">₹ {totalPrice}</span>
                </div>

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
                    {isProcessing ? 'Processing...' : `Pay ₹ ${totalPrice}`}
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
                </p>
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