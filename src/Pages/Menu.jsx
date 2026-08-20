import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { coffeeMenu } from '../data/menuData';
import { useFavorites } from '../hooks/useFavorites';
import VoiceAssistant from '../Components/VoiceAssistant';
import './Menu.css';

// Small reusable heart icon — outline by default, filled when active.
const HeartIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 21s-6.7-4.35-9.3-8.2C.8 9.9 1.6 6.4 4.6 5.1 6.8 4.15 9 5 12 7.5 15 5 17.2 4.15 19.4 5.1c3 1.3 3.8 4.8 1.9 7.7C18.7 16.65 12 21 12 21z" />
  </svg>
);

const VOICE_HINTS = [
  'Show cold coffee',
  'Search cappuccino',
  'Show my favorites',
  'Show all',
];

// Same keys OrderOnline.jsx reads from on mount — pushing to these here
// is how a coffee picked from the Menu's details modal ends up in the
// cart on the /order page.
const PENDING_CART_KEY = 'brewhaven_pending_cart_item';
const PENDING_WISHLIST_CART_KEY = 'brewhaven_pending_wishlist_cart_items';

const Menu = () => {
  // Read/write the category via the URL (?category=...) instead of only
  // local state. This is what makes the Nav mega-menu links actually work:
  // before, activeCategory always started at "All" no matter what was in
  // the URL, so clicking a category link from Nav landed on /menu but
  // never filtered anything.
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ================= LIVE MENU (FROM FIRESTORE) =================
  // Same live source OrderOnline.jsx and AdminPanel already use, so
  // new items added from the Admin Panel — and stock changes from every
  // order — show up here in real time, with the SAME document IDs.
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        if (!snap.empty) {
          setMenuItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } else {
          // Fallback only kicks in if Firestore's menu collection is
          // genuinely empty (e.g. before the admin has imported/added
          // anything yet).
          setMenuItems(
            coffeeMenu.map((item, index) => ({
              id: String(index + 1),
              stock: 10,
              ...item,
            }))
          );
        }
      },
      (err) => console.error('Menu listener error:', err)
    );
    return () => unsub();
  }, []);

  const allCategories = ['All', ...new Set(menuItems.map((i) => i.category).filter(Boolean))];

  const getCategoryFromUrl = () => searchParams.get('category') || 'All';

  const [activeCategory, setActiveCategory] = useState(getCategoryFromUrl);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Tracks which item(s) just got an "Add to Cart" tap, so the button can
  // flash a brief "✓ Added" confirmation (same pattern as the wishlist
  // page's .wishlist-add-cart-btn.added state).
  const [addedMap, setAddedMap] = useState({});
  const addedTimers = useRef({});

  // ================= SEARCH (typed + voice) =================
  const [searchQuery, setSearchQuery] = useState('');

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
      setShowFavoritesOnly(false);
      setSearchQuery(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const dotRef  = useRef(null);
  const ringRef = useRef(null);

  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  // Keep activeCategory in sync with the URL. Needed because clicking a
  // Nav link while ALREADY on /menu doesn't remount this component —
  // React Router just updates the URL, so without this effect the page
  // wouldn't notice the category changed.
  useEffect(() => {
    setActiveCategory(getCategoryFromUrl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Clicking a filter button updates both local state AND the URL, so
  // the URL always reflects what's shown (shareable/bookmarkable link,
  // and keeps it consistent with how Nav's links work).
  const handleCategoryClick = (cat) => {
    setShowFavoritesOnly(false);
    setActiveCategory(cat);
    if (cat === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat });
    }
  };

  const handleFavoritesToggle = () => {
    setShowFavoritesOnly((prev) => !prev);
  };

  const handleHeartClick = (e, name) => {
    e.stopPropagation(); // don't open the details modal
    toggleFavorite(name);
  };

  // Helper: Get sanitized numeric stock from a live menu item.
  const getItemStock = (item) => {
    const s = Number(item?.stock);
    return Number.isFinite(s) ? Math.floor(s) : 0;
  };

  // ================= ADD TO CART / BUY NOW (from details modal) =================
  const handleAddToCart = (item) => {
    if (getItemStock(item) <= 0) return;

    try {
      const existingRaw = localStorage.getItem(PENDING_WISHLIST_CART_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        img: item.img,
      });
      localStorage.setItem(PENDING_WISHLIST_CART_KEY, JSON.stringify(existing));
    } catch (err) {
      console.error('Could not queue item for cart:', err);
      return;
    }

    // Flash "✓ Added" on the button, then reset it after a bit.
    if (addedTimers.current[item.name]) clearTimeout(addedTimers.current[item.name]);
    setAddedMap((prev) => ({ ...prev, [item.name]: true }));
    addedTimers.current[item.name] = setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [item.name]: false }));
    }, 1800);
  };

  const handleBuyNow = (item) => {
    if (getItemStock(item) <= 0) return;

    try {
      localStorage.setItem(
        PENDING_CART_KEY,
        JSON.stringify({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          img: item.img,
          qty: 1,
        })
      );
    } catch (err) {
      console.error('Could not queue item for checkout:', err);
    }
    setSelectedItem(null);
    navigate('/order');
  };

  useEffect(() => {
    const timers = addedTimers.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  // ================= VOICE COMMAND PARSER =================
  // Keeps the latest menuItems/allCategories/favorites in a ref so the
  // callback (registered once, empty deps) never reads stale data —
  // same pattern OrderOnline.jsx uses for its voice parser.
  const stateRef = useRef({});
  stateRef.current = { menuItems, allCategories, favorites };

  // Returns a short string describing what happened (spoken back to
  // the user + shown in the bubble), or null if nothing matched.
  const handleVoiceCommand = useCallback((text) => {
    const t = text.toLowerCase().trim();
    const { menuItems: items, allCategories: cats } = stateRef.current;

    if (t.includes('favorite')) {
      setShowFavoritesOnly(true);
      return 'Showing your favorites';
    }

    if (t.includes('show all') || t.includes('clear search') || t.includes('reset')) {
      setShowFavoritesOnly(false);
      setSearchQuery('');
      handleCategoryClick('All');
      return 'Showing all coffees';
    }

    // "show <category>" / plain category name, e.g. "cold coffee"
    const matchedCategory = cats.find(
      (cat) => cat !== 'All' && t.includes(cat.toLowerCase())
    );
    if (matchedCategory) {
      setShowFavoritesOnly(false);
      setSearchQuery('');
      handleCategoryClick(matchedCategory);
      return `Showing ${matchedCategory}`;
    }

    // "search X" / "find X"
    const searchMatch = t.match(/^(?:search|find)\s+(.+)/);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      setShowFavoritesOnly(false);
      setSearchQuery(query);
      return `Searching for "${query}"`;
    }

    // direct item name spoken on its own — open its details modal
    const matchedItem = items.find((item) => t.includes(item.name.toLowerCase()));
    if (matchedItem) {
      setShowFavoritesOnly(false);
      setSearchQuery(matchedItem.name);
      setSelectedItem(matchedItem);
      return `Here's ${matchedItem.name}`;
    }

    // fallback: treat whatever was said as a search term
    setShowFavoritesOnly(false);
    setSearchQuery(t);
    return `Searching for "${t}"`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = showFavoritesOnly
    ? menuItems.filter((item) => favorites.includes(item.name))
    : menuItems.filter((item) => {
        const inCategory = activeCategory === 'All' || item.category === activeCategory;
        const inSearch =
          !searchQuery ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchQuery.toLowerCase());
        return inCategory && inSearch;
      });

  const onMouseMove = useCallback((e) => {
    if (dotRef.current)  { dotRef.current.style.left  = e.clientX + 'px'; dotRef.current.style.top  = e.clientY + 'px'; }
    if (ringRef.current) { ringRef.current.style.left = e.clientX + 'px'; ringRef.current.style.top = e.clientY + 'px'; }
  }, []);

  const addHover = useCallback(() => { ringRef.current?.classList.add('hovered'); }, []);
  const rmvHover = useCallback(() => { ringRef.current?.classList.remove('hovered'); }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const hoverTargets = document.querySelectorAll(
      'button, .menu-card, .filter-btn, .fav-btn, .voice-fab, .voice-hint-btn, .search-clear-btn, .mic-btn'
    );
    hoverTargets.forEach(el => { el.addEventListener('mouseenter', addHover); el.addEventListener('mouseleave', rmvHover); });

    // This observer re-runs whenever activeCategory/showFavoritesOnly/searchQuery/menuItems
    // changes, so switching filters (or new live data arriving) re-observes the
    // current set of .menu-card.fade-in elements and reveals them.
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
  }, [onMouseMove, addHover, rmvHover, activeCategory, showFavoritesOnly, searchQuery, menuItems]);

  // close modal on Escape key
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
          <p className="menu-eyebrow"><span />50+ World-Class Brews</p>
          <h1 className="menu-title">
            Our<br />
            <span className="title-brand">Menu</span>
          </h1>
          <p className="menu-hero-sub">
            Classic shots · Regional legends · Cold brews · Modern favorites<br />
            Fuel for coders &amp; late-night builders ⚡☕
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
            <p className="section-tag">Browse</p>
            <h2>Explore All <em>Coffees</em></h2>
          </div>

          {/* Type-to-search bar — voice search fills this same state,
              so typed and spoken search behave identically. */}
          <div className="search-bar-wrap fade-in">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={isListening ? 'Listening…' : 'Search coffees… or tap the mic'}
              value={searchQuery}
              onChange={(e) => { setShowFavoritesOnly(false); setSearchQuery(e.target.value); }}
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
            {allCategories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${!showFavoritesOnly && activeCategory === cat ? 'active' : ''}`}
                onClick={() => { setSearchQuery(''); handleCategoryClick(cat); }}
              >
                <span>{cat}</span>
              </button>
            ))}
            <button
              className={`filter-btn fav-filter-btn ${showFavoritesOnly ? 'active' : ''}`}
              onClick={handleFavoritesToggle}
            >
              <span>♥ My Favorites{favorites.length > 0 ? ` (${favorites.length})` : ''}</span>
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="wishlist-empty fade-in">
              <div className="wishlist-empty-icon">{showFavoritesOnly ? '♡' : '☕'}</div>
              <h3>{showFavoritesOnly ? 'No favorites yet' : 'No coffees found'}</h3>
              <p>
                {showFavoritesOnly
                  ? 'Tap the heart on any coffee to save it here.'
                  : 'Try a different search term or say "show all".'}
              </p>
            </div>
          ) : (
            <div className="menu-grid">
              {filtered.map((item, index) => {
                const stock = getItemStock(item);
                const isOutOfStock = stock <= 0;

                return (
                  <div
                    className="menu-card fade-in"
                    key={`${showFavoritesOnly ? 'fav' : activeCategory}-${item.id}`}
                    onClick={() => setSelectedItem(item)}
                    style={{ transitionDelay: `${(index % 8) * 0.07}s`, cursor: 'pointer', opacity: isOutOfStock ? 0.6 : 1 }}
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
                        aria-label={isFavorite(item.name) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <HeartIcon />
                      </button>
                      <div className="card-overlay" />

                      {isOutOfStock ? (
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
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🚫 OUT OF STOCK
                        </div>
                      ) : (
                        <div className="card-order-hint">
                          <span className="order-hint-text">View</span>
                          <span className="order-hint-arrow">→</span>
                        </div>
                      )}
                    </div>
                    <div className="menu-info">
                      <p className="category-tag">{item.category}</p>
                      <h3>{item.name}</h3>
                      <p className="price">₹ {item.price}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* Details Modal */}
      {selectedItem && (
        <div className="details-overlay" onClick={() => setSelectedItem(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="details-close" onClick={() => setSelectedItem(null)}>✕</button>
            <button
              className={`fav-btn-modal ${isFavorite(selectedItem.name) ? 'active' : ''}`}
              onClick={(e) => handleHeartClick(e, selectedItem.name)}
              aria-label={isFavorite(selectedItem.name) ? 'Remove from favorites' : 'Add to favorites'}
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

              {getItemStock(selectedItem) <= 0 && (
                <p style={{ color: '#e07060', fontWeight: 700, fontSize: '0.85rem' }}>
                  🚫 Currently out of stock
                </p>
              )}

              <div className="details-actions">
                <button
                  className={`details-add-cart-btn ${addedMap[selectedItem.name] ? 'added' : ''}`}
                  onClick={() => handleAddToCart(selectedItem)}
                  disabled={getItemStock(selectedItem) <= 0}
                  style={getItemStock(selectedItem) <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  {addedMap[selectedItem.name] ? '✓ Added to Cart' : '🛒 Add to Cart'}
                </button>
                <button
                  className="details-buy-now-btn"
                  onClick={() => handleBuyNow(selectedItem)}
                  disabled={getItemStock(selectedItem) <= 0}
                  style={getItemStock(selectedItem) <= 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Buy Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <VoiceAssistant onCommand={handleVoiceCommand} hints={VOICE_HINTS} />

    </div>
  );
};

export default Menu;