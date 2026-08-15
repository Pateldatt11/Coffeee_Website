import React, { useEffect, useRef, useCallback } from "react";
import "./Home.css";

const products = [
  {
    name: "Espresso",
    img: "https://www.sharmispassions.com/wp-content/uploads/2012/07/espresso-coffee-recipe04-500x500.jpg",
  },
  {
    name: "Cappuccino",
    img: "https://www.nescafe.com/nz/sites/default/files/2023-09/NESCAF%C3%89%20Cappuccino%20step%201%20mobile.jpg",
  },
  {
    name: "Latte",
    img: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Caffe_Latte_at_Pulse_Cafe.jpg",
  },
  {
    name: "Cold Coffee",
    img: "https://bakewithshivesh.com/wp-content/uploads/2021/04/IMG_3613-scaled.jpg",
  },
  {
    name: "Frappuccino",
    img: "https://food.fnr.sndimg.com/content/dam/images/food/fullset/2023/3/27/chocolate-frappuccino.jpg.rend.hgtvcom.1280.960.85.suffix/1679946919979.webp",
  },
  {
    name: "Cortado",
    img: "https://cdn.shopify.com/s/files/1/0801/7530/0936/files/WK_Social_10062022_4_2048x2048.png?v=1711995048",
  },
];

const marqueeItems = [
  "☕ Specialty Brews",
  "⚡ High-Speed WiFi",
  "💻 Coding Zones",
  "🚀 Tech Meetups",
  "🎯 Daily Hackathons",
  "🌙 Open 24/7",
];



const allMarquee = [...marqueeItems, ...marqueeItems];

const Home = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (dotRef.current) {
      dotRef.current.style.left = e.clientX + "px";
      dotRef.current.style.top = e.clientY + "px";
    }
    if (ringRef.current) {
      ringRef.current.style.left = e.clientX + "px";
      ringRef.current.style.top = e.clientY + "px";
    }
  }, []);

  const addHover = useCallback(() => {
    ringRef.current?.classList.add("hovered");
  }, []);
  const rmvHover = useCallback(() => {
    ringRef.current?.classList.remove("hovered");
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);

    const hoverTargets = document.querySelectorAll(
      "button, a, .product-card, .features-list li",
    );
    hoverTargets.forEach((el) => {
      el.addEventListener("mouseenter", addHover);
      el.addEventListener("mouseleave", rmvHover);
    });

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      hoverTargets.forEach((el) => {
        el.removeEventListener("mouseenter", addHover);
        el.removeEventListener("mouseleave", rmvHover);
      });
      observer.disconnect();
    };
  }, [onMouseMove, addHover, rmvHover]);

  return (
    <div className="home-page">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      <section className="hero-section">
        <div className="hero-left">
          <p className="hero-eyebrow">
            <span /> Surat's Premimum Coffee Hub
          </p>

          <h1 className="cafe-title">
            Brew Haven
            <span className="title-brand">
              
             
              Sip. Relax. Repeat.
            </span>
          </h1>

          <p className="tagline">
            Where Every Sip Feels Like Home

          </p>

          <div className="hero-cta">
            <a href="/menu" className="primary-btn">
              <span>Explore Menu</span>
            </a>
            <a href="/order" className="secondary-btn">
              Order Online
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">24/7</span>
              <span className="stat-label">Always Open</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">40+</span>
              <span className="stat-label">Brew Options</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">1G</span>
              <span className="stat-label">WiFi Speed</span>
            </div>
          </div>
        </div>

       
        <div className="hero-right">
          <div className="orbit-container">
           
            <div className="ring-deco" />
            <div className="ring-deco" />

           
            <div className="orbit-ring">
              {products.map((product, index) => (
                <div
                  key={product.name}
                  className="orbit-item"
                  style={{
                    "--rotate": `${index * 60}deg`,
                    "--delay": `${index * 1.1}s`,
                  }}
                >
                  <div className="product-card">
                    <img
                      src={product.img}
                      alt={product.name}
                      className="product-img"
                    />
                    <span className="product-name">{product.name}</span>
                  </div>
                </div>
              ))}
            </div>

            
            <div className="center-cup">
              <img
                src="https://images.unsplash.com/photo-1674336771947-8bf8fadb7f70?q=80&w=1025&auto=format&fit=crop"
                alt="LevelUP Signature Cup"
              />
              <div className="cup-glow" />
            </div>

            
            <div className="hero-badge">
              <div className="badge-num">★ 4.9</div>
              <div className="badge-text">Rating</div>
            </div>
          </div>
        </div>

      
        <div className="scroll-hint">
          <span className="scroll-line" />
          Scroll to explore
        </div>
      </section>

      
      <div className="marquee-strip" aria-hidden="true">
        <div className="marquee-track">
          {allMarquee.map((item, i) => (
            <span key={i} className="marquee-item">
              {item}
              <span className="marquee-dot" />
            </span>
          ))}
        </div>
      </div>

     
      <section className="about-section">
        <div className="about-container">
         
          <div className="about-image fade-in">
            <div className="img-frame">
              <img
                src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1470&auto=format&fit=crop"
                alt="Coders enjoying coffee at LevelUP Cafe"
              />
              <div className="image-overlay">
                <p className="overlay-text">Where Debugging Meets Delight</p>
              </div>
            </div>

            <div className="float-card">
              <div className="fc-num">500+</div>
              <div className="fc-label">Daily Coders</div>
            </div>
          </div>

         
          <div className="about-text fade-in">
            <p className="section-tag">Our Story</p>

            <h2>
              Your Everyday Coffee Destination in Surat
              <br />
             
            </h2>

            <p>
             Welcome to Brew Haven—a place where great coffee, good conversations, and relaxing moments come together.

Whether you're meeting friends, taking a break, working for a while, or simply enjoying your favorite brew, we've created a warm and comfortable space just for you.

From bold espressos and creamy lattes to refreshing cold brews, every cup is freshly crafted with care.

Great Coffee. Cozy Vibes. Every Day.
            </p>

            <ul className="features-list">
              <li>
                <span className="feat-icon">☕</span>Freshly Brewed Coffee
                Internet
              </li>
              <li>
                <span className="feat-icon">🌿</span>Cozy & Comfortable Ambience
              </li>
              <li>
                <span className="feat-icon">📶</span>Free High-Speed Wi-Fi
              </li>
              <li>
                <span className="feat-icon">🪑</span>Comfortable Seating
              </li>
              <li>
                <span className="feat-icon">🥐</span>Fresh Bites & Beverages
              </li>
              <li>
                <span className="feat-icon">💛</span>Friendly Service
              </li>
            </ul>

           <div className="hero-cta">
            <a href="/menu" className="primary-btn">
              <span>Discover More </span>
            </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
