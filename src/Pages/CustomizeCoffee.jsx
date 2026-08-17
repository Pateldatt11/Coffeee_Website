import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { coffeeMenu } from '../data/menuData';
import './CustomizeCoffee.css';

// ── Option definitions. `delta` is the price change in ₹ vs base price. ──
const SIZE_OPTIONS = [
  { id: 'small', label: 'Small', delta: -20 },
  { id: 'medium', label: 'Medium', delta: 0 },
  { id: 'large', label: 'Large', delta: 30 },
];

const ROAST_OPTIONS = [
  { id: 'light', label: 'Light Roast', delta: 0 },
  { id: 'medium', label: 'Medium Roast', delta: 0 },
  { id: 'dark', label: 'Dark Roast', delta: 0 },
];

const MILK_OPTIONS = [
  { id: 'full', label: 'Full Cream', delta: 0 },
  { id: 'low', label: 'Low Fat', delta: 0 },
  { id: 'oat', label: 'Oat Milk', delta: 30 },
  { id: 'almond', label: 'Almond Milk', delta: 30 },
  { id: 'soy', label: 'Soy Milk', delta: 30 },
  { id: 'none', label: 'No Milk', delta: 0 },
];

const SHOT_OPTIONS = [
  { id: 'single', label: 'Single Shot', delta: 0 },
  { id: 'double', label: 'Double Shot', delta: 40 },
  { id: 'triple', label: 'Extra Shot (Triple)', delta: 60 },
];

const SUGAR_OPTIONS = [
  { id: 'none', label: 'No Sugar', delta: 0 },
  { id: 'less', label: 'Less Sugar', delta: 0 },
  { id: 'normal', label: 'Normal', delta: 0 },
  { id: 'extra', label: 'Extra Sweet', delta: 0 },
];

const OPTION_GROUPS = [
  { key: 'size', title: 'Size', options: SIZE_OPTIONS },
  { key: 'roast', title: 'Coffee Bean Roast', options: ROAST_OPTIONS },
  { key: 'milk', title: 'Milk Type', options: MILK_OPTIONS },
  { key: 'shot', title: 'Shot Strength', options: SHOT_OPTIONS },
  { key: 'sugar', title: 'Sugar Level', options: SUGAR_OPTIONS },
];

const DEFAULT_SELECTION = { size: 'medium', roast: 'medium', milk: 'full', shot: 'single', sugar: 'normal' };

const PENDING_CART_KEY = 'brewhaven_pending_cart_item';

const CustomizeCoffee = () => {
  const { itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [item, setItem] = useState(location.state?.item || null);
  const [loadingItem, setLoadingItem] = useState(!location.state?.item);
  const [selected, setSelected] = useState(DEFAULT_SELECTION);
  const [straw, setStraw] = useState(false);

  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // ── Load item if page was opened directly (no state passed via nav) ──
  useEffect(() => {
    if (item) return;

    let cancelled = false;

    const loadItem = async () => {
      setLoadingItem(true);
      try {
        const snap = await getDoc(doc(db, 'menu', itemId));
        if (!cancelled && snap.exists()) {
          setItem({ id: snap.id, ...snap.data() });
          setLoadingItem(false);
          return;
        }
      } catch (err) {
        console.error('Menu item fetch failed:', err);
      }

      // Fallback to the static menu (same id scheme used in OrderOnline.jsx)
      const idx = coffeeMenu.findIndex((_, i) => String(i + 1) === itemId);
      if (!cancelled) {
        if (idx !== -1) {
          setItem({ id: itemId, ...coffeeMenu[idx] });
        }
        setLoadingItem(false);
      }
    };

    loadItem();
    return () => { cancelled = true; };
  }, [itemId, item]);

  // ── Cursor dot/ring + fade-in, identical to every other page ──
  const onMouseMove = useCallback((e) => {
    if (dotRef.current) { dotRef.current.style.left = `${e.clientX}px`; dotRef.current.style.top = `${e.clientY}px`; }
    if (ringRef.current) { ringRef.current.style.left = `${e.clientX}px`; ringRef.current.style.top = `${e.clientY}px`; }
  }, []);

  const addHover = useCallback(() => ringRef.current?.classList.add('hovered'), []);
  const rmvHover = useCallback(() => ringRef.current?.classList.remove('hovered'), []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const hoverTargets = document.querySelectorAll('button, .filter-btn, .payment-option');
    hoverTargets.forEach(el => { el.addEventListener('mouseenter', addHover); el.addEventListener('mouseleave', rmvHover); });

    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      hoverTargets.forEach(el => { el.removeEventListener('mouseenter', addHover); el.removeEventListener('mouseleave', rmvHover); });
      observer.disconnect();
    };
  }, [onMouseMove, addHover, rmvHover, item, loadingItem]);

  const handleSelect = (key, id) => {
    setSelected((prev) => ({ ...prev, [key]: id }));
  };

  const getOption = (key, id) => {
    const group = OPTION_GROUPS.find((g) => g.key === key);
    return group?.options.find((o) => o.id === id);
  };

  const priceDelta = OPTION_GROUPS.reduce((sum, group) => {
    const opt = getOption(group.key, selected[group.key]);
    return sum + (opt?.delta || 0);
  }, 0);

  const finalPrice = Math.max(0, (item?.price || 0) + priceDelta);

  const handleAddAndReturn = () => {
    if (!item) return;

    const customization = {
      size: getOption('size', selected.size)?.label,
      roast: getOption('roast', selected.roast)?.label,
      milk: getOption('milk', selected.milk)?.label,
      shot: getOption('shot', selected.shot)?.label,
      sugar: getOption('sugar', selected.sugar)?.label,
      straw,
    };

    const customizedItem = {
      id: `${item.id}-${selected.size}-${selected.roast}-${selected.milk}-${selected.shot}-${selected.sugar}-${straw ? 'straw' : 'nostraw'}-${Date.now()}`,
      baseId: item.id,
      name: item.name,
      category: item.category,
      img: item.img,
      price: finalPrice,
      qty: 1,
      customization,
    };

    try {
      localStorage.setItem(PENDING_CART_KEY, JSON.stringify(customizedItem));
    } catch (err) {
      console.error('Could not stage customized item:', err);
    }

    navigate('/order');
  };

  if (loadingItem) {
    return (
      <div className="order-page customize-page">
        <div className="order-container">
          <p className="customize-loading">Brewing up your options…</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="order-page customize-page">
        <div className="order-container">
          <p className="customize-not-found">We couldn't find that coffee.</p>
          <button className="primary-btn" onClick={() => navigate('/order')}>
            <span>Back to Order</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-page customize-page">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      <section className="order-hero" style={{ minHeight: '32vh', padding: '4rem 6% 3rem' }}>
        <div className="order-hero-content">
          <p className="order-eyebrow"><span />Make It Yours</p>
          <h1 className="order-title" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}>
            Customize<br />
            <span className="title-brand">Your Brew</span>
          </h1>
        </div>
      </section>

      <section className="order-section" style={{ paddingTop: '3rem' }}>
        <div className="order-container" style={{ maxWidth: '760px' }}>

          <button className="customize-back" onClick={() => navigate('/order')}>
            ← Back to Menu
          </button>

          <div className="customize-preview fade-in">
            <img src={item.img} alt={item.name} className="customize-preview-img" />
            <div className="customize-preview-info">
              <h2>{item.name}</h2>
              <p>Base price ₹ {item.price} · {item.category}</p>
            </div>
          </div>

          {OPTION_GROUPS.map((group) => (
            <div className="option-block fade-in" key={group.key}>
              <p className="option-block-title">{group.title}</p>
              <div className="option-pills">
                {group.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`filter-btn ${selected[group.key] === opt.id ? 'active' : ''}`}
                    onClick={() => handleSelect(group.key, opt.id)}
                  >
                    <span>
                      {opt.label}
                      {opt.delta !== 0 ? ` (${opt.delta > 0 ? '+' : ''}₹${opt.delta})` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="straw-block fade-in">
            <p className="option-block-title">Extras</p>
            <label className={`payment-option ${straw ? 'selected' : ''}`}>
              <input type="checkbox" checked={straw} onChange={(e) => setStraw(e.target.checked)} />
              <span className="payment-icon">🥤</span>
              <span className="payment-name">Add Extra Straw</span>
            </label>
          </div>

          <div className="price-bar fade-in">
            <div className="price-bar-total">
              <span className="price-bar-label">Your Price</span>
              <span className="price-bar-amount">₹ {finalPrice}</span>
            </div>
            <button className="primary-btn" onClick={handleAddAndReturn}>
              <span>Add to Cart</span>
            </button>
          </div>

        </div>
      </section>
    </div>
  );
};

export default CustomizeCoffee;