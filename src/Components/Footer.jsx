import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="cafe-footer">
      <div className="footer-container">
      
        <div className="footer-brand">
          <img
            src="https://i.etsystatic.com/62943116/r/il/e1c73d/7644927846/il_fullxfull.7644927846_o10i.jpg"
            alt="Brew Haven Logo"
            className="footer-logo"
          />
          <h3>Brew Haven</h3>
          <p className="tagline">Code. Coffee. Creativity.</p>
        </div>

       
        <div className="footer-column">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/menu">Menu</a></li>
            <li><a href="/reviews">Reviews</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </div>

   
        <div className="footer-column">
          <h4>Get in Touch</h4>
          <ul>
            <li>Surat, Gujarat, India</li>
            <li>contact@levelupcafe.com</li>
            <li>+91 98765 43210</li>
          </ul>
        </div>

       
        <div className="footer-column">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a href="https://www.instagram.com/d_a_t_t_p_a_t_e_l_1_8?igsh=NWJhcTJjMWw3cml3" className="social-icon">Instagram</a>
            <a href="#" className="social-icon">Twitter (X)</a>
            <a href="https://github.com/Pateldatt11" className="social-icon">GitHub</a>
            <a href="https://www.youtube.com/@PatelDatt18" className="social-icon">YouTube</a>
          </div>
        </div>
      </div>

     
      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} Brew Haven.
          Made with ☕ & ❤️ by Coders
        </p>
      </div>
    </footer>
  );
};

export default Footer;