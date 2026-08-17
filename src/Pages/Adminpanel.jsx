import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

import Chart from 'chart.js/auto';

import { auth, db } from '../firebase';
import { coffeeMenu } from '../data/menuData';

import './Adminpanel.css';


/* ============================================================
   CONSTANTS
============================================================ */

const ORDER_STATUSES = [
  'placed',
  'preparing',
  'out_for_delivery',
  'completed',
  'cancelled'
];

const LIST_LIMIT = 500;

const BATCH_CHUNK_SIZE = 450;


/* ============================================================
   HELPERS
============================================================ */

const shortUid = (uid) => (
  uid ? `${uid.slice(0, 8)}…` : '—'
);


const formatCustomization = (c) => {
  if (!c) return null;

  return [
    c.size,
    c.milk,
    c.shot,
    c.sugar,
    c.roast,
    c.straw ? 'Extra Straw' : null
  ]
    .filter(Boolean)
    .join(' · ');
};


/*
  IMPORTANT:
  Old menu items may not have stock field.

  Instead of showing undefined, we treat missing stock as 0.

  This means after adding this code, you should set stock
  for your existing menu items from Admin Panel.
*/
const getStock = (item) => {
  const stock = Number(item?.stock);

  if (!Number.isFinite(stock) || stock < 0) {
    return 0;
  }

  return Math.floor(stock);
};


const getLowStockAt = (item) => {
  const value = Number(item?.lowStockAt);

  if (!Number.isFinite(value) || value < 0) {
    return 5;
  }

  return Math.floor(value);
};


/* ============================================================
   ADMIN PANEL
============================================================ */

const AdminPanel = () => {

  const navigate = useNavigate();


  /* ============================================================
     AUTH
  ============================================================ */

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [adminUid, setAdminUid] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');


  /* ============================================================
     TABS
  ============================================================ */

  const [activeTab, setActiveTab] = useState('orders');


  /* ============================================================
     DATA
  ============================================================ */

  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);


  /* ============================================================
     MENU
  ============================================================ */

  const [seeding, setSeeding] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    img: '',
    stock: '0',
    lowStockAt: '5'
  });


  /* ============================================================
     CURSOR
  ============================================================ */

  const dotRef = useRef(null);
  const ringRef = useRef(null);


  const onMouseMove = useCallback((e) => {

    if (dotRef.current) {
      dotRef.current.style.left = `${e.clientX}px`;
      dotRef.current.style.top = `${e.clientY}px`;
    }

    if (ringRef.current) {
      ringRef.current.style.left = `${e.clientX}px`;
      ringRef.current.style.top = `${e.clientY}px`;
    }

  }, []);


  const addHover = useCallback(() => {
    ringRef.current?.classList.add('hovered');
  }, []);


  const rmvHover = useCallback(() => {
    ringRef.current?.classList.remove('hovered');
  }, []);


  /* ============================================================
     CURSOR EVENTS
  ============================================================ */

  useEffect(() => {

    document.addEventListener('mousemove', onMouseMove);

    const handleMouseOver = (e) => {

      if (
        e.target.closest(
          'button, a, input, select'
        )
      ) {
        addHover();
      }

    };


    const handleMouseOut = (e) => {

      if (
        e.target.closest(
          'button, a, input, select'
        )
      ) {
        rmvHover();
      }

    };


    document.addEventListener(
      'mouseover',
      handleMouseOver
    );

    document.addEventListener(
      'mouseout',
      handleMouseOut
    );


    return () => {

      document.removeEventListener(
        'mousemove',
        onMouseMove
      );

      document.removeEventListener(
        'mouseover',
        handleMouseOver
      );

      document.removeEventListener(
        'mouseout',
        handleMouseOut
      );

    };

  }, [
    onMouseMove,
    addHover,
    rmvHover
  ]);


  /* ============================================================
     AUTH + ADMIN ROLE
  ============================================================ */

  useEffect(() => {

    const unsub = onAuthStateChanged(
      auth,
      async (user) => {

        if (!user) {
          navigate('/login');
          return;
        }


        try {

          const snap = await getDoc(
            doc(db, 'users', user.uid)
          );


          const role = snap.exists()
            ? snap.data().role
            : null;


          if (role === 'admin') {

            setAuthorized(true);
            setAdminUid(user.uid);
            setAdminEmail(user.email || '');

          } else {

            navigate('/');

          }

        } catch (err) {

          console.error(
            'Admin check failed:',
            err
          );

          navigate('/');

        } finally {

          setChecking(false);

        }

      }
    );


    return () => unsub();

  }, [navigate]);


  /* ============================================================
     WATCH OWN ADMIN ROLE
  ============================================================ */

  useEffect(() => {

    if (!authorized || !adminUid) {
      return;
    }


    const unsubSelf = onSnapshot(
      doc(db, 'users', adminUid),
      (snap) => {

        const role = snap.exists()
          ? snap.data().role
          : null;


        if (role !== 'admin') {

          signOut(auth)
            .finally(() => navigate('/'));

        }

      },
      (err) => {
        console.error(
          'Self role listener error:',
          err
        );
      }
    );


    return () => unsubSelf();

  }, [
    authorized,
    adminUid,
    navigate
  ]);


  /* ============================================================
     LIVE FIRESTORE DATA
  ============================================================ */

  useEffect(() => {

    if (!authorized) {
      return;
    }


    /* ORDERS */

    const unsubOrders = onSnapshot(
      query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(LIST_LIMIT)
      ),
      (snap) => {

        setOrders(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );

      },
      (err) => {
        console.error(
          'Orders listener error:',
          err
        );
      }
    );


    /* MENU */

    const unsubMenu = onSnapshot(
      query(
        collection(db, 'menu'),
        limit(LIST_LIMIT)
      ),
      (snap) => {

        setMenuItems(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );

      },
      (err) => {
        console.error(
          'Menu listener error:',
          err
        );
      }
    );


    /* USERS */

    const unsubUsers = onSnapshot(
      query(
        collection(db, 'users'),
        limit(LIST_LIMIT)
      ),
      (snap) => {

        setUsers(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );

      },
      (err) => {
        console.error(
          'Users listener error:',
          err
        );
      }
    );


    /* VISITS */

    const unsubVisits = onSnapshot(
      query(
        collection(db, 'site_visits'),
        orderBy('createdAt', 'desc'),
        limit(3000)
      ),
      (snap) => {

        setVisits(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );

      },
      (err) => {
        console.error(
          'Visits listener error:',
          err
        );
      }
    );


    /* FEEDBACK */

    const unsubFeedback = onSnapshot(
      query(
        collection(db, 'feedback'),
        orderBy('createdAt', 'desc'),
        limit(LIST_LIMIT)
      ),
      (snap) => {

        setFeedbackList(
          snap.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );

      },
      (err) => {
        console.error(
          'Feedback listener error:',
          err
        );
      }
    );


    return () => {

      unsubOrders();
      unsubMenu();
      unsubUsers();
      unsubVisits();
      unsubFeedback();

    };

  }, [authorized]);


  /* ============================================================
     LOGOUT
  ============================================================ */

  const handleLogout = async () => {

    await signOut(auth);

    navigate('/login');

  };


  /* ============================================================
     ORDERS
  ============================================================ */

  const updateOrderStatus = async (
    orderId,
    status
  ) => {

    try {

      await updateDoc(
        doc(db, 'orders', orderId),
        {
          status
        }
      );

    } catch (err) {

      console.error(
        'Failed to update order status:',
        err
      );

      alert(
        'Could not update order status.'
      );

    }

  };


  const deleteOrder = async (orderId) => {

    if (
      !window.confirm(
        'Delete this order permanently?'
      )
    ) {
      return;
    }


    try {

      await deleteDoc(
        doc(db, 'orders', orderId)
      );

    } catch (err) {

      console.error(
        'Failed to delete order:',
        err
      );

      alert(
        'Could not delete order.'
      );

    }

  };


  /* ============================================================
     MENU
  ============================================================ */

  const handleAddItem = async (e) => {

    e.preventDefault();


    if (
      !newItem.name.trim() ||
      !newItem.category.trim() ||
      newItem.price === ''
    ) {

      alert(
        'Name, category and price are required.'
      );

      return;
    }


    const priceNum = Number(
      newItem.price
    );

    const stockNum = Number(
      newItem.stock
    );

    const lowStockNum = Number(
      newItem.lowStockAt
    );


    if (
      Number.isNaN(priceNum) ||
      priceNum < 0
    ) {

      alert(
        'Price must be a valid, non-negative number.'
      );

      return;
    }


    if (
      Number.isNaN(stockNum) ||
      stockNum < 0 ||
      !Number.isInteger(stockNum)
    ) {

      alert(
        'Stock must be a whole number greater than or equal to 0.'
      );

      return;
    }


    if (
      Number.isNaN(lowStockNum) ||
      lowStockNum < 0 ||
      !Number.isInteger(lowStockNum)
    ) {

      alert(
        'Low Stock At must be a whole number greater than or equal to 0.'
      );

      return;
    }


    try {

      await addDoc(
        collection(db, 'menu'),
        {
          name: newItem.name.trim(),
          category: newItem.category.trim(),
          price: priceNum,
          img: newItem.img.trim() || '',

          /* STOCK */

          stock: stockNum,
          lowStockAt: lowStockNum,

          createdAt: serverTimestamp()
        }
      );


      setNewItem({
        name: '',
        category: '',
        price: '',
        img: '',
        stock: '0',
        lowStockAt: '5'
      });


      alert(
        'Menu item added successfully.'
      );

    } catch (err) {

      console.error(
        'Failed to add menu item:',
        err
      );

      alert(
        'Could not add menu item.'
      );

    }

  };


  /* ============================================================
     GENERIC MENU UPDATE
  ============================================================ */

  const updateMenuItem = async (
    id,
    field,
    value
  ) => {

    try {

      let finalValue = value;


      if (
        field === 'price' ||
        field === 'stock' ||
        field === 'lowStockAt'
      ) {

        finalValue = Number(value);

      }


      await updateDoc(
        doc(db, 'menu', id),
        {
          [field]: finalValue
        }
      );

    } catch (err) {

      console.error(
        'Failed to update menu item:',
        err
      );

      alert(
        'Could not update menu item.'
      );

    }

  };


  /* ============================================================
     PRICE UPDATE
  ============================================================ */

  const handlePriceBlur = (
    item,
    e
  ) => {

    const raw = e.target.value;

    const parsed = Number(raw);


    if (
      raw.trim() === '' ||
      Number.isNaN(parsed) ||
      parsed < 0
    ) {

      alert(
        'Price must be a valid, non-negative number.'
      );

      e.target.value = item.price;

      return;
    }


    if (
      parsed !== Number(item.price)
    ) {

      updateMenuItem(
        item.id,
        'price',
        parsed
      );

    }

  };


  /* ============================================================
     STOCK DIRECT UPDATE
  ============================================================ */

  const handleStockBlur = (
    item,
    e
  ) => {

    const raw = e.target.value;

    const parsed = Number(raw);


    if (
      raw.trim() === '' ||
      Number.isNaN(parsed) ||
      parsed < 0 ||
      !Number.isInteger(parsed)
    ) {

      alert(
        'Stock must be a whole number greater than or equal to 0.'
      );

      e.target.value = getStock(item);

      return;
    }


    if (
      parsed !== getStock(item)
    ) {

      updateMenuItem(
        item.id,
        'stock',
        parsed
      );

    }

  };


  /* ============================================================
     LOW STOCK THRESHOLD
  ============================================================ */

  const handleLowStockBlur = (
    item,
    e
  ) => {

    const raw = e.target.value;

    const parsed = Number(raw);


    if (
      raw.trim() === '' ||
      Number.isNaN(parsed) ||
      parsed < 0 ||
      !Number.isInteger(parsed)
    ) {

      alert(
        'Low Stock At must be a whole number greater than or equal to 0.'
      );

      e.target.value =
        getLowStockAt(item);

      return;
    }


    if (
      parsed !== getLowStockAt(item)
    ) {

      updateMenuItem(
        item.id,
        'lowStockAt',
        parsed
      );

    }

  };


  /* ============================================================
     STOCK + / -
  ============================================================ */

  const changeStock = async (
    item,
    amount
  ) => {

    const currentStock =
      getStock(item);

    const nextStock =
      Math.max(
        0,
        currentStock + amount
      );


    if (
      nextStock === currentStock
    ) {
      return;
    }


    try {

      await updateDoc(
        doc(db, 'menu', item.id),
        {
          stock: nextStock
        }
      );

    } catch (err) {

      console.error(
        'Failed to change stock:',
        err
      );

      alert(
        'Could not update stock.'
      );

    }

  };


  /* ============================================================
     SET STOCK
  ============================================================ */

  const setStockManually = async (
    item
  ) => {

    const input = window.prompt(
      `Set stock for ${item.name}.\nCurrent stock: ${getStock(item)}`,
      String(getStock(item))
    );


    if (input === null) {
      return;
    }


    const parsed = Number(input);


    if (
      Number.isNaN(parsed) ||
      parsed < 0 ||
      !Number.isInteger(parsed)
    ) {

      alert(
        'Stock must be a whole number greater than or equal to 0.'
      );

      return;
    }


    try {

      await updateDoc(
        doc(db, 'menu', item.id),
        {
          stock: parsed
        }
      );

    } catch (err) {

      console.error(
        'Failed to set stock:',
        err
      );

      alert(
        'Could not update stock.'
      );

    }

  };


  /* ============================================================
     DELETE MENU
  ============================================================ */

  const deleteMenuItem = async (id) => {

    if (
      !window.confirm(
        'Remove this item from the menu?'
      )
    ) {
      return;
    }


    try {

      await deleteDoc(
        doc(db, 'menu', id)
      );

    } catch (err) {

      console.error(
        'Failed to delete menu item:',
        err
      );

      alert(
        'Could not delete item.'
      );

    }

  };


  /* ============================================================
     SEED MENU
  ============================================================ */

  const seedMenuFromStaticData = async () => {

    if (menuItems.length > 0) {

      const ok = window.confirm(
        `Firestore already has ${menuItems.length} menu items.\n\nImporting again will create duplicates.\n\nContinue?`
      );


      if (!ok) {
        return;
      }

    }


    setSeeding(true);


    try {

      for (
        let i = 0;
        i < coffeeMenu.length;
        i += BATCH_CHUNK_SIZE
      ) {

        const chunk =
          coffeeMenu.slice(
            i,
            i + BATCH_CHUNK_SIZE
          );


        const batch = writeBatch(db);


        chunk.forEach((item) => {

          const ref =
            doc(collection(db, 'menu'));


          batch.set(
            ref,
            {
              ...item,

              price: Number(
                item.price
              ),

              /*
                IMPORTANT:
                Seeded items get stock = 0.

                You can later increase stock
                from this Admin Panel.
              */

              stock: Number(
                item.stock ?? 0
              ),

              lowStockAt: Number(
                item.lowStockAt ?? 5
              ),

              createdAt:
                serverTimestamp()
            }
          );

        });


        await batch.commit();

      }


      alert(
        'Menu imported into Firestore successfully.'
      );

    } catch (err) {

      console.error(
        'Seeding failed:',
        err
      );

      alert(
        'Could not import menu. Check console for details.'
      );

    } finally {

      setSeeding(false);

    }

  };


  /* ============================================================
     USERS
  ============================================================ */

  const updateUserRole = async (
    uid,
    role
  ) => {

    if (
      uid === adminUid &&
      role !== 'admin'
    ) {

      const ok =
        window.confirm(
          "You're about to remove your own admin access. You will be logged out. Continue?"
        );


      if (!ok) {
        return;
      }

    }


    try {

      await updateDoc(
        doc(db, 'users', uid),
        {
          role
        }
      );

    } catch (err) {

      console.error(
        'Failed to update user role:',
        err
      );

      alert(
        'Could not update user role.'
      );

    }

  };


  const adjustUserWallet = async (u) => {

    const input =
      window.prompt(
        `Set new wallet balance for ${u.name || u.email}.\nCurrent: ₹${u.wallet ?? 0}`,
        String(u.wallet ?? 0)
      );


    if (input === null) {
      return;
    }


    const parsed = Number(input);


    if (
      Number.isNaN(parsed) ||
      parsed < 0
    ) {

      alert(
        'Please enter a valid, non-negative number.'
      );

      return;
    }


    try {

      await updateDoc(
        doc(db, 'users', u.id),
        {
          wallet: parsed
        }
      );

    } catch (err) {

      console.error(
        'Failed to update wallet:',
        err
      );

      alert(
        'Could not update wallet balance.'
      );

    }

  };


  const adjustUserTokens = async (u) => {

    const input =
      window.prompt(
        `Set new token balance for ${u.name || u.email}.\nCurrent: ${u.tokens ?? 0}`,
        String(u.tokens ?? 0)
      );


    if (input === null) {
      return;
    }


    const parsed = Number(input);


    if (
      Number.isNaN(parsed) ||
      parsed < 0
    ) {

      alert(
        'Please enter a valid, non-negative number.'
      );

      return;
    }


    try {

      await updateDoc(
        doc(db, 'users', u.id),
        {
          tokens: parsed
        }
      );

    } catch (err) {

      console.error(
        'Failed to update tokens:',
        err
      );

      alert(
        'Could not update token balance.'
      );

    }

  };


  /* ============================================================
     FEEDBACK
  ============================================================ */

  const feedbackStats = useMemo(() => {

    const total =
      feedbackList.length;


    const avg = total
      ? (
          feedbackList.reduce(
            (sum, f) =>
              sum +
              (Number(f.rating) || 0),
            0
          ) / total
        ).toFixed(1)
      : '0.0';


    const distribution =
      [5, 4, 3, 2, 1].map(
        (star) => ({
          star,
          count:
            feedbackList.filter(
              f =>
                Number(f.rating) ===
                star
            ).length
        })
      );


    const sorted =
      [...feedbackList].sort(
        (a, b) =>
          (Number(a.rating) || 0) -
          (Number(b.rating) || 0)
      );


    return {
      total,
      avg,
      distribution,
      sorted
    };

  }, [feedbackList]);


  const renderStars = (rating) => {

    const r =
      Number(rating) || 0;

    return (
      '★'.repeat(r) +
      '☆'.repeat(
        Math.max(0, 5 - r)
      )
    );

  };


  const formatFeedbackDate = (
    value
  ) => {

    if (!value) {
      return '—';
    }


    const d =
      value?.toDate
        ? value.toDate()
        : new Date(value);


    if (
      Number.isNaN(
        d.getTime()
      )
    ) {
      return '—';
    }


    return d.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );

  };


  /* ============================================================
     REWARDS
  ============================================================ */

  const rewardsSummary = useMemo(() => {

    const totalWalletOutstanding =
      users.reduce(
        (sum, u) =>
          sum +
          (Number(u.wallet) || 0),
        0
      );


    const totalTokensOutstanding =
      users.reduce(
        (sum, u) =>
          sum +
          (Number(u.tokens) || 0),
        0
      );


    const totalReferrals =
      users.reduce(
        (sum, u) =>
          sum +
          (Number(u.referralCount) || 0),
        0
      );


    return {
      totalWalletOutstanding,
      totalTokensOutstanding,
      totalReferrals
    };

  }, [users]);


  /* ============================================================
     STOCK SUMMARY
  ============================================================ */

  const stockSummary = useMemo(() => {

    const totalUnits =
      menuItems.reduce(
        (sum, item) =>
          sum + getStock(item),
        0
      );


    const outOfStock =
      menuItems.filter(
        item =>
          getStock(item) === 0
      ).length;


    const lowStock =
      menuItems.filter(
        item => {

          const stock =
            getStock(item);

          const threshold =
            getLowStockAt(item);

          return (
            stock > 0 &&
            stock <= threshold
          );

        }
      ).length;


    return {
      totalUnits,
      outOfStock,
      lowStock
    };

  }, [menuItems]);


  /* ============================================================
     ANALYTICS
  ============================================================ */

  const analytics = useMemo(() => {

    const itemQty = {};


    orders.forEach(order => {

      (order.items || []).forEach(
        item => {

          itemQty[item.name] =
            (itemQty[item.name] || 0) +
            (Number(item.qty) || 0);

        }
      );

    });


    const itemSales =
      Object.entries(itemQty)
        .sort(
          (a, b) =>
            b[1] - a[1]
        );


    const topSellers =
      itemSales.slice(0, 8);


    const worstSellers =
      [...itemSales]
        .reverse()
        .slice(0, 8);


    const paymentStats = {};


    orders.forEach(order => {

      const method =
        order.paymentMethod ||
        'Unknown';


      if (
        !paymentStats[method]
      ) {

        paymentStats[method] = {
          count: 0,
          amount: 0
        };

      }


      paymentStats[method].count += 1;

      paymentStats[method].amount +=
        Number(order.amount) || 0;

    });


    const totalRevenue =
      orders.reduce(
        (sum, o) =>
          sum +
          (Number(o.amount) || 0),
        0
      );


    const totalOrders =
      orders.length;


    const totalVisits =
      visits.length;


    const uniqueVisitors =
      new Set(
        visits
          .map(v => v.visitorId)
          .filter(Boolean)
      ).size;


    const dayMap = {};


    visits.forEach(v => {

      const d =
        v.createdAt?.toDate
          ? v.createdAt.toDate()
          : (
              v.createdAt
                ? new Date(v.createdAt)
                : null
            );


      if (
        !d ||
        Number.isNaN(
          d.getTime()
        )
      ) {
        return;
      }


      const sortKey =
        d.toISOString()
          .slice(0, 10);


      const label =
        d.toLocaleDateString(
          'en-IN',
          {
            day: '2-digit',
            month: 'short'
          }
        );


      if (
        !dayMap[sortKey]
      ) {

        dayMap[sortKey] = {
          label,
          count: 0
        };

      }


      dayMap[sortKey].count += 1;

    });


    const sortedKeys =
      Object.keys(dayMap).sort();


    const dayLabels =
      sortedKeys.map(
        k => dayMap[k].label
      );


    const dayCounts =
      sortedKeys.map(
        k => dayMap[k].count
      );


    return {
      topSellers,
      worstSellers,
      paymentStats,
      totalRevenue,
      totalOrders,
      totalVisits,
      uniqueVisitors,
      dayLabels,
      dayCounts
    };

  }, [orders, visits]);


  /* ============================================================
     CUSTOMIZATION STATS
  ============================================================ */

  const customizationStats =
    useMemo(() => {

      const counts = {
        size: {},
        milk: {},
        shot: {},
        sugar: {},
        roast: {}
      };


      let customizedQty = 0;
      let plainQty = 0;
      let strawQty = 0;


      orders.forEach(order => {

        (order.items || []).forEach(
          item => {

            const qty =
              Number(item.qty) || 1;


            if (
              item.customization
            ) {

              customizedQty += qty;


              if (
                item.customization.straw
              ) {

                strawQty += qty;

              }


              [
                'size',
                'milk',
                'shot',
                'sugar',
                'roast'
              ].forEach(key => {

                const val =
                  item.customization[key];


                if (val) {

                  counts[key][val] =
                    (
                      counts[key][val] ||
                      0
                    ) + qty;

                }

              });

            } else {

              plainQty += qty;

            }

          }
        );

      });


      const topOf = (obj) =>
        Object.entries(obj)
          .sort(
            (a, b) =>
              b[1] - a[1]
          );


      return {

        customizedQty,
        plainQty,
        strawQty,

        topSizes:
          topOf(counts.size),

        topMilk:
          topOf(counts.milk),

        topShot:
          topOf(counts.shot),

        topSugar:
          topOf(counts.sugar),

        topRoast:
          topOf(counts.roast)

      };

    }, [orders]);


  const formatTopList = (
    entries
  ) => {

    return entries.length
      ? entries
          .map(
            ([label, qty]) =>
              `${label} (${qty})`
          )
          .join(', ')
      : '—';

  };


  /* ============================================================
     CHARTS
  ============================================================ */

  const salesCanvasRef =
    useRef(null);

  const paymentCanvasRef =
    useRef(null);

  const visitsCanvasRef =
    useRef(null);


  const salesChartRef =
    useRef(null);

  const paymentChartRef =
    useRef(null);

  const visitsChartRef =
    useRef(null);


  useEffect(() => {

    if (
      activeTab !== 'analytics'
    ) {
      return;
    }


    /* SALES */

    if (
      salesCanvasRef.current
    ) {

      salesChartRef.current?.destroy();


      salesChartRef.current =
        new Chart(
          salesCanvasRef.current,
          {
            type: 'bar',

            data: {
              labels:
                analytics.topSellers
                  .map(
                    ([name]) =>
                      name
                  ),

              datasets: [
                {
                  data:
                    analytics.topSellers
                      .map(
                        ([, qty]) =>
                          qty
                      ),

                  backgroundColor:
                    'rgba(201, 149, 108, 0.85)',

                  borderRadius: 8,

                  maxBarThickness: 40
                }
              ]
            },

            options: {

              responsive: true,

              maintainAspectRatio:
                false,

              plugins: {
                legend: {
                  display: false
                }
              },

              scales: {

                x: {
                  ticks: {
                    color:
                      '#a89070',

                    maxRotation: 40,

                    minRotation: 40
                  },

                  grid: {
                    display: false
                  }
                },

                y: {
                  ticks: {
                    color:
                      '#a89070',

                    precision: 0
                  },

                  grid: {
                    color:
                      'rgba(201,149,108,0.1)'
                  }
                }

              }

            }

          }
        );

    }


    /* PAYMENT */

    if (
      paymentCanvasRef.current
    ) {

      paymentChartRef.current?.destroy();


      const methods =
        Object.keys(
          analytics.paymentStats
        );


      paymentChartRef.current =
        new Chart(
          paymentCanvasRef.current,
          {

            type: 'doughnut',

            data: {

              labels: methods,

              datasets: [
                {
                  data:
                    methods.map(
                      m =>
                        analytics
                          .paymentStats[m]
                          .amount
                    ),

                  backgroundColor: [
                    '#c9956c',
                    '#8b6a4a',
                    '#e8c99a',
                    '#5c4326'
                  ],

                  borderWidth: 0
                }
              ]

            },

            options: {

              responsive: true,

              maintainAspectRatio:
                false,

              plugins: {

                legend: {
                  position: 'bottom',

                  labels: {
                    color:
                      '#f0e6d3'
                  }
                }

              }

            }

          }
        );

    }


    /* VISITS */

    if (
      visitsCanvasRef.current
    ) {

      visitsChartRef.current?.destroy();


      visitsChartRef.current =
        new Chart(
          visitsCanvasRef.current,
          {

            type: 'line',

            data: {

              labels:
                analytics.dayLabels,

              datasets: [
                {

                  data:
                    analytics.dayCounts,

                  borderColor:
                    '#c9956c',

                  backgroundColor:
                    'rgba(201, 149, 108, 0.15)',

                  fill: true,

                  tension: 0.35,

                  pointBackgroundColor:
                    '#c9956c'

                }
              ]

            },

            options: {

              responsive: true,

              maintainAspectRatio:
                false,

              plugins: {
                legend: {
                  display: false
                }
              },

              scales: {

                x: {
                  ticks: {
                    color:
                      '#a89070'
                  },

                  grid: {
                    display: false
                  }
                },

                y: {
                  ticks: {
                    color:
                      '#a89070',

                    precision: 0
                  },

                  grid: {
                    color:
                      'rgba(201,149,108,0.1)'
                  }
                }

              }

            }

          }
        );

    }


    return () => {

      salesChartRef.current?.destroy();

      paymentChartRef.current?.destroy();

      visitsChartRef.current?.destroy();

    };

  }, [
    activeTab,
    analytics
  ]);


  /* ============================================================
     LOADING
  ============================================================ */

  if (checking) {

    return (

      <div className="auth-page">

        <div className="auth-form-side">

          <p className="section-tag">
            Checking access...
          </p>

        </div>

      </div>

    );

  }


  if (!authorized) {
    return null;
  }


  /* ============================================================
     UI
  ============================================================ */

  return (

    <div className="admin-page">

      <div
        className="cursor-dot"
        ref={dotRef}
      />

      <div
        className="cursor-ring"
        ref={ringRef}
      />


      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="admin-header">

        <div>

          <p className="section-tag">
            Logged in as {adminEmail}
          </p>

          <h1 className="form-title">
            Admin <em>Panel</em>
          </h1>

        </div>


        <button
          className="ghost-btn admin-logout-btn"
          onClick={handleLogout}
        >
          <span>
            Log Out →
          </span>
        </button>

      </header>


      {/* ======================================================
          TABS
      ====================================================== */}

      <nav className="admin-tabs">

        <button
          className={`admin-tab ${
            activeTab === 'orders'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab('orders')
          }
        >
          Orders
          <span className="admin-tab-count">
            {orders.length}
          </span>
        </button>


        <button
          className={`admin-tab ${
            activeTab === 'menu'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab('menu')
          }
        >
          Menu
          <span className="admin-tab-count">
            {menuItems.length}
          </span>
        </button>


        <button
          className={`admin-tab ${
            activeTab === 'users'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab('users')
          }
        >
          Users
          <span className="admin-tab-count">
            {users.length}
          </span>
        </button>


        <button
          className={`admin-tab ${
            activeTab === 'feedback'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab('feedback')
          }
        >
          Feedback
          <span className="admin-tab-count">
            {feedbackList.length}
          </span>
        </button>


        <button
          className={`admin-tab ${
            activeTab === 'analytics'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveTab('analytics')
          }
        >
          Analytics
        </button>

      </nav>


      <main className="admin-content">


        {/* ====================================================
            ORDERS
        ==================================================== */}

        {activeTab === 'orders' && (

          <div className="admin-panel-block">

            {orders.length === 0 ? (

              <p className="admin-empty">
                No orders yet.
              </p>

            ) : (

              <div className="admin-table-wrap">

                <table className="admin-table">

                  <thead>

                    <tr>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Rewards Used</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th></th>
                    </tr>

                  </thead>


                  <tbody>

                    {orders.map(order => (

                      <tr key={order.id}>

                        <td>

                          <strong>
                            {order.customerName || '—'}
                          </strong>

                          <div className="admin-subtext">
                            {order.phone}
                          </div>

                        </td>


                        <td>

                          {(order.items || [])
                            .map(
                              (i, idx) => {

                                const customTag =
                                  formatCustomization(
                                    i.customization
                                  );


                                return (

                                  <div
                                    key={idx}
                                    className="admin-order-item-line"
                                  >

                                    <span>
                                      {i.name} ×{i.qty}
                                    </span>


                                    {customTag && (

                                      <div className="admin-subtext admin-customization-tag">
                                        {customTag}
                                      </div>

                                    )}

                                  </div>

                                );

                              }
                            )}

                        </td>


                        <td>
                          ₹ {order.amount}
                        </td>


                        <td>

                          {order.walletUsed > 0 && (

                            <div className="admin-subtext">
                              Wallet: −₹
                              {order.walletUsed}
                            </div>

                          )}


                          {order.tokenDiscount > 0 && (

                            <div className="admin-subtext">
                              Tokens: −₹
                              {order.tokenDiscount}
                            </div>

                          )}


                          {!order.walletUsed &&
                            !order.tokenDiscount &&
                            '—'}

                        </td>


                        <td>
                          {order.paymentMethod}
                        </td>


                        <td>

                          <select
                            className="admin-select"
                            value={order.status}
                            onChange={e =>
                              updateOrderStatus(
                                order.id,
                                e.target.value
                              )
                            }
                          >

                            {ORDER_STATUSES.map(
                              s => (

                                <option
                                  key={s}
                                  value={s}
                                >
                                  {s.replace(
                                    /_/g,
                                    ' '
                                  )}
                                </option>

                              )
                            )}

                          </select>

                        </td>


                        <td>

                          <button
                            className="admin-delete-btn"
                            onClick={() =>
                              deleteOrder(
                                order.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        )}


        {/* ====================================================
            MENU
        ==================================================== */}

        {activeTab === 'menu' && (

          <div className="admin-panel-block">


            {/* STOCK SUMMARY */}

            <div className="admin-stats-row admin-stock-summary">

              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Stock Units
                </p>

                <h3 className="admin-stat-value">
                  {stockSummary.totalUnits}
                </h3>

                <p className="admin-stat-sub">
                  Across all menu items
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Out of Stock Items
                </p>

                <h3 className="admin-stat-value">
                  {stockSummary.outOfStock}
                </h3>

                <p className="admin-stat-sub">
                  Stock = 0
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Low Stock Items
                </p>

                <h3 className="admin-stat-value">
                  {stockSummary.lowStock}
                </h3>

                <p className="admin-stat-sub">
                  Based on each item's threshold
                </p>

              </div>

            </div>


            {/* SEED */}

            {menuItems.length === 0 && (

              <div className="admin-seed-box">

                <p>
                  Firestore's <code>menu</code> collection
                  is empty. Your live menu is still hardcoded
                  in <code>menuData.js</code>.
                </p>


                <button
                  className="primary-btn"
                  onClick={
                    seedMenuFromStaticData
                  }
                  disabled={seeding}
                >

                  <span>
                    {seeding
                      ? 'Importing...'
                      : 'Import existing menu into Firestore'}
                  </span>

                </button>

              </div>

            )}


            {/* ADD ITEM */}

            <form
              className="admin-add-form"
              onSubmit={handleAddItem}
            >

              <p className="section-tag">
                Add New Item
              </p>


              <div className="admin-form-row">

                <input
                  placeholder="Name"
                  value={newItem.name}
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      name: e.target.value
                    })
                  }
                />


                <input
                  placeholder="Category"
                  value={newItem.category}
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      category:
                        e.target.value
                    })
                  }
                />


                <input
                  placeholder="Price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.price}
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      price:
                        e.target.value
                    })
                  }
                />


                <input
                  placeholder="Stock"
                  type="number"
                  min="0"
                  step="1"
                  value={newItem.stock}
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      stock:
                        e.target.value
                    })
                  }
                />


                <input
                  placeholder="Low Stock At"
                  type="number"
                  min="0"
                  step="1"
                  value={
                    newItem.lowStockAt
                  }
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      lowStockAt:
                        e.target.value
                    })
                  }
                />


                <input
                  placeholder="Image URL"
                  value={newItem.img}
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      img:
                        e.target.value
                    })
                  }
                />


                <button
                  type="submit"
                  className="primary-btn"
                >
                  <span>
                    Add
                  </span>
                </button>

              </div>

            </form>


            {/* MENU TABLE */}

            {menuItems.length > 0 && (

              <div className="admin-table-wrap">

                <table className="admin-table">

                  <thead>

                    <tr>

                      <th>Name</th>

                      <th>Category</th>

                      <th>Price</th>

                      <th>Stock</th>

                      <th>Low Stock At</th>

                      <th>Image</th>

                      <th></th>

                    </tr>

                  </thead>


                  <tbody>

                    {menuItems.map(item => {

                      const stock =
                        getStock(item);

                      const threshold =
                        getLowStockAt(item);


                      return (

                        <tr key={item.id}>


                          {/* NAME */}

                          <td>

                            <input
                              className="admin-inline-input"
                              defaultValue={
                                item.name
                              }
                              onBlur={e =>
                                e.target.value !==
                                  item.name &&
                                updateMenuItem(
                                  item.id,
                                  'name',
                                  e.target.value
                                )
                              }
                            />

                          </td>


                          {/* CATEGORY */}

                          <td>

                            <input
                              className="admin-inline-input"
                              defaultValue={
                                item.category
                              }
                              onBlur={e =>
                                e.target.value !==
                                  item.category &&
                                updateMenuItem(
                                  item.id,
                                  'category',
                                  e.target.value
                                )
                              }
                            />

                          </td>


                          {/* PRICE */}

                          <td>

                            <input
                              className="admin-inline-input admin-price-input"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={
                                item.price
                              }
                              onBlur={e =>
                                handlePriceBlur(
                                  item,
                                  e
                                )
                              }
                            />

                          </td>


                          {/* STOCK */}

                          <td>

                            <div className="stock-control">

                              <button
                                type="button"
                                className="stock-btn"
                                onClick={() =>
                                  changeStock(
                                    item,
                                    -1
                                  )
                                }
                                disabled={
                                  stock <= 0
                                }
                              >
                                −
                              </button>


                              <input
                                className="stock-number-input"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={
                                  stock
                                }
                                key={`stock-${item.id}-${stock}`}
                                onBlur={e =>
                                  handleStockBlur(
                                    item,
                                    e
                                  )
                                }
                                onClick={e =>
                                  e.currentTarget.select()
                                }
                              />


                              <button
                                type="button"
                                className="stock-btn"
                                onClick={() =>
                                  changeStock(
                                    item,
                                    1
                                  )
                                }
                              >
                                +
                              </button>

                            </div>


                            <button
                              type="button"
                              className="stock-edit-link"
                              onClick={() =>
                                setStockManually(
                                  item
                                )
                              }
                            >
                              Set
                            </button>

                          </td>


                          {/* LOW STOCK THRESHOLD */}

                          <td>

                            <input
                              className="stock-threshold-input"
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={
                                threshold
                              }
                              key={`threshold-${item.id}-${threshold}`}
                              onBlur={e =>
                                handleLowStockBlur(
                                  item,
                                  e
                                )
                              }
                            />

                          </td>


                          {/* IMAGE */}

                          <td>

                            {item.img ? (

                              <img
                                src={item.img}
                                alt={item.name}
                                className="admin-thumb"
                              />

                            ) : (
                              '—'
                            )}

                          </td>


                          {/* DELETE */}

                          <td>

                            <button
                              type="button"
                              className="admin-delete-btn"
                              onClick={() =>
                                deleteMenuItem(
                                  item.id
                                )
                              }
                            >
                              Delete
                            </button>

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        )}


        {/* ====================================================
            USERS
        ==================================================== */}

        {activeTab === 'users' && (

          <div className="admin-panel-block">


            <div
              className="admin-stats-row"
              style={{
                marginBottom:
                  '1.5rem'
              }}
            >

              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Wallet Outstanding
                </p>

                <h3 className="admin-stat-value">
                  ₹
                  {
                    rewardsSummary
                      .totalWalletOutstanding
                  }
                </h3>

                <p className="admin-stat-sub">
                  Across all users
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Tokens Outstanding
                </p>

                <h3 className="admin-stat-value">
                  {
                    rewardsSummary
                      .totalTokensOutstanding
                  }
                </h3>

                <p className="admin-stat-sub">
                  Across all users
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Referrals
                </p>

                <h3 className="admin-stat-value">
                  {
                    rewardsSummary
                      .totalReferrals
                  }
                </h3>

                <p className="admin-stat-sub">
                  Successful signups via referral
                </p>

              </div>

            </div>


            {users.length === 0 ? (

              <p className="admin-empty">
                No users found.
              </p>

            ) : (

              <div className="admin-table-wrap">

                <table className="admin-table">

                  <thead>

                    <tr>

                      <th>Name</th>
                      <th>Email</th>
                      <th>Provider</th>
                      <th>Wallet</th>
                      <th>Tokens</th>
                      <th>Referrals</th>
                      <th>Referred By</th>
                      <th>Role</th>

                    </tr>

                  </thead>


                  <tbody>

                    {users.map(u => (

                      <tr key={u.id}>

                        <td>
                          {u.name || '—'}
                        </td>

                        <td>
                          {u.email}
                        </td>

                        <td>
                          {u.provider}
                        </td>


                        <td>

                          <button
                            className="admin-inline-input"
                            style={{
                              cursor:
                                'pointer',
                              textAlign:
                                'left'
                            }}
                            title="Click to edit wallet balance"
                            onClick={() =>
                              adjustUserWallet(u)
                            }
                          >
                            ₹
                            {u.wallet ?? 0}
                          </button>

                        </td>


                        <td>

                          <button
                            className="admin-inline-input"
                            style={{
                              cursor:
                                'pointer',
                              textAlign:
                                'left'
                            }}
                            title="Click to edit token balance"
                            onClick={() =>
                              adjustUserTokens(u)
                            }
                          >
                            {u.tokens ?? 0}
                          </button>

                        </td>


                        <td>
                          {u.referralCount ?? 0}
                        </td>


                        <td className="admin-subtext">
                          {shortUid(
                            u.referredBy
                          )}
                        </td>


                        <td>

                          <select
                            className="admin-select"
                            value={
                              u.role ||
                              'customer'
                            }
                            onChange={e =>
                              updateUserRole(
                                u.id,
                                e.target.value
                              )
                            }
                          >

                            <option value="customer">
                              customer
                            </option>

                            <option value="admin">
                              admin
                            </option>

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


        {/* ====================================================
            FEEDBACK
        ==================================================== */}

        {activeTab === 'feedback' && (

          <div className="admin-panel-block">

            <div className="admin-stats-row">

              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Average Rating
                </p>

                <h3 className="admin-stat-value">
                  {feedbackStats.avg} / 5
                </h3>

                <p className="admin-stat-sub">
                  Across {feedbackStats.total} reviews
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Reviews
                </p>

                <h3 className="admin-stat-value">
                  {feedbackStats.total}
                </h3>

                <p className="admin-stat-sub">
                  Submitted by customers
                </p>

              </div>


              {feedbackStats.distribution.map(
                ({ star, count }) => (

                  <div
                    className="admin-stat-card"
                    key={star}
                  >

                    <p className="admin-stat-label">
                      {star}
                      {' '}
                      Star
                      {star > 1 ? 's' : ''}
                    </p>

                    <h3 className="admin-stat-value">
                      {count}
                    </h3>

                    <p className="admin-stat-sub">

                      {
                        feedbackStats.total
                          ? Math.round(
                              (count /
                                feedbackStats.total) *
                                100
                            )
                          : 0
                      }
                      % of reviews

                    </p>

                  </div>

                )
              )}

            </div>


            {feedbackList.length === 0 ? (

              <p className="admin-empty">
                No feedback submitted yet.
              </p>

            ) : (

              <div
                className="admin-table-wrap"
                style={{
                  marginTop:
                    '1.5rem'
                }}
              >

                <table className="admin-table">

                  <thead>

                    <tr>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Date</th>
                    </tr>

                  </thead>


                  <tbody>

                    {feedbackStats.sorted.map(
                      f => (

                        <tr
                          key={f.id}
                          className={
                            Number(f.rating) <= 2
                              ? 'admin-row-flagged'
                              : ''
                          }
                        >

                          <td>
                            <strong>
                              {
                                f.customerName ||
                                '—'
                              }
                            </strong>
                          </td>

                          <td>
                            {(f.items || [])
                              .join(', ') ||
                              '—'}
                          </td>

                          <td className="admin-rating-cell">
                            {renderStars(
                              f.rating
                            )}
                          </td>

                          <td>
                            {
                              f.comment || (
                                <span className="admin-subtext">
                                  No comment
                                </span>
                              )
                            }
                          </td>

                          <td>
                            {formatFeedbackDate(
                              f.createdAt
                            )}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        )}


        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        {activeTab === 'analytics' && (

          <div className="admin-panel-block">

            <div className="admin-stats-row">

              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Visits
                </p>

                <h3 className="admin-stat-value">
                  {analytics.totalVisits}
                </h3>

                <p className="admin-stat-sub">
                  Page views
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Unique Visitors
                </p>

                <h3 className="admin-stat-value">
                  {analytics.uniqueVisitors}
                </h3>

                <p className="admin-stat-sub">
                  Distinct browsers
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Orders
                </p>

                <h3 className="admin-stat-value">
                  {analytics.totalOrders}
                </h3>

                <p className="admin-stat-sub">
                  All-time order count
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Total Revenue
                </p>

                <h3 className="admin-stat-value">
                  ₹{analytics.totalRevenue}
                </h3>

                <p className="admin-stat-sub">
                  Sum of all order amounts
                </p>

              </div>

            </div>


            <div
              className="admin-stats-row"
              style={{
                marginTop: '1rem'
              }}
            >

              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Customized Items Sold
                </p>

                <h3 className="admin-stat-value">
                  {
                    customizationStats
                      .customizedQty
                  }
                </h3>

                <p className="admin-stat-sub">
                  Ordered via Customize page
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Standard Items Sold
                </p>

                <h3 className="admin-stat-value">
                  {
                    customizationStats
                      .plainQty
                  }
                </h3>

                <p className="admin-stat-sub">
                  Ordered via plain Add to Cart
                </p>

              </div>


              <div className="admin-stat-card">

                <p className="admin-stat-label">
                  Extra Straw Requests
                </p>

                <h3 className="admin-stat-value">
                  {
                    customizationStats
                      .strawQty
                  }
                </h3>

                <p className="admin-stat-sub">
                  Among customized items
                </p>

              </div>

            </div>


            <div className="admin-charts-grid">

              <div className="admin-chart-card">

                <h4>
                  Best Selling Coffee
                </h4>

                <p>
                  Top items by quantity sold,
                  from all orders.
                </p>

                <div className="admin-chart-wrap">

                  <canvas
                    ref={
                      salesCanvasRef
                    }
                  />

                </div>

              </div>


              <div className="admin-chart-card">

                <h4>
                  Payment Method Split
                </h4>

                <p>
                  Revenue share by payment method.
                </p>

                <div className="admin-chart-wrap">

                  <canvas
                    ref={
                      paymentCanvasRef
                    }
                  />

                </div>

              </div>


              <div className="admin-chart-card admin-chart-wide">

                <h4>
                  Visits Over Time
                </h4>

                <p>
                  Page views per day,
                  based on real visit logs.
                </p>

                <div className="admin-chart-wrap">

                  <canvas
                    ref={
                      visitsCanvasRef
                    }
                  />

                </div>

              </div>

            </div>


            <div
              className="admin-table-wrap"
              style={{
                marginTop:
                  '1.5rem'
              }}
            >

              <table className="admin-table">

                <thead>

                  <tr>

                    <th>
                      Worst Selling Coffee
                    </th>

                    <th>
                      Qty Sold
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {analytics.worstSellers.length === 0 ? (

                    <tr>

                      <td colSpan="2">
                        No sales data yet.
                      </td>

                    </tr>

                  ) : (

                    analytics.worstSellers.map(
                      ([name, qty]) => (

                        <tr key={name}>

                          <td>
                            {name}
                          </td>

                          <td>
                            {qty}
                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>


            <div
              className="admin-table-wrap"
              style={{
                marginTop:
                  '1.5rem'
              }}
            >

              <table className="admin-table">

                <thead>

                  <tr>

                    <th>
                      Customization Type
                    </th>

                    <th>
                      Top Choices
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {customizationStats.customizedQty === 0 ? (

                    <tr>

                      <td colSpan="2">
                        No customized orders yet.
                      </td>

                    </tr>

                  ) : (

                    <>

                      <tr>
                        <td>Size</td>
                        <td>
                          {
                            formatTopList(
                              customizationStats
                                .topSizes
                            )
                          }
                        </td>
                      </tr>


                      <tr>
                        <td>Milk</td>
                        <td>
                          {
                            formatTopList(
                              customizationStats
                                .topMilk
                            )
                          }
                        </td>
                      </tr>


                      <tr>
                        <td>Shot Strength</td>
                        <td>
                          {
                            formatTopList(
                              customizationStats
                                .topShot
                            )
                          }
                        </td>
                      </tr>


                      <tr>
                        <td>Sugar Level</td>
                        <td>
                          {
                            formatTopList(
                              customizationStats
                                .topSugar
                            )
                          }
                        </td>
                      </tr>


                      <tr>
                        <td>Roast</td>
                        <td>
                          {
                            formatTopList(
                              customizationStats
                                .topRoast
                            )
                          }
                        </td>
                      </tr>

                    </>

                  )}

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