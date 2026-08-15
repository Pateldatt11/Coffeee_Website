import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc, getDoc, updateDoc, deleteDoc, addDoc,
  collection, onSnapshot, query, orderBy, limit, writeBatch, serverTimestamp
} from 'firebase/firestore';
import Chart from 'chart.js/auto';
import { auth, db } from '../firebase';
import { coffeeMenu } from '../data/menuData'; // used ONLY to one-time seed Firestore
import './AdminPanel.css';

// ============================================================
// ACCESS CONTROL
// Admin access = Firestore users/{uid}.role === "admin".
// Rechecked on every load. IMPORTANT: this JS-side check is NOT
// enough on its own. Anyone can open devtools and bypass it.
// You MUST add a matching Firestore Security Rule, e.g.:
//
//   match /orders/{orderId} {
//     allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
//   }
//
// Do this for orders, menu, and users collections. Without the
// rule, this file is UI only — not real security.
//
// ANALYTICS NOTE:
// "Active right now" (true live presence) is NOT included here —
// that needs a heartbeat system (write every N seconds while a tab
// is open), which is separate, heavier infrastructure. What IS here:
// total visits, unique visitors, and a daily trend, all built from
// real site_visits documents (see utils/visitTracker.js + App.js).
// ============================================================

const ORDER_STATUSES = ['placed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];

// Cap on live-loaded docs per collection. Raise this or add real
// pagination/date-range filtering once data volume grows past this.
const LIST_LIMIT = 500;

// Firestore batch writes cap at 500 operations. Chunk any batch
// seeding into groups this size or smaller.
const BATCH_CHUNK_SIZE = 450;

const AdminPanel = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminUid, setAdminUid] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [activeTab, setActiveTab] = useState('orders'); // orders | menu | users | analytics

  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [seeding, setSeeding] = useState(false);

  const [newItem, setNewItem] = useState({ name: '', category: '', price: '', img: '' });

  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // ---- cursor animation ----
  const onMouseMove = useCallback((e) => {
    if (dotRef.current) { dotRef.current.style.left = `${e.clientX}px`; dotRef.current.style.top = `${e.clientY}px`; }
    if (ringRef.current) { ringRef.current.style.left = `${e.clientX}px`; ringRef.current.style.top = `${e.clientY}px`; }
  }, []);
  const addHover = useCallback(() => ringRef.current?.classList.add('hovered'), []);
  const rmvHover = useCallback(() => ringRef.current?.classList.remove('hovered'), []);

  // FIX: previously this effect depended on [activeTab, orders, menuItems, users, visits]
  // and re-ran querySelectorAll('button, a, input, select') on the WHOLE page every time
  // Firestore pushed new data (which is constantly, since these are live onSnapshot
  // listeners). On tables with many rows this got expensive fast and could freeze the
  // tab, which looks exactly like "data stopped coming in."
  //
  // Fixed with event delegation: ONE listener on `document` for mouseover/mouseout,
  // using e.target.closest() to detect if the hovered element matches. This never
  // needs to re-scan the DOM and never needs to depend on live data, so it only runs
  // once for the lifetime of this component.
  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);

    const handleMouseOver = (e) => {
      if (e.target.closest('button, a, input, select')) addHover();
    };
    const handleMouseOut = (e) => {
      if (e.target.closest('button, a, input, select')) rmvHover();
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [onMouseMove, addHover, rmvHover]);

  // ---- auth + role check ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/login'); return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.exists() ? snap.data().role : null;
        if (role === 'admin') {
          setAuthorized(true);
          setAdminUid(user.uid);
          setAdminEmail(user.email || '');
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Admin check failed:', err);
        navigate('/');
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  // Live-watch the admin's own user doc so a role change (by them or
  // anyone else) kicks them out immediately instead of only on next
  // page load.
  useEffect(() => {
    if (!authorized || !adminUid) return;
    const unsubSelf = onSnapshot(doc(db, 'users', adminUid), (snap) => {
      const role = snap.exists() ? snap.data().role : null;
      if (role !== 'admin') {
        signOut(auth).finally(() => navigate('/'));
      }
    }, (err) => console.error('Self role listener error:', err));
    return () => unsubSelf();
  }, [authorized, adminUid, navigate]);

  // ---- live data subscriptions (only once authorized) ----
  useEffect(() => {
    if (!authorized) return;

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(LIST_LIMIT)),
      (snap) => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Orders listener error:', err)
    );

    const unsubMenu = onSnapshot(
      query(collection(db, 'menu'), limit(LIST_LIMIT)),
      (snap) => setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Menu listener error:', err)
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), limit(LIST_LIMIT)),
      (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Users listener error:', err)
    );

    // Last 3000 visit events, newest first. If your site gets heavy
    // traffic, raise/lower this or add date-range filtering later.
    const unsubVisits = onSnapshot(
      query(collection(db, 'site_visits'), orderBy('createdAt', 'desc'), limit(3000)),
      (snap) => setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Visits listener error:', err)
    );

    return () => { unsubOrders(); unsubMenu(); unsubUsers(); unsubVisits(); };
  }, [authorized]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  // ================= ORDERS =================
  const updateOrderStatus = async (orderId, status) => {
    try { await updateDoc(doc(db, 'orders', orderId), { status }); }
    catch (err) { console.error('Failed to update order status:', err); alert('Could not update order status.'); }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Delete this order permanently?')) return;
    try { await deleteDoc(doc(db, 'orders', orderId)); }
    catch (err) { console.error('Failed to delete order:', err); alert('Could not delete order.'); }
  };

  // ================= MENU =================
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category || !newItem.price) {
      alert('Name, category and price are required.');
      return;
    }
    const priceNum = Number(newItem.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      alert('Price must be a valid, non-negative number.');
      return;
    }
    try {
      await addDoc(collection(db, 'menu'), {
        name: newItem.name,
        category: newItem.category,
        price: priceNum,
        img: newItem.img || '',
        createdAt: serverTimestamp()
      });
      setNewItem({ name: '', category: '', price: '', img: '' });
    } catch (err) {
      console.error('Failed to add menu item:', err);
      alert('Could not add menu item.');
    }
  };

  const updateMenuItem = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'menu', id), { [field]: field === 'price' ? Number(value) : value });
    } catch (err) {
      console.error('Failed to update menu item:', err);
    }
  };

  // Price input validated first, reverted to last good value on invalid input
  // (Number('') === NaN, and NaN !== oldPrice is always true, so an unvalidated
  // blur would previously write NaN straight to Firestore).
  const handlePriceBlur = (item, e) => {
    const raw = e.target.value;
    const parsed = Number(raw);
    if (raw.trim() === '' || Number.isNaN(parsed) || parsed < 0) {
      alert('Price must be a valid, non-negative number. Reverting to previous value.');
      e.target.value = item.price;
      return;
    }
    if (parsed !== item.price) {
      updateMenuItem(item.id, 'price', parsed);
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Remove this item from the menu?')) return;
    try { await deleteDoc(doc(db, 'menu', id)); }
    catch (err) { console.error('Failed to delete menu item:', err); alert('Could not delete item.'); }
  };

  // Firestore batches cap at 500 writes, so seeding is chunked into
  // groups of BATCH_CHUNK_SIZE and committed sequentially.
  const seedMenuFromStaticData = async () => {
    if (menuItems.length > 0) {
      const ok = window.confirm(
        `Firestore already has ${menuItems.length} menu items. Importing again will create duplicates. Continue anyway?`
      );
      if (!ok) return;
    }
    setSeeding(true);
    try {
      for (let i = 0; i < coffeeMenu.length; i += BATCH_CHUNK_SIZE) {
        const chunk = coffeeMenu.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          const ref = doc(collection(db, 'menu'));
          batch.set(ref, { ...item, price: Number(item.price), createdAt: serverTimestamp() });
        });
        await batch.commit();
      }
      alert('Menu imported into Firestore successfully.');
    } catch (err) {
      console.error('Seeding failed:', err);
      alert('Could not import menu. Check console for details.');
    } finally {
      setSeeding(false);
    }
  };

  // ================= USERS =================
  const updateUserRole = async (uid, role) => {
    if (uid === adminUid && role !== 'admin') {
      const ok = window.confirm("You're about to remove your own admin access. You will be logged out of this panel. Continue?");
      if (!ok) return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      // The onSnapshot listener on the admin's own doc (above) catches this
      // change and forces sign-out right away if it was a self-demotion.
    } catch (err) {
      console.error('Failed to update user role:', err);
      alert('Could not update user role.');
    }
  };

  // ================= ANALYTICS (derived, no extra reads) =================
  const analytics = useMemo(() => {
    const itemQty = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        itemQty[item.name] = (itemQty[item.name] || 0) + (item.qty || 0);
      });
    });
    const itemSales = Object.entries(itemQty).sort((a, b) => b[1] - a[1]);
    const topSellers = itemSales.slice(0, 8);
    const worstSellers = [...itemSales].reverse().slice(0, 8);

    const paymentStats = {};
    orders.forEach(order => {
      const method = order.paymentMethod || 'Unknown';
      if (!paymentStats[method]) paymentStats[method] = { count: 0, amount: 0 };
      paymentStats[method].count += 1;
      paymentStats[method].amount += Number(order.amount) || 0;
    });

    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const totalOrders = orders.length;

    const totalVisits = visits.length;
    const uniqueVisitors = new Set(visits.map(v => v.visitorId).filter(Boolean)).size;

    const dayMap = {};
    visits.forEach(v => {
      const d = v.createdAt?.toDate ? v.createdAt.toDate() : (v.createdAt ? new Date(v.createdAt) : null);
      if (!d || Number.isNaN(d.getTime())) return;
      const sortKey = d.toISOString().slice(0, 10); // YYYY-MM-DD, sorts correctly
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      if (!dayMap[sortKey]) dayMap[sortKey] = { label, count: 0 };
      dayMap[sortKey].count += 1;
    });
    const sortedKeys = Object.keys(dayMap).sort();
    const dayLabels = sortedKeys.map(k => dayMap[k].label);
    const dayCounts = sortedKeys.map(k => dayMap[k].count);

    return { topSellers, worstSellers, paymentStats, totalRevenue, totalOrders, totalVisits, uniqueVisitors, dayLabels, dayCounts };
  }, [orders, visits]);

  // ---- chart refs + instances ----
  const salesCanvasRef = useRef(null);
  const paymentCanvasRef = useRef(null);
  const visitsCanvasRef = useRef(null);
  const salesChartRef = useRef(null);
  const paymentChartRef = useRef(null);
  const visitsChartRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'analytics') return;

    if (salesCanvasRef.current) {
      if (salesChartRef.current) salesChartRef.current.destroy();
      salesChartRef.current = new Chart(salesCanvasRef.current, {
        type: 'bar',
        data: {
          labels: analytics.topSellers.map(([name]) => name),
          datasets: [{
            data: analytics.topSellers.map(([, qty]) => qty),
            backgroundColor: 'rgba(201, 149, 108, 0.85)',
            borderRadius: 8,
            maxBarThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#a89070', maxRotation: 40, minRotation: 40 }, grid: { display: false } },
            y: { ticks: { color: '#a89070', precision: 0 }, grid: { color: 'rgba(201,149,108,0.1)' } }
          }
        }
      });
    }

    if (paymentCanvasRef.current) {
      if (paymentChartRef.current) paymentChartRef.current.destroy();
      const methods = Object.keys(analytics.paymentStats);
      paymentChartRef.current = new Chart(paymentCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: methods,
          datasets: [{
            data: methods.map(m => analytics.paymentStats[m].amount),
            backgroundColor: ['#c9956c', '#8b6a4a', '#e8c99a', '#5c4326'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: '#f0e6d3' } } }
        }
      });
    }

    if (visitsCanvasRef.current) {
      if (visitsChartRef.current) visitsChartRef.current.destroy();
      visitsChartRef.current = new Chart(visitsCanvasRef.current, {
        type: 'line',
        data: {
          labels: analytics.dayLabels,
          datasets: [{
            data: analytics.dayCounts,
            borderColor: '#c9956c',
            backgroundColor: 'rgba(201, 149, 108, 0.15)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#c9956c'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#a89070' }, grid: { display: false } },
            y: { ticks: { color: '#a89070', precision: 0 }, grid: { color: 'rgba(201,149,108,0.1)' } }
          }
        }
      });
    }

    return () => {
      salesChartRef.current?.destroy();
      paymentChartRef.current?.destroy();
      visitsChartRef.current?.destroy();
    };
  }, [activeTab, analytics]);

  if (checking) {
    return (
      <div className="auth-page">
        <div className="auth-form-side">
          <p className="section-tag">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="admin-page">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      <header className="admin-header">
        <div>
          <p className="section-tag">Logged in as {adminEmail}</p>
          <h1 className="form-title">Admin <em>Panel</em></h1>
        </div>
        <button className="ghost-btn admin-logout-btn" onClick={handleLogout}><span>Log Out →</span></button>
      </header>

      <nav className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          Orders <span className="admin-tab-count">{orders.length}</span>
        </button>
        <button className={`admin-tab ${activeTab === 'menu' ? 'active' : ''}`} onClick={() => setActiveTab('menu')}>
          Menu <span className="admin-tab-count">{menuItems.length}</span>
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          Users <span className="admin-tab-count">{users.length}</span>
        </button>
        <button className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          Analytics
        </button>
      </nav>

      <main className="admin-content">
        {/* ================= ORDERS TAB ================= */}
        {activeTab === 'orders' && (
          <div className="admin-panel-block">
            {orders.length === 0 ? (
              <p className="admin-empty">No orders yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.customerName || '—'}</strong>
                          <div className="admin-subtext">{order.phone}</div>
                        </td>
                        <td>
                          {(order.items || []).map(i => `${i.name} ×${i.qty}`).join(', ')}
                        </td>
                        <td>₹ {order.amount}</td>
                        <td>{order.paymentMethod}</td>
                        <td>
                          <select
                            className="admin-select"
                            value={order.status}
                            onChange={e => updateOrderStatus(order.id, e.target.value)}
                          >
                            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </td>
                        <td>
                          <button className="admin-delete-btn" onClick={() => deleteOrder(order.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= MENU TAB ================= */}
        {activeTab === 'menu' && (
          <div className="admin-panel-block">
            {menuItems.length === 0 && (
              <div className="admin-seed-box">
                <p>Firestore's <code>menu</code> collection is empty. Your live menu is still hardcoded in <code>menuData.js</code>.</p>
                <button className="primary-btn" onClick={seedMenuFromStaticData} disabled={seeding}>
                  <span>{seeding ? 'Importing...' : 'Import existing menu into Firestore'}</span>
                </button>
              </div>
            )}

            <form className="admin-add-form" onSubmit={handleAddItem}>
              <p className="section-tag">Add New Item</p>
              <div className="admin-form-row">
                <input placeholder="Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                <input placeholder="Category" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} />
                <input placeholder="Price" type="number" min="0" step="0.01" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                <input placeholder="Image URL" value={newItem.img} onChange={e => setNewItem({ ...newItem, img: e.target.value })} />
                <button type="submit" className="primary-btn"><span>Add</span></button>
              </div>
            </form>

            {menuItems.length > 0 && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Category</th><th>Price</th><th>Image</th><th></th></tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <input
                            className="admin-inline-input"
                            defaultValue={item.name}
                            onBlur={e => e.target.value !== item.name && updateMenuItem(item.id, 'name', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-inline-input"
                            defaultValue={item.category}
                            onBlur={e => e.target.value !== item.category && updateMenuItem(item.id, 'category', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-inline-input admin-price-input"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={item.price}
                            onBlur={e => handlePriceBlur(item, e)}
                          />
                        </td>
                        <td>{item.img ? <img src={item.img} alt={item.name} className="admin-thumb" /> : '—'}</td>
                        <td>
                          <button className="admin-delete-btn" onClick={() => deleteMenuItem(item.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= USERS TAB ================= */}
        {activeTab === 'users' && (
          <div className="admin-panel-block">
            {users.length === 0 ? (
              <p className="admin-empty">No users found.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Provider</th><th>Role</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.name || '—'}</td>
                        <td>{u.email}</td>
                        <td>{u.provider}</td>
                        <td>
                          <select
                            className="admin-select"
                            value={u.role || 'customer'}
                            onChange={e => updateUserRole(u.id, e.target.value)}
                          >
                            <option value="customer">customer</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= ANALYTICS TAB ================= */}
        {activeTab === 'analytics' && (
          <div className="admin-panel-block">
            <div className="admin-stats-row">
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Visits</p>
                <h3 className="admin-stat-value">{analytics.totalVisits}</h3>
                <p className="admin-stat-sub">Page views (last 3000 events)</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Unique Visitors</p>
                <h3 className="admin-stat-value">{analytics.uniqueVisitors}</h3>
                <p className="admin-stat-sub">Distinct browsers</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Orders</p>
                <h3 className="admin-stat-value">{analytics.totalOrders}</h3>
                <p className="admin-stat-sub">All-time order count</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Revenue</p>
                <h3 className="admin-stat-value">₹{analytics.totalRevenue}</h3>
                <p className="admin-stat-sub">Sum of all order amounts</p>
              </div>
            </div>

            <div className="admin-charts-grid">
              <div className="admin-chart-card">
                <h4>Best Selling Coffee</h4>
                <p>Top items by quantity sold, from all orders.</p>
                <div className="admin-chart-wrap"><canvas ref={salesCanvasRef}></canvas></div>
              </div>

              <div className="admin-chart-card">
                <h4>Payment Method Split</h4>
                <p>Revenue share by payment method.</p>
                <div className="admin-chart-wrap"><canvas ref={paymentCanvasRef}></canvas></div>
              </div>

              <div className="admin-chart-card admin-chart-wide">
                <h4>Visits Over Time</h4>
                <p>Page views per day, based on real visit logs.</p>
                <div className="admin-chart-wrap"><canvas ref={visitsCanvasRef}></canvas></div>
              </div>
            </div>

            <div className="admin-table-wrap" style={{ marginTop: '1.5rem' }}>
              <table className="admin-table">
                <thead><tr><th>Worst Selling Coffee</th><th>Qty Sold</th></tr></thead>
                <tbody>
                  {analytics.worstSellers.length === 0 ? (
                    <tr><td colSpan="2">No sales data yet.</td></tr>
                  ) : analytics.worstSellers.map(([name, qty]) => (
                    <tr key={name}><td>{name}</td><td>{qty}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;