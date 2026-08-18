import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { coffeeMenu } from '../data/menuData';
import { useFavorites } from '../hooks/useFavorites';
import './Menu.css'; // reuses the exact same theme, cards, hover & animations

// Key used to hand a batch of items from Wishlist.jsx to OrderOnline.jsx's
// cart. OrderOnline picks this up on mount (same pattern it already uses
// for customized items via PENDING_CART_KEY), then clears it.
const PENDING_WISHLIST_CART_KEY = 'brewhaven_pending_wishlist_cart_items';

const HeartIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 21s-6.7-4.35-9.3-8.2C.8 9.9 1.6 6.4 4.6 5.1 6.8 4.15 9 5 12 7.5 15 5 17.2 4.15 19.4 5.1c3 1.3 3.8 4.8 1.9 7.7C18.7 16.65 12 21 12 21z" />
  </svg>
);

const Wishlist = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [justAdded, setJustAdded] = useState(null); // name of item that just got the "Added" flash
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const navigate = useNavigate();

  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const favoriteItems = coffeeMenu.filter((item) => favorites.includes(item.name));

  const handleHeartClick = (e, name) => {
    e.stopPropagation();
    toggleFavorite(name);
  };

  // Queues item(s) into the pending-cart list in localStorage. OrderOnline.jsx
  // reads this on mount and drops them straight into the cart.
  const queueForCart = (items) => {
    try {
      const existingRaw = localStorage.getItem(PENDING_WISHLIST_CART_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const merged = [...existing, ...items];
      localStorage.setItem(PENDING_WISHLIST_CART_KEY, JSON.stringify(merged));
    } catch (err) {
      console.error('Could not queue item(s) for cart:', err);
    }
  };

  const handleAddToCart = (e, item) => {
    e.stopPropagation();
    queueForCart([{
      id: item.name, // coffeeMenu entries have no numeric id — name is unique, used as the cart id
      name: item.name,
      category: item.category,
      price: item.price,
      img: item.img,
      qty: 1,
    }]);
    setJustAdded(item.name);
    setTimeout(() => setJustAdded(null), 900);
  };

  const handleAddAllToCart = () => {
    if (favoriteItems.length === 0) return;
    queueForCart(favoriteItems.map((item) => ({
      id: item.name,
      name: item.name,
      category: item.category,
      price: item.price,
      img: item.img,
      qty: 1,
    })));
    navigate('/order');
  };

  const onMouseMove = useCallback((e) => {
    if (dotRef.current)  { dotRef.current.style.left  = e.clientX + 'px'; dotRef.current.style.top  = e.clientY + 'px'; }
    if (ringRef.current) { ringRef.current.style.left = e.clientX + 'px'; ringRef.current.style.top = e.clientY + 'px'; }
  }, []);

  const addHover = useCallback(() => { ringRef.current?.classList.add('hovered'); }, []);
  const rmvHover = useCallback(() => { ringRef.current?.classList.remove('hovered'); }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const hoverTargets = document.querySelectorAll('button, .menu-card, .filter-btn, .fav-btn, .browse-menu-btn, .wishlist-add-cart-btn, .wishlist-add-all-btn');
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
  }, [onMouseMove, addHover, rmvHover, favorites.length]);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') setSelectedItem(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="menu-page">

      <div className="cursor-dot"  ref={dotRef}  />
      <div className="cursor-ring" ref={ringRef} />

      <section className="menu-hero">
        <div className="menu-hero-content">
          <p className="menu-eyebrow"><span />Saved For Later</p>
          <h1 className="menu-title">
            My<br />
            <span className="title-brand">Wishlist</span>
          </h1>
          <p className="menu-hero-sub">
            Every brew you've hearted, all in one place<br />
            Tap the heart again to remove it ☕
          </p>
        </div>

        <div className="scroll-hint">
          <span className="scroll-line" />
          Scroll to explore
        </div>
      </section>

      <section className="menu-section">
        <div className="menu-container">

          <div className="section-header fade-in">
            <p className="section-tag">Your Picks</p>
            <h2>Favorite <em>Coffees</em></h2>
          </div>

          {favoriteItems.length > 0 && (
            <div className="wishlist-header-actions fade-in">
              <button className="wishlist-add-all-btn" onClick={handleAddAllToCart}>
                🛒 Add All to Cart
              </button>
            </div>
          )}

          {favoriteItems.length === 0 ? (
            <div className="wishlist-empty fade-in">
              <div className="wishlist-empty-icon">♡</div>
              <h3>Your wishlist is empty</h3>
              <p>Browse the menu and tap the heart on anything you love.</p>
              <Link to="/menu" className="browse-menu-btn">Browse the Menu</Link>
            </div>
          ) : (
            <div className="menu-grid">
              {favoriteItems.map((item, index) => (
                <div
                  className="menu-card fade-in"
                  key={item.name}
                  onClick={() => setSelectedItem(item)}
                  style={{ transitionDelay: `${(index % 8) * 0.07}s`, cursor: 'pointer' }}
                >
                  <div className="menu-img-wrapper">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="menu-img"
                      loading="lazy"
                    />
                    <button
                      className={`fav-btn ${isFavorite(item.name) ? 'active' : ''}`}
                      onClick={(e) => handleHeartClick(e, item.name)}
                      aria-label="Remove from favorites"
                    >
                      <HeartIcon />
                    </button>
                    <div className="card-overlay" />
                    <div className="card-order-hint">
                      <span className="order-hint-text">View</span>
                      <span className="order-hint-arrow">→</span>
                    </div>
                  </div>
                  <div className="menu-info">
                    <p className="category-tag">{item.category}</p>
                    <h3>{item.name}</h3>
                    <p className="price">₹ {item.price}</p>
                    <button
                      className={`wishlist-add-cart-btn ${justAdded === item.name ? 'added' : ''}`}
                      onClick={(e) => handleAddToCart(e, item)}
                    >
                      {justAdded === item.name ? '✓ Added' : '🛒 Add to Cart'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {selectedItem && (
        <div className="details-overlay" onClick={() => setSelectedItem(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="details-close" onClick={() => setSelectedItem(null)}>✕</button>
            <button
              className={`fav-btn-modal ${isFavorite(selectedItem.name) ? 'active' : ''}`}
              onClick={(e) => handleHeartClick(e, selectedItem.name)}
              aria-label="Remove from favorites"
            >
              <HeartIcon />
            </button>

            <img
              src={selectedItem.img}
              alt={selectedItem.name}
              className="details-img"
            />

            <div className="details-body">
              <p className="category-tag">{selectedItem.category}</p>
              <h2>{selectedItem.name}</h2>
              <p className="price">₹ {selectedItem.price}</p>

              <div className="details-meta">
                <span><strong>Temp:</strong> {selectedItem.temp}</span>
                <span><strong>Sweetness:</strong> {selectedItem.sweetness}</span>
              </div>

              {selectedItem.ingredients && (
                <p className="details-ingredients">
                  <strong>Ingredients:</strong> {selectedItem.ingredients.join(', ')}
                </p>
              )}

              {selectedItem.description && (
                <p className="details-description">{selectedItem.description}</p>
              )}

              <button
                className="wishlist-add-cart-btn"
                style={{ marginTop: '1.2rem' }}
                onClick={(e) => handleAddToCart(e, selectedItem)}
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Wishlist;