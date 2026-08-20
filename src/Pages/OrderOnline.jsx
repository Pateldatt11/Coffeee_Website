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
import { coffeeMenu } from '../data/menuData';
import { generateBillPDF } from '../utils/generateBill';
import VoiceAssistant from '../Components/VoiceAssistant';
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
  // ── NEW: wrapper for the per-tier radio choices shown once
  // "Redeem tokens on this order" is checked ──
  tierChoiceWrap: {
    marginTop: '0.7rem',
    paddingLeft: '0.2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    borderLeft: '2px solid rgba(201, 149, 108, 0.25)',
    paddingLeft: '0.9rem',
  },
  tierOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    fontSize: '0.85rem',
    color: '#cbb89a',
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
  // ── NEW: which tier (by its `min` value) the user has chosen to
  // redeem right now. Defaults to the highest unlocked tier, but the
  // user can pick a lower one, or leave useTokens off entirely to
  // keep saving toward 2000. ──
  const [selectedTierMin, setSelectedTierMin] = useState(null);

  // ================= MIC (voice search inside search bar) =================
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported on this browser. Please type instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

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

  // ── NEW: keep selectedTierMin valid whenever the token balance
  // changes. If the previously-selected tier is no longer unlocked
  // (or nothing was selected yet), default to the highest tier the
  // user currently qualifies for. ──
  useEffect(() => {
    const avail = TOKEN_TIERS.filter((t) => tokens >= t.min);
    if (avail.length === 0) {
      setSelectedTierMin(null);
      return;
    }
    const minValues = avail.map((t) => t.min);
    setSelectedTierMin((prev) => (minValues.includes(prev) ? prev : Math.max(...minValues)));
  }, [tokens]);

  // ================= MENU (LIVE FROM FIRESTORE) =================
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        if (!snap.empty) {
          setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setMenuItems(coffeeMenu.map((item, index) => ({ id: String(index + 1), stock: 10, ...item })));
        }
      },
      (err) => console.error('Menu listener error:', err)
    );
    return () => unsub();
  }, []);

  const allCategories = ['All', ...new Set(menuItems.map(i => i.category).filter(Boolean))];

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', note: ''
  });

  const [paymentDetails, setPaymentDetails] = useState(null);
  const { initiatePayment, isProcessing, clearError } = useRazorpay();

  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // Helper: Get sanitized numeric stock from menu item
  const getItemStock = (item) => {
    const s = Number(item?.stock);
    return Number.isFinite(s) ? Math.floor(s) : 0;
  };

  // Helper: Find base menu item from Firestore for any cart item
  const getLiveItemForCart = useCallback((cartItem) => {
    return menuItems.find(m => 
      m.id === (cartItem.baseId || cartItem.id) || 
      m.name?.toLowerCase().trim() === cartItem.name?.toLowerCase().trim()
    );
  }, [menuItems]);

  // Helper: Total quantity of this specific coffee across ALL customizations in the cart
  const getTotalQtyInCartForBase = useCallback((baseItemId, baseItemName) => {
    return cart.reduce((total, c) => {
      const match = (c.baseId && c.baseId === baseItemId) ||
                    (c.id === baseItemId) ||
                    (c.name?.toLowerCase().trim() === baseItemName?.toLowerCase().trim());
      return match ? total + (Number(c.qty) || 0) : total;
    }, 0);
  }, [cart]);

  // ================= PICKUP EFFECT WITH MULTI-CUSTOMIZATION SUPPORT =================
  useEffect(() => {
    let gotSomething = false;

    // 1. Pick up Single Customized Item from Customize page
    try {
      const pending = localStorage.getItem(PENDING_CART_KEY);
      if (pending) {
        const pendingItem = JSON.parse(pending);
        
        // Find live base item and check total stock limit
        const live = menuItems.find(m => m.id === (pendingItem.baseId || pendingItem.id) || m.name === pendingItem.name);
        const liveStock = live ? getItemStock(live) : 99;
        const currentInCart = getTotalQtyInCartForBase(live?.id || pendingItem.id, pendingItem.name);

        if (currentInCart + (pendingItem.qty || 1) <= liveStock) {
          // Assign unique cartItemId so each customized coffee is a separate line item
          const uniqueCustomItem = {
            ...pendingItem,
            baseId: live?.id || pendingItem.baseId || pendingItem.id,
            id: pendingItem.id?.startsWith('custom_') ? pendingItem.id : `custom_${pendingItem.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            qty: pendingItem.qty || 1
          };
          setCart(prev => [...prev, uniqueCustomItem]);
          gotSomething = true;
        } else {
          alert(`Cannot add customized ${pendingItem.name}. Stock limit (${liveStock}) reached!`);
        }
      }
    } catch (err) {
      console.error('Could not restore customized item:', err);
    } finally {
      localStorage.removeItem(PENDING_CART_KEY);
    }

    // 2. Pick up Wishlist Items
    try {
      const pendingBatch = localStorage.getItem(PENDING_WISHLIST_CART_KEY);
      if (pendingBatch) {
        const items = JSON.parse(pendingBatch);
        if (Array.isArray(items) && items.length > 0) {
          setCart(prev => {
            let next = [...prev];
            items.forEach(item => {
              const live = menuItems.find(m => m.id === item.id || m.name === item.name);
              const maxStock = live ? getItemStock(live) : 99;
              const inCartCount = next.reduce((tot, c) => ((c.baseId || c.id) === (live?.id || item.id) ? tot + c.qty : tot), 0);

              if (inCartCount < maxStock) {
                const idx = next.findIndex(c => (c.baseId || c.id) === (live?.id || item.id) && !c.customization);
                if (idx >= 0) {
                  next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                } else {
                  next.push({ ...item, id: live?.id || item.id, baseId: live?.id || item.id, qty: 1 });
                }
                gotSomething = true;
              }
            });
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Could not restore wishlist items:', err);
    } finally {
      localStorage.removeItem(PENDING_WISHLIST_CART_KEY);
    }

    if (gotSomething) setCartOpen(true);
  }, [menuItems, getTotalQtyInCartForBase]);

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
      'button, a, .order-card, .filter-btn, .payment-option, .voice-fab, .voice-hint-btn, .search-clear-btn, .mic-btn'
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

  // Standard Add To Cart (Non-customized)
  const addToCart = (item) => {
    const liveItem = menuItems.find(m => m.id === item.id) || item;
    const maxStock = getItemStock(liveItem);

    if (maxStock <= 0) {
      alert(`Sorry, ${item.name} is currently out of stock!`);
      return;
    }

    const currentTotalInCart = getTotalQtyInCartForBase(liveItem.id, liveItem.name);
    if (currentTotalInCart >= maxStock) {
      alert(`Stock limit reached! Available stock is ${maxStock} for ${item.name}.`);
      return;
    }

    setCart(prev => {
      const existsIdx = prev.findIndex(c => (c.baseId || c.id) === liveItem.id && !c.customization);
      if (existsIdx >= 0) {
        const copy = [...prev];
        copy[existsIdx] = { ...copy[existsIdx], qty: copy[existsIdx].qty + 1 };
        return copy;
      }
      return [...prev, { ...liveItem, baseId: liveItem.id, qty: 1 }];
    });
  };

  const goToCustomize = (item) => {
    const liveItem = menuItems.find(m => m.id === item.id) || item;
    const maxStock = getItemStock(liveItem);
    const currentInCart = getTotalQtyInCartForBase(liveItem.id, liveItem.name);

    if (maxStock <= 0 || currentInCart >= maxStock) {
      alert(`Cannot customize more ${item.name}. Maximum available stock (${maxStock}) is already in your cart!`);
      return;
    }
    navigate(`/customize/${item.id}`, { state: { item: liveItem } });
  };

  // UPDATE QUANTITY (+ / -) WITH AUTO-DELETE AT 0 AND GLOBAL BASE-STOCK LIMIT
  const updateQty = (id, delta) => {
    setCart(prev => {
      const target = prev.find(c => c.id === id);
      if (!target) return prev;

      if (delta < 0 && target.qty <= 1) {
        return prev.filter(c => c.id !== id);
      }

      if (delta > 0) {
        const liveItem = getLiveItemForCart(target);
        const maxStock = liveItem ? getItemStock(liveItem) : (target.stock || 99);
        const currentTotalInCart = getTotalQtyInCartForBase(
          liveItem ? liveItem.id : (target.baseId || target.id),
          liveItem ? liveItem.name : target.name
        );

        if (currentTotalInCart + delta > maxStock) {
          alert(`Stock limit reached! You cannot add more than ${maxStock} total units of ${target.name}.`);
          return prev;
        }
      }

      return prev
        .map(c => (c.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter(c => c.qty > 0);
    });
  };

  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  // Check if any cart item became out of stock
  const cartHasOutOfStock = cart.some(c => {
    const live = getLiveItemForCart(c);
    return live ? getItemStock(live) <= 0 : false;
  });

  // ── All tiers the user currently qualifies for, ascending
  // (500 → 1000 → 1500 → 2000) so they render in a natural order. ──
  const availableTiers = TOKEN_TIERS
    .filter(t => tokens >= t.min)
    .sort((a, b) => a.min - b.min);

  const bestTier = availableTiers.length > 0 ? availableTiers[availableTiers.length - 1] : null;

  // ── The tier the user has actually chosen to redeem right now.
  // null when useTokens is off (i.e. they're choosing to save up). ──
  const chosenTier = useTokens
    ? (availableTiers.find(t => t.min === selectedTierMin) || bestTier)
    : null;

  const tokenDiscountAmount = chosenTier
    ? Math.round((totalPrice * chosenTier.percent) / 100)
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
      i.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return inCategory && inSearch;
  });

  // VOICE ASSISTANT PARSER
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
        const stock = getItemStock(match);
        if (stock <= 0) return `Sorry, ${match.name} is currently out of stock.`;
        addToCart(match);
        setCartOpen(true);
        return `Added ${match.name} to your cart`;
      }
      return `Couldn't find "${name}" on the menu`;
    }

    const searchMatch = t.match(/^(?:search|find|show)\s+(.+)/);
    if (searchMatch) {
      const queryText = searchMatch[1].trim();
      if (queryText === 'all') {
        setActiveCategory('All');
        setSearchQuery('');
        return 'Showing the full menu';
      }
      const matchedCategory = cats.find(cat => cat !== 'All' && queryText.includes(cat.toLowerCase()));
      if (matchedCategory) {
        setActiveCategory(matchedCategory);
        setSearchQuery('');
        return `Showing ${matchedCategory}`;
      }
      setSearchQuery(queryText);
      return `Searching for "${queryText}"`;
    }

    const directItem = items.find(m => t.includes(m.name.toLowerCase()));
    if (directItem) {
      const stock = getItemStock(directItem);
      if (stock <= 0) return `Sorry, ${directItem.name} is out of stock.`;
      addToCart(directItem);
      setCartOpen(true);
      return `Added ${directItem.name} to your cart`;
    }

    setSearchQuery(t);
    return `Searching for "${t}"`;
  }, [getTotalQtyInCartForBase]);

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

  // Real-time batch decrement of base menu items in Firestore
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
        baseId: item.baseId || item.id,
        name: item.name,
        category: item.category || '',
        price: item.price,
        qty: item.qty,
        img: item.img || '',
        customization: item.customization || null,
      })),
      status: 'placed',
      createdAt: serverTimestamp()
    });

    try {
      const batch = writeBatch(db);
      cart.forEach(item => {
        const live = getLiveItemForCart(item);
        const targetDocId = live?.id || item.baseId || item.id;
        if (targetDocId) {
          const itemRef = doc(db, 'menu', targetDocId);
          batch.update(itemRef, {
            stock: increment(-Number(item.qty || 1))
          });
        }
      });
      await batch.commit();
    } catch (stockErr) {
      console.warn('Could not auto-decrement stock:', stockErr);
    }

    if (user) {
      // Tokens actually spent = whichever tier the user chose to
      // redeem (chosenTier), not blindly the highest unlocked one.
      const tierTokensSpent = chosenTier ? chosenTier.cost : 0;
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

    if (formData.phone.trim().length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (cartHasOutOfStock) {
      alert('One or more items in your cart are Out of Stock. Please remove them before proceeding.');
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
              placeholder={isListening ? 'Listening…' : 'Search coffees… or tap the mic'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                ✕
              </button>
            )}
            <button
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoiceSearch}
              aria-label="Search by voice"
              type="button"
            >
              🎤
            </button>
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
                const totalInCartForThis = getTotalQtyInCartForBase(item.id, item.name);
                const isMaxReached = totalInCartForThis >= stock;
                const inCart = cart.find(c => (c.baseId || c.id) === item.id && !c.customization);

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
                            <button className="qty-btn" onClick={() => updateQty(inCart.id, -1)}>−</button>
                            <span className="qty-num">{inCart.qty}</span>
                            <button 
                              className="qty-btn" 
                              onClick={() => updateQty(inCart.id, 1)}
                              disabled={isMaxReached}
                              style={isMaxReached ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                              title={isMaxReached ? `Max total stock available: ${stock}` : 'Add more'}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="add-btn" 
                            onClick={() => addToCart(item)}
                            disabled={isMaxReached}
                            style={isMaxReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <span>{isMaxReached ? 'Max In Cart' : 'Add to Cart'}</span>
                          </button>
                        )}

                        <button
                          className="customize-btn"
                          onClick={() => goToCustomize(item)}
                          disabled={isOutOfStock || isMaxReached}
                          style={(isOutOfStock || isMaxReached) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
                    const live = getLiveItemForCart(item);
                    const liveStock = live ? getItemStock(live) : getItemStock(item);
                    const itemIsOut = liveStock <= 0;
                    const totalBaseInCart = getTotalQtyInCartForBase(
                      live ? live.id : (item.baseId || item.id),
                      live ? live.name : item.name
                    );
                    const reachedMax = totalBaseInCart >= liveStock;

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
                          <button 
                            className="qty-btn" 
                            onClick={() => updateQty(item.id, -1)} 
                            title={item.qty === 1 ? 'Remove from Cart' : 'Decrease'}
                          >
                            −
                          </button>
                          <span className="qty-num">{item.qty}</span>
                          <button
                            className="qty-btn"
                            onClick={() => updateQty(item.id, 1)}
                            disabled={itemIsOut || reachedMax}
                            style={(itemIsOut || reachedMax) ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                            title={reachedMax ? `Maximum stock of ${liveStock} reached for this coffee` : 'Increase'}
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

                    {availableTiers.length > 0 ? (
                      <>
                        <label style={rewardStyles.toggleLabel}>
                          <input
                            type="checkbox"
                            checked={useTokens}
                            onChange={(e) => setUseTokens(e.target.checked)}
                          />
                          <span>Redeem tokens on this order</span>
                        </label>

                        {/* Let the user pick WHICH unlocked tier to redeem,
                            instead of always forcing the highest one — so
                            they can choose to cash in now at a lower tier,
                            or leave the box unchecked and keep saving
                            toward Free Coffee at 2000. */}
                        {useTokens && (
                          <div style={rewardStyles.tierChoiceWrap}>
                            <p style={rewardStyles.note}>Choose which reward to redeem now:</p>
                            {availableTiers.map((t) => (
                              <label key={t.min} style={rewardStyles.tierOption}>
                                <input
                                  type="radio"
                                  name="tokenTier"
                                  checked={selectedTierMin === t.min}
                                  onChange={() => setSelectedTierMin(t.min)}
                                />
                                <span>{t.label}</span>
                              </label>
                            ))}
                            <p style={rewardStyles.note}>
                              Tip: uncheck above to keep saving — up to 2000 tokens for a Free Coffee.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={rewardStyles.note}>
                        Earn 5 tokens per coffee — 500 tokens unlocks 10% off. Save up to 2000 for a free coffee!
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
                  
                  {/* PHONE NUMBER */}
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="10-digit Mobile Number"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={e => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: digitsOnly });
                    }}
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