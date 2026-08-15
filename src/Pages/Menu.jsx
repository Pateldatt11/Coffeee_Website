import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coffeeMenu } from '../data/menuData';
import './Menu.css';

const allCategories = ["All", ...new Set(coffeeMenu.map((item) => item.category))];

const Menu = () => {
  // Read/write the category via the URL (?category=...) instead of only
  // local state. This is what makes the Nav mega-menu links actually work:
  // before, activeCategory always started at "All" no matter what was in
  // the URL, so clicking a category link from Nav landed on /menu but
  // never filtered anything.
  const [searchParams, setSearchParams] = useSearchParams();

  const getCategoryFromUrl = () => {
    const cat = searchParams.get('category');
    return cat && allCategories.includes(cat) ? cat : 'All';
  };

  const [activeCategory, setActiveCategory] = useState(getCategoryFromUrl);
  const [selectedItem, setSelectedItem] = useState(null);
  const dotRef  = useRef(null);
  const ringRef = useRef(null);

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
    setActiveCategory(cat);
    if (cat === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat });
    }
  };

  const filtered =
    activeCategory === "All"
      ? coffeeMenu
      : coffeeMenu.filter((item) => item.category === activeCategory);

  const onMouseMove = useCallback((e) => {
    if (dotRef.current)  { dotRef.current.style.left  = e.clientX + 'px'; dotRef.current.style.top  = e.clientY + 'px'; }
    if (ringRef.current) { ringRef.current.style.left = e.clientX + 'px'; ringRef.current.style.top = e.clientY + 'px'; }
  }, []);

  const addHover = useCallback(() => { ringRef.current?.classList.add('hovered'); }, []);
  const rmvHover = useCallback(() => { ringRef.current?.classList.remove('hovered'); }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const hoverTargets = document.querySelectorAll('button, .menu-card, .filter-btn');
    hoverTargets.forEach(el => { el.addEventListener('mouseenter', addHover); el.addEventListener('mouseleave', rmvHover); });

    // This observer re-runs whenever activeCategory changes, so switching
    // categories (from the filter bar OR from a Nav link) re-observes the
    // new set of .menu-card.fade-in elements and reveals them.
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
  }, [onMouseMove, addHover, rmvHover, activeCategory]);

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

          <div className="filter-bar fade-in">
            {allCategories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>

          <div className="menu-grid">
            {filtered.map((item, index) => (
              <div
                className="menu-card fade-in"
                key={`${activeCategory}-${item.name}`}
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
                  <div className="card-overlay" />
                </div>
                <div className="menu-info">
                  <p className="category-tag">{item.category}</p>
                  <h3>{item.name}</h3>
                  <p className="price">₹ {item.price}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Details Modal */}
      {selectedItem && (
        <div className="details-overlay" onClick={() => setSelectedItem(null)}>
          <div className="details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="details-close" onClick={() => setSelectedItem(null)}>✕</button>

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
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Menu;