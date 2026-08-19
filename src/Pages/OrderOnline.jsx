import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  writeBatch
} from 'firebase/firestore';
import useRazorpay from '../hooks/useRazorpay';
import { auth, db } from '../firebase';
import { coffeeMenu } from '../data/menuData'; // fallback
import { generateBillPDF } from '../utils/generateBill';
import VoiceAssistant from '../Components/VoiceAssistant';
import './OrderOnline.css';

const paymentMethods = [
  { id: 'razorpay', name: 'Razorpay (UPI / Card / Wallet)', icon: '💳', recommended: true },
  { id: 'cod',       name: 'Cash on Delivery',               icon: '💵' },
];

const TOKEN_TIERS = [
  { min: 2000, cost: 2000, percent: 100, label: 'Free Coffee (2000 tokens)' },
  { min: 1500, cost: 1500, percent: 35,  label: '35% Off (1500 tokens)' },
  { min: 1000, cost: 1000, percent: 20,  label: '20% Off (1000 tokens)' },
  { min: 500,  cost: 500,  percent: 10,  label: '10% Off (500 tokens)' },
];

const PENDING_CART_KEY = 'brewhaven_pending_cart_item';
const PENDING_WISHLIST_CART_KEY = 'brewhaven_pending_wishlist_cart_items';

const VOICE_HINTS = [
  'Add cappuccino to cart',
  'Remove latte',
  'Show cold coffee',
  'Open cart',
  'Cash on delivery',
  'Use my tokens',
  'Checkout',
];

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

  const [searchQuery, setSearchQuery] = useState('');
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

  // ================= MENU (LIVE FROM FIRESTORE) =================
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

  // Cart Helper
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

    const hoverTargets = document.querySelectorAll(
      'button, a, .order-card, .filter-btn, .payment-option, .voice-fab, .voice-hint-btn, .search-clear-btn'
    );
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
  }, [onMouseMove, addHover, rmvHover, activeCategory, menuItems, searchQuery]);

  // Stock check helper
  const getItemStock = (item) => {
    const s = Number(item?.stock);
    return Number.isFinite(s) ? Math.floor(s) : 0;
  };

  const addToCart = (item) => {
    const currentStock = getItemStock(item);
    if (currentStock <= 0) {
      alert(`Sorry, ${item.name} is currently out of stock!`);
      return;
    }

    setCart(prev => {
      const exists = prev.find(c => c.id === item.id);
      if (exists) {
        if (exists.qty >= currentStock) {
          alert(`Only ${currentStock} units available for ${item.name}`);
          return prev;
        }
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const goToCustomize = (item) => {
    if (getItemStock(item) <= 0) {
      alert(`Sorry, ${item.name} is currently out of stock!`);
      return;
    }
    navigate(`/customize/${item.id}`, { state: { item } });
  };

  const updateQty = (id, delta) => {
    setCart(prev => {
      const target = prev.find(c => c.id === id);
      if (!target) return prev;

      // Check against live Firestore stock
      const liveItem = menuItems.find(m => m.id === id);
      const currentStock = liveItem ? getItemStock(liveItem) : (target.stock ?? 999);

      if (delta > 0 && target.qty + delta > currentStock) {
        alert(`Cannot add more. Max stock available: ${currentStock}`);
        return prev;
      }

      return prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
        .filter(c => c.qty > 0);
    });
  };

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  // Check if any cart item became out-of-stock in real-time
  const cartHasOutOfStock = cart.some(c => {
    const live = menuItems.find(m => m.id === c.id);
    return live && getItemStock(live) <= 0;
  });

  const bestTier = TOKEN_TIERS.find(t => tokens >= t.min) || null;
  const tokenDiscountAmount = (useTokens && bestTier)
    ? Math.round((totalPrice * bestTier.percent) / 100)
    : 0;
  const afterTokenDiscount = Math.max(0, totalPrice - tokenDiscountAmount);
  const walletApplied = Math.min(wallet, afterTokenDiscount);
  const finalTotal = Math.max(0, afterTokenDiscount - walletApplied);
  const tokensEarned = totalItems * 5;

  const filtered = menuItems.filter((i) => {
    const inCategory = activeCategory === 'All' || i.category === activeCategory;
    const inSearch =
      !searchQuery ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase());
    return inCategory && inSearch;
  });

  // VOICE PARSER
  const stateRef = useRef({});
  stateRef.current = { menuItems, cart, allCategories, bestTier };

  const handleVoiceCommand = useCallback((text) => {
    const t = text.toLowerCase().trim();
    const { menuItems: items, cart: currentCart, allCategories: cats, bestTier: tier } = stateRef.current;

    if (t.includes('open cart') || t.includes('show cart') || t.includes('view cart')) {
      setCartOpen(true);
      return 'Opening your cart';
    }
    if (t.includes('close cart') || t.includes('hide cart')) {
      setCartOpen(false);
      return 'Closing cart';
    }

    if (t.includes('cash on delivery') || t.includes(' cod') || t === 'cod') {
      setSelectedPayment('cod');
      return 'Payment method set to Cash on Delivery';
    }
    if (t.includes('razorpay') || t.includes('upi') || t.includes('pay by card')) {
      setSelectedPayment('razorpay');
      return 'Payment method set to Razorpay';
    }

    if (t.includes('use token') || t.includes('apply token') || t.includes('redeem token')) {
      if (tier) {
        setUseTokens(true);
        return `Applying your tokens — ${tier.label}`;
      }
      return "You don't have enough tokens for a discount yet";
    }
    if (t.includes("don't use token") || t.includes('remove token')) {
      setUseTokens(false);
      return 'Tokens removed from this order';
    }

    if (t.includes('checkout') || t.includes('place order')) {
      if (currentCart.length === 0) return 'Your cart is empty — add something first';
      setCartOpen(true);
      return 'Opening checkout — please fill in your delivery details';
    }

    const removeMatch = t.match(/^(?:remove|delete)\s+(.+?)(?:\s+from\s+cart)?$/);
    if (removeMatch) {
      const name = removeMatch[1].trim();
      const match = currentCart.find(c => c.name.toLowerCase().includes(name));
      if (match) {
        updateQty(match.id, -match.qty);
        return `Removed ${match.name} from your cart`;
      }
      return `Couldn't find "${name}" in your cart`;
    }

    const addMatch =
      t.match(/^add\s+(.+?)(?:\s+to\s+(?:my\s+)?cart)?$/) ||
      t.match(/^order\s+(?:a\s+|an\s+)?(.+)/) ||
      t.match(/^i want\s+(?:a\s+|an\s+)?(.+)/) ||
      t.match(/^get me\s+(?:a\s+|an\s+)?(.+)/);

    if (addMatch) {
      const name = addMatch[1].trim();
      const match = items.find(m => m.name.toLowerCase().includes(name));
      if (match) {
        if (getItemStock(match) <= 0) {
          return `Sorry, ${match.name} is currently out of stock.`;
        }
        addToCart(match);
        setCartOpen(true);
        return `Added ${match.name} to your cart`;
      }
      return `Couldn't find "${name}" on the menu`;
    }

    const searchMatch = t.match(/^(?:search|find|show)\s+(.+)/);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      if (query === 'all') {
        setActiveCategory('All');
        setSearchQuery('');
        return 'Showing the full menu';
      }
      const matchedCategory = cats.find(cat => cat !== 'All' && query.includes(cat.toLowerCase()));
      if (matchedCategory) {
        setActiveCategory(matchedCategory);
        setSearchQuery('');
        return `Showing ${matchedCategory}`;
      }
      setSearchQuery(query);
      return `Searching for "${query}"`;
    }

    const directItem = items.find(m => t.includes(m.name.toLowerCase()));
    if (directItem) {
      if (getItemStock(directItem) <= 0) {
        return `Sorry, ${directItem.name} is out of stock.`;
      }
      addToCart(directItem);
      setCartOpen(true);
      return `Added ${directItem.name} to your cart`;
    }

    setSearchQuery(t);
    return `Searching for "${t}"`;
  }, []);

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

  // Save Order + Auto-Decrement Firestore Menu Stock
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

    // Realtime Stock Decrement in Firestore
    try {
      const batch = writeBatch(db);
      cart.forEach(item => {
        // Base menu doc update
        if (item.id) {
          const itemRef = doc(db, 'menu', item.id);
          batch.update(itemRef, {
            stock: increment(-Number(item.qty || 1))
          });
        }
      });
      await batch.commit();
    } catch (stockErr) {
      console.warn('Could not auto-decrement stock:', stockErr);
    }

    // Settle Rewards
    if (user) {
      const tierTokensSpent = (useTokens && bestTier) ? bestTier.cost : 0;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          wallet: increment(-walletApplied),
          tokens: increment(tokensEarned - tierTokensSpent),
        });
      } catch (err) {
        console.error('Wallet/token settlement failed:', err);
      }
    }

    return docRef.id;
  };

  const handleOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (cartHasOutOfStock) {
      alert('One or more items in your cart are now Out of Stock. Please remove them before proceeding.');
      return;
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
            console.error('Payment succeeded but order failed to save:', error);
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

          <div className="search-bar-wrap fade-in">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search coffees… or tap the mic"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                ✕
              </button>
            )}
          </div>

          <div className="filter-bar fade-in">
            {allCategories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => { setSearchQuery(''); setActiveCategory(cat); }}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="wishlist-empty fade-in">
              <div className="wishlist-empty-icon">☕</div>
              <h3>No coffees found</h3>
              <p>Try a different search term, or say "show all".</p>
            </div>
          ) : (
            <div className="order-grid">
              {filtered.map((item, index) => {
                const stock = getItemStock(item);
                const isOutOfStock = stock <= 0;
                const inCart = cart.find(c => c.id === item.id);

                return (
                  <div
                    className={`order-card fade-in ${isOutOfStock ? 'card-out-of-stock' : ''}`}
                    key={item.id}
                    style={{
                      transitionDelay: `${(index % 8) * 0.07}s`,
                      opacity: isOutOfStock ? 0.6 : 1,
                      position: 'relative'
                    }}
                  >
                    <div className="order-img-wrap">
                      <img src={item.img} alt={item.name} className="order-img" loading="lazy" />
                      <div className="card-overlay" />
                      <span className="card-category">{item.category}</span>
                      
                      {/* REAL-TIME OUT OF STOCK BADGE */}
                      {isOutOfStock && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(224, 112, 96, 0.92)',
                            color: '#140e0b',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            letterSpacing: '0.08em',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '999px',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                            zIndex: 2,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🚫 OUT OF STOCK
                        </div>
                      )}
                    </div>
                    <div className="order-info">
                      <h3>{item.name}</h3>
                      <p className="order-price">₹ {item.price}</p>

                      <div className="card-actions">
                        {isOutOfStock ? (
                          <button
                            className="add-btn"
                            disabled
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: '#a89070',
                              cursor: 'not-allowed',
                              border: '1px solid rgba(201,149,108,0.15)'
                            }}
                          >
                            <span>Unavailable</span>
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
                          disabled={isOutOfStock}
                          style={isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          <span>🎨 Customize</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                {/* OUT OF STOCK ALERT IN CART */}
                {cartHasOutOfStock && (
                  <div
                    style={{
                      background: 'rgba(224, 112, 96, 0.15)',
                      border: '1px solid #e07060',
                      borderRadius: '8px',
                      padding: '0.6rem 0.8rem',
                      color: '#e07060',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginBottom: '1rem',
                      textAlign: 'center'
                    }}
                  >
                    ⚠️ Some items in your cart are Out of Stock. Please remove them to checkout.
                  </div>
                )}

                <div className="cart-items">
                  {cart.map(item => {
                    const live = menuItems.find(m => m.id === item.id);
                    const itemIsOut = live && getItemStock(live) <= 0;

                    return (
                      <div
                        className="cart-item"
                        key={item.id}
                        style={itemIsOut ? { border: '1px solid #e07060', background: 'rgba(224, 112, 96, 0.08)' } : {}}
                      >
                        <img src={item.img} alt={item.name} className="cart-item-img" />
                        <div className="cart-item-info">
                          <p className="cart-item-name">
                            {item.name} {itemIsOut && <span style={{ color: '#e07060', fontSize: '0.72rem' }}>(OUT OF STOCK)</span>}
                          </p>
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
                          <button
                            className="qty-btn"
                            onClick={() => updateQty(item.id, 1)}
                            disabled={itemIsOut}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-total">
                  <span>Subtotal</span>
                  <span className="total-price">₹ {totalPrice}</span>
                </div>

                {/* Rewards */}
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

                {/* Payment Options */}
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
                    disabled={isProcessing || cartHasOutOfStock}
                    style={cartHasOutOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    {isProcessing
                      ? 'Processing...'
                      : cartHasOutOfStock
                        ? 'Remove Out of Stock Items'
                        : `Pay ₹ ${finalTotal}`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
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
                  <strong>Please save this Payment ID and contact us directly</strong>:<br />
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

      <VoiceAssistant onCommand={handleVoiceCommand} hints={VOICE_HINTS} />
    </div>
  );
};

export default OrderOnline;