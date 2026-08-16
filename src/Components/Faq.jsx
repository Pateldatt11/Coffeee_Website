import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FAQ.css';

// Edit this with your real FAQ content. Grouped by category so the page
// stays organized as it grows — add a new category key and it'll get its
// own section automatically.
const FAQ_DATA = {
  'Orders & Delivery': [
    {
      q: 'How long does delivery take?',
      a: 'Most orders arrive within 25–40 minutes, depending on your location and how busy we are. You\'ll get a status update in your Profile page as your order moves from Placed → Preparing → Out for Delivery → Completed.'
    },
    {
      q: 'Do you offer pickup / dine-in instead of delivery?',
      a: 'Yes — visit us in person and order at the counter, or place an order online and mention pickup in the special instructions field at checkout.'
    },
    {
      q: 'Can I track my order?',
      a: 'Yes. Log in and open your Profile page — every order shows its current status and full item breakdown.'
    },
    {
      q: 'What if my order arrives wrong or incomplete?',
      a: 'Contact us directly with your order ID and we\'ll sort it out — a remake or refund, whichever fits. You can also leave a rating and comment on the order from your Profile page once it\'s marked Completed, which helps us catch recurring issues.'
    },
  ],
  'Payments': [
    {
      q: 'What payment methods do you accept?',
      a: 'UPI, all major debit/credit cards, netbanking, popular wallets (via Razorpay), and Cash on Delivery.'
    },
    {
      q: 'Is it safe to pay online?',
      a: 'Yes — all online payments are processed securely through Razorpay. We never see or store your card details.'
    },
    {
      q: 'My payment was deducted but the order didn\'t confirm — what now?',
      a: 'This is rare, but if it happens you\'ll see a message with your Payment ID on screen — save it and contact us with that ID so we can confirm your order manually. Your money is safe either way.'
    },
  ],
  'Menu & Customization': [
    {
      q: 'Can I customize my coffee (milk type, sugar level)?',
      a: 'Yes — full cream, low fat, oat, almond, or soy milk (small extra charge for plant-based options), and sugar-free / less-sugar on request.'
    },
    {
      q: 'Do you have non-coffee options?',
      a: 'Yes — Masala Chai, Hot Chocolate, Fresh Lemonade, Iced Tea, and more. Check the Menu page for the full list.'
    },
    {
      q: 'Do you cater to allergies?',
      a: 'Our kitchen handles nuts, gluten, and dairy, so please tell us about any allergy before ordering — either in the checkout notes or by asking our chat assistant.'
    },
  ],
  'Account & Loyalty': [
    {
      q: 'Do I need an account to order?',
      a: 'You can browse the full menu without one, but placing an order and tracking it requires a quick sign-up — it also unlocks order history and the loyalty program.'
    },
    {
      q: 'How does the loyalty program work?',
      a: 'Every 8th coffee is on us. Points build up automatically on your account as you order — no card to carry, no code to remember.'
    },
    {
      q: 'I forgot my password — what do I do?',
      a: 'Use the "Forgot password?" link on the Login page to reset it via email.'
    },
  ],
};

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [openIndex, setOpenIndex] = useState(null); // `${category}-${i}` currently expanded

  const dotRef = useRef(null);
  const ringRef = useRef(null);

  const allCategories = ['All', ...Object.keys(FAQ_DATA)];

  const visibleCategories =
    activeCategory === 'All' ? Object.keys(FAQ_DATA) : [activeCategory];

  // ── cursor dot/ring, matching Menu.jsx / OrderOnline.jsx ──
  const onMouseMove = useCallback((e) => {
    if (dotRef.current) { dotRef.current.style.left = e.clientX + 'px'; dotRef.current.style.top = e.clientY + 'px'; }
    if (ringRef.current) { ringRef.current.style.left = e.clientX + 'px'; ringRef.current.style.top = e.clientY + 'px'; }
  }, []);

  const addHover = useCallback(() => { ringRef.current?.classList.add('hovered'); }, []);
  const rmvHover = useCallback(() => { ringRef.current?.classList.remove('hovered'); }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const hoverTargets = document.querySelectorAll('button, .faq-item, .filter-btn');
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
  }, [onMouseMove, addHover, rmvHover, activeCategory]);

  const toggleItem = (key) => {
    setOpenIndex((prev) => (prev === key ? null : key));
  };

  return (
    <div className="faq-page">

      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      {/* Hero — same structure as Menu.jsx hero */}
      <section className="faq-hero">
        <div className="faq-hero-content">
          <p className="faq-eyebrow"><span />Got Questions?</p>
          <h1 className="faq-title">
            Frequently<br />
            <span className="title-brand">Asked</span>
          </h1>
          <p className="faq-hero-sub">
            Orders, payments, menu customization, loyalty — everything<br />
            you need to know, all in one place ☕
          </p>
        </div>

        <div className="scroll-hint">
          <span className="scroll-line" />
          Scroll to explore
        </div>
      </section>

      <section className="faq-section">
        <div className="faq-container">

          <div className="section-header fade-in">
            <p className="section-tag">Help Center</p>
            <h2>Find Your <em>Answer</em></h2>
          </div>

          <div className="filter-bar fade-in">
            {allCategories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {visibleCategories.map((category) => (
            <div className="faq-group" key={category}>
              <h3 className="faq-group-title fade-in">{category}</h3>

              <div className="faq-list">
                {FAQ_DATA[category].map((item, i) => {
                  const key = `${category}-${i}`;
                  const isOpen = openIndex === key;
                  return (
                    <div
                      className={`faq-item fade-in ${isOpen ? 'open' : ''}`}
                      key={key}
                      style={{ transitionDelay: `${(i % 6) * 0.06}s` }}
                    >
                      <button
                        className="faq-question"
                        onClick={() => toggleItem(key)}
                        aria-expanded={isOpen}
                      >
                        <span>{item.q}</span>
                        <svg
                          className={`faq-chevron ${isOpen ? 'flipped' : ''}`}
                          width="14" height="14" viewBox="0 0 12 12" fill="none"
                        >
                          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <div className="faq-answer-wrap">
                        <p className="faq-answer">{item.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="faq-cta fade-in">
            <p className="section-tag" style={{ marginBottom: '0.6rem' }}>Still stuck?</p>
            <h3>Ask Bru, our barista chatbot ☕</h3>
            <p className="faq-cta-sub">Bottom-left corner of the screen — available anytime.</p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default FAQ;