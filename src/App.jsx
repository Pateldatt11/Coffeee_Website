import { Routes, Route, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import Footer from './Components/Footer';
import Nav from './Components/Nav';
import Home from './Pages/Home';
import './App.css';
import Menu from './Pages/Menu';
import About from './Pages/About';
import FAQ from './Pages/FAQ';
import OrderOnline from './Pages/OrderOnline';
import CustomizeCoffee from './Pages/CustomizeCoffee';
import Signup from './Pages/Signup';
import Login from './Pages/Login';
import ForgotPassword from './Pages/Forgotpassword';
import ResetPassword from './Pages/Resetpassword';
import AdminPanel from './Pages/Adminpanel';
import Profile from './Pages/Profile';
import ScrollToTop from './Components/ScrollToTop';
import ProtectedRoute from './Components/Protectedroute';
import { trackVisit } from './utils/visitTracker';
import Chatbot from './Components/Chatbot';




function App() {
  const location = useLocation();

  useEffect(() => {
    const seoMap = {
      '/': {
        title: 'Brew Haven | Coffee Store & Online Ordering',
        description: 'Explore premium coffee blends, order online, manage your profile, and enjoy a warm coffee shop experience.'
      },
      '/menu': {
        title: 'Menu | Brew Haven Coffee',
        description: 'Browse classic espresso drinks, regional coffees, cold brews, seasonal specials, and more at Brew Haven.'
      },
      '/about': {
        title: 'About Us | Brew Haven Coffee',
        description: 'Learn more about Brew Haven, our coffee story, quality standards, and cozy coffee experience.'
      },
      '/faq': {
        title: 'FAQ | Brew Haven Coffee',
        description: 'Answers to common questions about orders, delivery, payments, menu customization, and the Brew Haven loyalty program.'
      },
      '/order': {
        title: 'Order Online | Brew Haven Coffee',
        description: 'Build your coffee cart, choose your payment method, and place an online order with Brew Haven.'
      },
      '/signup': {
        title: 'Sign Up | Brew Haven Coffee',
        description: 'Create your Brew Haven account to order coffee online, track orders, and manage your profile.'
      },
      '/login': {
        title: 'Login | Brew Haven Coffee',
        description: 'Log in to Brew Haven to manage your account, access your profile, and continue your coffee orders.'
      },
      '/forgot-password': {
        title: 'Forgot Password | Brew Haven Coffee',
        description: 'Request a secure password reset email and regain access to your Brew Haven account.'
      },
      '/reset-password': {
        title: 'Reset Password | Brew Haven Coffee',
        description: 'Set a new Brew Haven password using your secure password reset link.'
      },
      '/profile': {
        title: 'My Profile | Brew Haven Coffee',
        description: 'Update your Brew Haven profile, view your order history, and manage your account details.'
      },
      '/admin': {
        title: 'Admin Panel | Brew Haven Coffee',
        description: 'Manage Brew Haven orders, menu items, users, and analytics from the admin dashboard.'
      }
    };

    const current = seoMap[location.pathname] || {
      title: 'Brew Haven | Coffee Store & Online Ordering',
      description: 'Brew Haven is a coffee website for browsing the menu, ordering online, and managing your account.'
    };

    document.title = current.title;

    const setMeta = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMeta('description', current.description);
    setMeta('robots', location.pathname.startsWith('/admin') ? 'noindex, nofollow' : 'index, follow');
  }, [location.pathname]);

  // Logs one visit doc to Firestore every time the route changes.
  // Skips /admin itself so the admin browsing their own panel
  // doesn't inflate visitor stats.
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    trackVisit(location.pathname);
  }, [location.pathname]);

  return (
    
      <div className="app-layout">
        <Nav />
        <ScrollToTop />

        <main>
          <Routes>


            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />

            <Route path="/menu" element={
              <ProtectedRoute>
                <Menu />
              </ProtectedRoute>
            } />

            <Route path="/about" element={
              <ProtectedRoute>
                <About />
              </ProtectedRoute>
            } />

            <Route path="/faq" element={
              <ProtectedRoute>
                <FAQ />
              </ProtectedRoute>
            } />

            <Route path="/order" element={
              <ProtectedRoute>
                <OrderOnline />
              </ProtectedRoute>
            } />

            <Route path="/customize/:itemId" element={
              <ProtectedRoute>
                <CustomizeCoffee />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } />


            <Route path="/signup" element={<Signup />} />
            <Route path="/login"  element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />



            <Route path="*" element={
              <div style={{
                padding: '100px 20px',
                textAlign: 'center',
                color: '#e0c9a6',
                fontSize: '1.8rem'
              }}>
                <h1>404 - Page Not Found</h1>

                <spline-viewer url="https://prod.spline.design/fOXZ4F6vStngxFR0/scene.splinecode"></spline-viewer>

                <p>
                  Page Not Found ☕<br />
                  Come Home Page <a href="/">Click Here</a>
                </p>
              </div>
            } />

          </Routes>
        </main>

        <Footer />
        <Chatbot />
      </div>
    
  );
}

export default App;