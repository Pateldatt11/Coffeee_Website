import React, { useState, useEffect, useRef } from "react";
import "./Nav.css";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

// Mega-menu content for the "Menu" nav item.
// These are the ACTUAL categories that exist in menuData.js (coffeeMenu).
// Every "to" links to /menu?category=<exact category string from menuData.js>
// so Menu.jsx (updated separately) can read it and filter correctly.
// If you add/rename a category in menuData.js, update it here too — the
// two files aren't automatically linked, this list is manual.
const MENU_COLUMNS = [
  {
    title: "Espresso Drinks",
    icon: "☕",
    links: [
      { label: "Classic Espresso", to: "/menu?category=Classic%20Espresso" },
      { label: "Espresso + Milk", to: "/menu?category=Espresso%20%2B%20Milk" },
      { label: "Flavored", to: "/menu?category=Flavored" },
    ],
  },
  {
    title: "Cold & Iced",
    icon: "🧊",
    links: [
      { label: "Cold Coffee", to: "/menu?category=Cold%20Coffee" },
      { label: "Blended / Iced", to: "/menu?category=Blended%2FIced" },
      { label: "Modern", to: "/menu?category=Modern" },
    ],
  },
  {
    title: "Specialty & Regional",
    icon: "🌍",
    links: [
      { label: "Regional", to: "/menu?category=Regional" },
      { label: "Strong", to: "/menu?category=Strong" },
      { label: "Dessert Coffee", to: "/menu?category=Dessert%20Coffee" },
      { label: "Flaming", to: "/menu?category=Flaming" },
    ],
  },
];

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false); // mobile hamburger menu
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false); // mega menu
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Profile fields that live in Firestore (users/{uid}), NOT on the
  // Firebase Auth user object. Profile.jsx writes photoURL/name here,
  // so Nav has to read from the same place or the avatar never updates.
  const [profileData, setProfileData] = useState({ photoURL: "", name: "" });

  const navigate = useNavigate();
  const dropdownRef = useRef(null); // used to detect outside clicks

  const toggleMenu = () => setIsOpen(!isOpen);

  // Slightly denser/darker navbar once the page has scrolled — matches
  // the .navbar.scrolled class already defined in Nav.css.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Live-subscribe to the user's Firestore doc instead of fetching it once.
  // getDoc() only ran when `user` changed (i.e. on login) — if the photo
  // was updated later from the Profile page without a full page reload,
  // Nav had no way of knowing. onSnapshot fires again automatically every
  // time the doc changes, anywhere in the app, no refresh required.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setProfileData({ photoURL: "", name: "" });
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsAdmin(data.role === "admin");
          setProfileData({
            photoURL: data.photoURL || "",
            name: data.name || "",
          });
        } else {
          setIsAdmin(false);
          setProfileData({ photoURL: "", name: "" });
        }
      },
      (err) => {
        console.error("Nav user doc listener failed:", err);
        setIsAdmin(false);
        setProfileData({ photoURL: "", name: "" });
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Close the mega menu when you click anywhere outside it, or press Escape.
  useEffect(() => {
    if (!isMenuDropdownOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsMenuDropdownOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsMenuDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuDropdownOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
      navigate("/signup");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Prefer Firestore's saved photo/name (kept in sync by Profile.jsx),
  // fall back to the Firebase Auth user object, then to the email prefix.
  const photoURL = profileData.photoURL || user?.photoURL || "";
  const displayName =
    profileData.name?.split(" ")[0] ||
    (user?.displayName ? user.displayName.split(" ")[0] : "") ||
    user?.email?.split("@")[0] ||
    "Brewer";

  const closeAllMenus = () => {
    setIsOpen(false);
    setIsMenuDropdownOpen(false);
  };

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-container">
        {/* Logo — SVG coffee cup mark instead of the ⚡☕ emoji pair */}
        <div className="logo">
          <Link to="/" className="logo-text" onClick={closeAllMenus}>
            <svg
              className="brand-mark"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 15.5c-1.4-.55-2.4-1.7-2.4-3.05 0-1.87 1.9-3.38 4.25-3.38h7.3c2.35 0 4.25 1.5 4.25 3.38 0 1.87-1.9 3.38-4.25 3.38"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M4.5 9.6h13.2v6.3c0 2.15-1.83 3.9-4.08 3.9H8.58c-2.25 0-4.08-1.75-4.08-3.9V9.6Z"
                fill="currentColor"
                fillOpacity="0.16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M4 20.2h13.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M9 3.2c-.6.75-.6 1.3 0 2.05M12.3 3.2c-.6.75-.6 1.3 0 2.05"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            Brew Haven
          </Link>
        </div>

        {/* Hamburger */}
        <div
          className={`hamburger ${isOpen ? "active" : ""}`}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Nav Links */}
        <ul className={`nav-menu ${isOpen ? "active" : ""}`}>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeAllMenus}
            >
              Home
            </NavLink>
          </li>

          {/* Menu item with mega-dropdown — click to open/close. */}
          <li className="nav-item-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`nav-link dropdown-trigger ${isMenuDropdownOpen ? "active" : ""}`}
              onClick={() => setIsMenuDropdownOpen((prev) => !prev)}
              aria-expanded={isMenuDropdownOpen}
            >
              Menu
              <svg
                className={`chevron ${isMenuDropdownOpen ? "flipped" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div
              className={`mega-dropdown ${isMenuDropdownOpen ? "open" : ""}`}
            >
              <div className="mega-dropdown-inner">
                {MENU_COLUMNS.map((column, colIndex) => (
                  <div
                    className="mega-column"
                    key={column.title}
                    style={{ "--col-delay": `${colIndex * 0.05}s` }}
                  >
                    <span className="mega-column-title">
                      <span className="mega-column-icon">{column.icon}</span>
                      {column.title}
                    </span>
                    {column.links.map((item) => (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        className="mega-link"
                        onClick={closeAllMenus}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ))}

                <div
                  className="mega-column mega-featured"
                  style={{ "--col-delay": `${MENU_COLUMNS.length * 0.05}s` }}
                >
                  <span className="mega-column-title">Full Menu</span>
                  <NavLink
                    to="/menu"
                    className="mega-featured-card"
                    onClick={closeAllMenus}
                  >
                    <span className="mega-featured-heading">
                      Browse everything
                    </span>
                    <span className="mega-featured-sub">
                      All 50+ drinks, filterable by category
                    </span>
                    <span className="mega-featured-arrow">→</span>
                  </NavLink>
                </div>
              </div>
            </div>
          </li>

          {/* FIX: About and FAQ were previously nested (<li><NavLink About/><li><NavLink FAQ/></li></li>)
              — a <li> can't contain another <li> directly, only a <ul>/<ol> can.
              Browsers "fix" this silently by hoisting the inner <li> out, which
              usually still renders okay visually but is invalid HTML and can
              cause subtle CSS/accessibility bugs. Now they're proper siblings. */}
          <li>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeAllMenus}
            >
              About
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/faq"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeAllMenus}
            >
              FAQ
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/order"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeAllMenus}
            >
              Order Online
            </NavLink>
          </li>

          {/* Admin Panel link — only visible to logged-in users whose
              Firestore role is "admin". Regular customers never see this. */}
          {isAdmin && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
                onClick={closeAllMenus}
              >
                Admin Panel
              </NavLink>
            </li>
          )}

          {/* Auth Section */}
          <li className="auth-buttons">
            {user ? (
              /* ── Logged-in state ── */
              <NavLink
                to="/profile"
                className="user-section"
                onClick={closeAllMenus}
              >
                <div className="user-avatar">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={displayName}
                      className="avatar-img"
                    />
                  ) : (
                    <span className="avatar-initials">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="user-name">Hey, {displayName}!</span>
                <button
                  className="logout-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </NavLink>
            ) : (
              /* ── Logged-out state ── */
              <>
                <Link
                  to="/login"
                  className="nav-link login-btn"
                  onClick={closeAllMenus}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="nav-link signup-btn"
                  onClick={closeAllMenus}
                >
                  Sign Up
                </Link>
              </>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Nav;