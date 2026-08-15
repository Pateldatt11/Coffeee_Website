import React, { useEffect, useRef, useCallback } from 'react';
import './About.css';

const team = [
  {
    name: 'Arjun Mehta',
    role: 'Head Roaster',
    bio: 'Over 12 years perfecting single-origin roasts from Ethiopia to Colombia.',
    img: 'https://i.pravatar.cc/300?img=11',
  },
  {
    name: 'Priya Sharma',
    role: 'Master Barista',
    bio: 'Regional champion brewer with a passion for pour-over and latte art.',
    img: 'https://i.pravatar.cc/300?img=47',
  },
  {
    name: 'Rahul Desai',
    role: 'Cold Brew Specialist',
    bio: 'Pioneered our signature 24-hour slow-drip cold brew collection.',
    img: 'https://i.pravatar.cc/300?img=68',
  },
];

const stats = [
  { value: '50+',  label: 'Coffee Varieties' },
  { value: '8',    label: 'Years Brewing'    },
  { value: '12K+', label: 'Happy Customers'  },
  { value: '4',    label: 'Origin Farms'     },
];

const About = () => {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (dotRef.current)  { dotRef.current.style.left  = e.clientX + 'px'; dotRef.current.style.top  = e.clientY + 'px'; }
    if (ringRef.current) { ringRef.current.style.left = e.clientX + 'px'; ringRef.current.style.top = e.clientY + 'px'; }
  }, []);

  const addHover = useCallback(() => { ringRef.current?.classList.add('hovered'); }, []);
  const rmvHover = useCallback(() => { ringRef.current?.classList.remove('hovered'); }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const hoverTargets = document.querySelectorAll('button, a, .team-card, .stat-card');
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
  }, [onMouseMove, addHover, rmvHover]);

  return (
    <div className="about-page">

      <div className="cursor-dot"  ref={dotRef}  />
      <div className="cursor-ring" ref={ringRef} />

      {/* ── HERO ── */}
      <section className="about-hero">
        <div className="about-hero-content">
          <p className="about-eyebrow"><span />Our Story</p>
          <h1 className="about-title">
            Brewed with Passion<br />
            <span className="title-brand"></span>
          </h1>
          <p className="about-hero-sub">
            Brew Haven was created with one simple goal—to serve exceptional coffee in a space where everyone feels welcome.

From carefully crafted brews to a cozy atmosphere, every detail is designed to make your visit memorable. Whether it's your first cup or your hundredth, we're here to make every sip special.

Made with Passion. Shared with You.
          </p>
        </div>

        <div className="about-hero-img-wrap fade-in">
          <img
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80"
            alt="Barista brewing coffee"
            className="about-hero-img"
          />
          <div className="about-hero-img-overlay" />
        </div>

        <div className="scroll-hint">
          <span className="scroll-line" />
          Scroll to explore
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="stats-strip">
        {stats.map((s, i) => (
          <div className="stat-card fade-in" key={i} style={{ transitionDelay: `${i * 0.1}s` }}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── MISSION ── */}
      <section className="mission-section">
        <div className="mission-container">

          <div className="mission-img-wrap fade-in">
            <div className="img-frame">
              <img
                src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=700&q=80"
                alt="Coffee being poured"
              />
              <div className="image-overlay">
                <p className="overlay-text">Every Cup, Made with Care</p>
              </div>
            </div>
            <div className="float-card">
              <div className="fc-num">500+</div>
              <div className="fc-label">Daily Coffee Lovers</div>
            </div>
          </div>

          <div className="mission-text fade-in">
            <p className="section-tag">Why We Exist</p>
            <h2>
              Crafted for Every Coffee Moment<br />
              <em></em>
            </h2>
            <p>
              We created Brew Haven to be a place where great coffee and good company come together.

From handcrafted coffees to a cozy atmosphere, every detail is designed to make your visit relaxing, memorable, and worth coming back for.
            </p>
            
            
          </div>

        </div>
      </section>

      {/* ── VIDEO SECTION ── */}
      <section className="video-section">
        <div className="video-container">
          <div className="section-header fade-in" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="section-tag" style={{ justifyContent: 'center' }}>In Motion</p>
            <h2 className="video-heading">
              The Art Behind Every Cup<br />
              
            </h2>
          </div>

          <div className="video-wrap fade-in">
            <div className="video-border-frame">
              <iframe width="860px" height="485px" src="https://www.youtube.com/embed/tJHTA7jB-DE?si=-uWI2oSqbNvdlXpS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
              <div className="video-overlay-bar">
                <span className="vol-tag">☕ Brewed Fresh Daily · Surat's Finest</span>
              </div>
            </div>

            <div className="video-side-text">
              <p>
               A perfect cup is more than just coffee — it's a process, a passion, and a craft.

Follow the journey from freshly ground beans to the final pour as our baristas create every cup with attention, skill, and care.

Because every sip deserves to be special.
              </p>
              
            </div>
          </div>
        </div>
      </section>

      
      {/* ── LOCATION ── */}
      <section className="location-section">
        <div className="location-container">

          <div className="section-header fade-in" style={{ marginBottom: '3.5rem' }}>
            <p className="section-tag">Find Us</p>
            <h2 className="location-heading">
              Come Visit<br />
              <em>Our Café</em>
            </h2>
          </div>

          <div className="location-grid">

            <div className="map-wrap fade-in">
              <div className="map-frame">
                <iframe
                  title="Café Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.1667790780602!2d72.8003485!3d21.145760100000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be05203d87284f1%3A0xc550f071f2d34a38!2sShyam%20Mandir%20Rd%2C%20Anand%20Park%2C%20Althan%2C%20Surat%2C%20Gujarat%20395007!5e0!3m2!1sen!2sin!4v1775458548354!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) saturate(0.5) brightness(0.85)' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <div className="location-info fade-in">
              <div className="info-card">
                <div className="info-icon">📍</div>
                <div>
                  <p className="info-title">Address</p>
                  <p className="info-detail">Ring Road, Surat,<br />Gujarat 395002, India</p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">🕐</div>
                <div>
                  <p className="info-title">Hours</p>
                  <p className="info-detail">
                    Mon – Fri: 7:00 AM – 11:00 PM<br />
                    Sat – Sun: 8:00 AM – 12:00 AM
                  </p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">📞</div>
                <div>
                  <p className="info-title">Contact</p>
                  <p className="info-detail">+91 98765 43210<br />hello@brewedwithpassion.in</p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">🚗</div>
                <div>
                  <p className="info-title">Parking</p>
                  <p className="info-detail">Free parking available<br />in the adjacent lot</p>
                </div>
              </div>

              <a
                href="https://maps.google.com/?q=Surat,Gujarat,India"
                target="_blank"
                rel="noopener noreferrer"
                className="primary-btn"
                style={{ marginTop: '1rem', display: 'inline-block' }}
              >
                <span>Get Directions 🗺️</span>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-cta fade-in">
        <p className="section-tag">Ready?</p>
        <h2>Taste the <em>Difference</em></h2>
        <p>Explore our full menu of 50+ world-class coffees.</p>
        <a href="/menu" className="primary-btn"><span>View Menu ☕</span></a>
      </section>

    </div>
  );
};

export default About;