import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";

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
  serverTimestamp,
} from "firebase/firestore";

import Chart from "chart.js/auto";
import { auth, db } from "../firebase";
import { coffeeMenu } from "../data/menuData";

import "./Adminpanel.css";

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_ADMIN_EMAIL = "adminkaka@levelupbrew.in";

const ORDER_STATUSES = [
  "placed",
  "preparing",
  "out_for_delivery",
  "completed",
  "cancelled",
];

const PAYMENT_STATUSES = ["pending", "paid", "refunded", "failed"];

const LIST_LIMIT = 500;
const BATCH_CHUNK_SIZE = 450;

const CATEGORY_OPTIONS = [
  "Classic Espresso",
  "Espresso + Milk",
  "Iced & Chilled",
  "Cold Brew",
  "Regional Favourites",
  "Signature Blends",
  "Flavoured Coffee",
  "House Specials",
  "Seasonal Specials",
  "Single Origin",
  "Pour Over",
  "Manual Brew",
  "Decaf",
  "Plant-Based",
  "Alternatives",
  "Coffee Cocktails",
];

const CUSTOM_CATEGORY_VALUE = "__custom__";

/* ============================================================
   HELPERS & UI UTILITIES
============================================================ */

const shortUid = (uid) => (uid ? `${uid.slice(0, 8)}…` : "—");

const formatCustomization = (c) => {
  if (!c) return null;
  return [
    c.size,
    c.milk,
    c.shot,
    c.sugar,
    c.roast,
    c.straw ? "Extra Straw" : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

const getStock = (item) => {
  const stock = Number(item?.stock);
  if (!Number.isFinite(stock) || stock < 0) return 0;
  return Math.floor(stock);
};

const getLowStockAt = (item) => {
  const value = Number(item?.lowStockAt);
  if (!Number.isFinite(value) || value < 0) return 5;
  return Math.floor(value);
};

const getReorderLevel = (item) => {
  const threshold = getLowStockAt(item);
  return Math.max(threshold * 3, 10);
};

const getInventoryStatus = (item) => {
  const stock = getStock(item);
  const threshold = getLowStockAt(item);
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "healthy";
};

const getInventoryStatusLabel = (item) => {
  const status = getInventoryStatus(item);
  if (status === "out") return "OUT OF STOCK";
  if (status === "low") return "LOW STOCK";
  return "IN STOCK";
};

const getInventoryStatusClass = (item) => {
  const status = getInventoryStatus(item);
  if (status === "out") return "inventory-status-out";
  if (status === "low") return "inventory-status-low";
  return "inventory-status-healthy";
};

/* ============================================================
   MAIN ADMIN PANEL COMPONENT
============================================================ */

const AdminPanel = () => {
  const navigate = useNavigate();

  // Auth & Core State
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminUid, setAdminUid] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Active Tab: orders | menu | inventory | users | feedback | analytics
  const [activeTab, setActiveTab] = useState("orders");

  // Database Data States
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [seeding, setSeeding] = useState(false);

  // UI Modals & Interaction States
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    orderId: null,
    reason: "",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    action: null,
    isDanger: false,
  });
  const [replyInput, setReplyInput] = useState({ feedbackId: null, text: "" });

  // Filters & Searches
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderDateFilter, setOrderDateFilter] = useState("");

  const [userSearch, setUserSearch] = useState("");

  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("all"); // all | flagged | resolved

  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [inventoryCategory, setInventoryCategory] = useState("all");

  // Add Item State
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    price: "",
    img: "",
    stock: "0",
    lowStockAt: "5",
  });
  const [categoryMode, setCategoryMode] = useState("select");

  // Cursor Refs
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // Helper: Show Toast
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 4000);
  };

  // Cursor Hover Handlers
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
    ringRef.current?.classList.add("hovered");
  }, []);

  const rmvHover = useCallback(() => {
    ringRef.current?.classList.remove("hovered");
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    const handleMouseOver = (e) => {
      if (e.target.closest("button, a, input, select, textarea")) addHover();
    };
    const handleMouseOut = (e) => {
      if (e.target.closest("button, a, input, select, textarea")) rmvHover();
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [onMouseMove, addHover, rmvHover]);

  // Network Status Monitor
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auth & Admin Verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? snap.data().role : null;
        const isDefaultAdmin =
          user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

        if (role === "admin" || isDefaultAdmin) {
          if (isDefaultAdmin && role !== "admin") {
            await updateDoc(doc(db, "users", user.uid), { role: "admin" });
          }
          setAuthorized(true);
          setAdminUid(user.uid);
          setAdminEmail(user.email || "");
        } else {
          navigate("/");
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        navigate("/");
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  // Self Role Real-time Listener
  useEffect(() => {
    if (!authorized || !adminUid) return;

    const unsubSelf = onSnapshot(
      doc(db, "users", adminUid),
      (snap) => {
        const role = snap.exists() ? snap.data().role : null;
        const email = snap.exists() ? snap.data().email : "";
        const isDefaultAdmin =
          email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

        if (role !== "admin" && !isDefaultAdmin) {
          signOut(auth).finally(() => navigate("/"));
        }
      },
      (err) => console.error("Self role listener error:", err),
    );

    return () => unsubSelf();
  }, [authorized, adminUid, navigate]);

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    if (!authorized) return;

    const unsubOrders = onSnapshot(
      query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(LIST_LIMIT),
      ),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("Orders listener error:", err);
        showToast("Error loading live orders.", "error");
      },
    );

    const unsubMenu = onSnapshot(
      collection(db, "menu"),
      (snap) => {
        setMenuItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error("Menu listener error:", err),
    );

    const unsubUsers = onSnapshot(
      query(collection(db, "users"), limit(LIST_LIMIT)),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error("Users listener error:", err),
    );

    const unsubVisits = onSnapshot(
      query(
        collection(db, "site_visits"),
        orderBy("createdAt", "desc"),
        limit(3000),
      ),
      (snap) => {
        setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error("Visits listener error:", err),
    );

    const unsubFeedback = onSnapshot(
      query(
        collection(db, "feedback"),
        orderBy("createdAt", "desc"),
        limit(LIST_LIMIT),
      ),
      (snap) => {
        setFeedbackList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error("Feedback listener error:", err),
    );

    return () => {
      unsubOrders();
      unsubMenu();
      unsubUsers();
      unsubVisits();
      unsubFeedback();
    };
  }, [authorized]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  /* ============================================================
     ACTIONS: ORDERS
  ============================================================ */

  const updateOrderStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
      showToast(`Order status updated to "${status.replace(/_/g, " ")}"`);
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast("Could not update order status.", "error");
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        paymentStatus,
        updatedAt: serverTimestamp(),
      });
      showToast(`Payment status updated to "${paymentStatus}"`);
    } catch (err) {
      console.error("Failed to update payment status:", err);
      showToast("Could not update payment status.", "error");
    }
  };

  const confirmCancelOrder = async () => {
    if (!cancelModal.orderId) return;
    try {
      await updateDoc(doc(db, "orders", cancelModal.orderId), {
        status: "cancelled",
        cancelReason: cancelModal.reason || "Cancelled by Store Admin",
        updatedAt: serverTimestamp(),
      });
      setCancelModal({ isOpen: false, orderId: null, reason: "" });
      showToast("Order cancelled successfully.");
    } catch (err) {
      console.error("Failed to cancel order:", err);
      showToast("Could not cancel order.", "error");
    }
  };

  const deleteOrder = (orderId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Order Permanently",
      message:
        "Are you sure you want to delete this order? This action cannot be undone.",
      isDanger: true,
      action: async () => {
        try {
          await deleteDoc(doc(db, "orders", orderId));
          showToast("Order deleted successfully.");
        } catch (err) {
          console.error("Failed to delete order:", err);
          showToast("Could not delete order.", "error");
        }
      },
    });
  };

  const handleExportOrders = () => {
    const headers =
      "Order ID,Customer,Phone,Amount,Payment Method,Payment Status,Delivery Status,Date\n";
    const rows = filteredOrders
      .map((o) => {
        const dateStr = o.createdAt?.toDate
          ? o.createdAt.toDate().toISOString()
          : "";
        return `"${o.id}","${o.customerName || "N/A"}","${o.phone || "N/A"}","${o.amount || 0}","${o.paymentMethod || "N/A"}","${o.paymentStatus || "pending"}","${o.status || "placed"}","${dateStr}"`;
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast("Orders exported successfully!");
  };

  /* ============================================================
     ACTIONS: MENU & INVENTORY
  ============================================================ */

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (
      !newItem.name.trim() ||
      !newItem.category.trim() ||
      newItem.price === ""
    ) {
      showToast("Name, category and price are required.", "error");
      return;
    }

    const priceNum = Number(newItem.price);
    const stockNum = Number(newItem.stock);
    const lowStockNum = Number(newItem.lowStockAt);

    if (Number.isNaN(priceNum) || priceNum < 0) {
      showToast("Price must be a valid, non-negative number.", "error");
      return;
    }
    if (Number.isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      showToast("Stock must be a whole number >= 0.", "error");
      return;
    }
    if (
      Number.isNaN(lowStockNum) ||
      lowStockNum < 0 ||
      !Number.isInteger(lowStockNum)
    ) {
      showToast("Low Stock threshold must be a whole number >= 0.", "error");
      return;
    }

    try {
      await addDoc(collection(db, "menu"), {
        name: newItem.name.trim(),
        category: newItem.category.trim(),
        price: priceNum,
        img: newItem.img.trim() || "",
        stock: stockNum,
        lowStockAt: lowStockNum,
        createdAt: serverTimestamp(),
      });

      setNewItem({
        name: "",
        category: "",
        price: "",
        img: "",
        stock: "0",
        lowStockAt: "5",
      });
      setCategoryMode("select");
      showToast("Menu item added successfully.");
    } catch (err) {
      console.error("Failed to add menu item:", err);
      showToast("Could not add menu item.", "error");
    }
  };

  const handleCategorySelectChange = (e) => {
    const value = e.target.value;
    if (value === CUSTOM_CATEGORY_VALUE) {
      setCategoryMode("custom");
      setNewItem({ ...newItem, category: "" });
    } else {
      setNewItem({ ...newItem, category: value });
    }
  };

  const handleBackToCategoryList = () => {
    setCategoryMode("select");
    setNewItem({ ...newItem, category: "" });
  };

  const updateMenuItem = async (id, field, value) => {
    try {
      let finalValue = value;
      if (field === "price" || field === "stock" || field === "lowStockAt") {
        finalValue = Number(value);
      }
      await updateDoc(doc(db, "menu", id), { [field]: finalValue });
      showToast("Item updated successfully.");
    } catch (err) {
      console.error("Failed to update item:", err);
      showToast("Could not update menu item.", "error");
    }
  };

  const handlePriceBlur = (item, e) => {
    const raw = e.target.value;
    const parsed = Number(raw);
    if (raw.trim() === "" || Number.isNaN(parsed) || parsed < 0) {
      showToast("Price must be a valid, non-negative number.", "error");
      e.target.value = item.price;
      return;
    }
    if (parsed !== Number(item.price)) {
      updateMenuItem(item.id, "price", parsed);
    }
  };

  const handleStockBlur = (item, e) => {
    const raw = e.target.value;
    const parsed = Number(raw);
    if (
      raw.trim() === "" ||
      Number.isNaN(parsed) ||
      parsed < 0 ||
      !Number.isInteger(parsed)
    ) {
      showToast("Stock must be a whole number >= 0.", "error");
      e.target.value = getStock(item);
      return;
    }
    if (parsed !== getStock(item)) {
      updateMenuItem(item.id, "stock", parsed);
    }
  };

  const handleLowStockBlur = (item, e) => {
    const raw = e.target.value;
    const parsed = Number(raw);
    if (
      raw.trim() === "" ||
      Number.isNaN(parsed) ||
      parsed < 0 ||
      !Number.isInteger(parsed)
    ) {
      showToast("Alert threshold must be a whole number >= 0.", "error");
      e.target.value = getLowStockAt(item);
      return;
    }
    if (parsed !== getLowStockAt(item)) {
      updateMenuItem(item.id, "lowStockAt", parsed);
    }
  };

  const changeStock = async (item, amount) => {
    const currentStock = getStock(item);
    const nextStock = Math.max(0, currentStock + amount);
    if (nextStock === currentStock) return;

    try {
      await updateDoc(doc(db, "menu", item.id), { stock: nextStock });
    } catch (err) {
      console.error("Failed to change stock:", err);
      showToast("Could not update stock.", "error");
    }
  };

  const setStockManually = async (item) => {
    const input = window.prompt(
      `Set stock for ${item.name}.\nCurrent stock: ${getStock(item)}`,
      String(getStock(item)),
    );
    if (input === null) return;

    const parsed = Number(input);
    if (Number.isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      showToast("Stock must be a whole number >= 0.", "error");
      return;
    }

    try {
      await updateDoc(doc(db, "menu", item.id), { stock: parsed });
      showToast(`Stock updated to ${parsed}`);
    } catch (err) {
      console.error("Failed to set stock:", err);
      showToast("Could not update stock.", "error");
    }
  };

  const quickRestock = async (item, quantity) => {
    const current = getStock(item);
    const next = current + quantity;
    try {
      await updateDoc(doc(db, "menu", item.id), { stock: next });
      showToast(`Restocked +${quantity} units.`);
    } catch (err) {
      console.error("Quick restock failed:", err);
      showToast("Could not restock item.", "error");
    }
  };

  const deleteMenuItem = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Menu Item",
      message: "Are you sure you want to remove this item from the live menu?",
      isDanger: true,
      action: async () => {
        try {
          await deleteDoc(doc(db, "menu", id));
          showToast("Menu item removed.");
        } catch (err) {
          console.error("Failed to delete menu item:", err);
          showToast("Could not delete item.", "error");
        }
      },
    });
  };

  const seedMenuFromStaticData = async () => {
    if (menuItems.length > 0) {
      const ok = window.confirm(
        `Firestore already has ${menuItems.length} menu items.\n\nImporting again will create duplicates.\n\nContinue?`,
      );
      if (!ok) return;
    }

    setSeeding(true);
    try {
      for (let i = 0; i < coffeeMenu.length; i += BATCH_CHUNK_SIZE) {
        const chunk = coffeeMenu.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const ref = doc(collection(db, "menu"));
          batch.set(ref, {
            ...item,
            price: Number(item.price),
            stock: Number(item.stock ?? 10),
            lowStockAt: Number(item.lowStockAt ?? 5),
            createdAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
      showToast("Menu imported into Firestore successfully.");
    } catch (err) {
      console.error("Seeding failed:", err);
      showToast("Could not import menu.", "error");
    } finally {
      setSeeding(false);
    }
  };

  /* ============================================================
     ACTIONS: USERS
  ============================================================ */

  const updateUserRole = async (uid, role) => {
    const targetUser = users.find((u) => u.id === uid);
    if (
      targetUser?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
      role !== "admin"
    ) {
      showToast("Primary admin role cannot be changed.", "error");
      return;
    }

    if (uid === adminUid && role !== "admin") {
      const ok = window.confirm(
        "You're about to remove your own admin access. You will be logged out. Continue?",
      );
      if (!ok) return;
    }
    try {
      await updateDoc(doc(db, "users", uid), { role });
      showToast("User role updated successfully.");
    } catch (err) {
      console.error("Failed to update user role:", err);
      showToast("Could not update user role.", "error");
    }
  };

  const toggleUserDisabled = async (u) => {
    const nextState = !u.disabled;
    try {
      await updateDoc(doc(db, "users", u.id), { disabled: nextState });
      showToast(`User account has been ${nextState ? "disabled" : "enabled"}.`);
    } catch (err) {
      console.error("Failed to update user disabled state:", err);
      showToast("Could not update user state.", "error");
    }
  };

  const deleteUser = (u) => {
    if (u.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      showToast("Cannot delete primary admin account.", "error");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete account ${u.email}?`,
      isDanger: true,
      action: async () => {
        try {
          await deleteDoc(doc(db, "users", u.id));
          showToast("User account deleted.");
        } catch (err) {
          console.error("Failed to delete user:", err);
          showToast("Could not delete user account.", "error");
        }
      },
    });
  };

  const adjustUserWallet = async (u) => {
    const input = window.prompt(
      `Set new wallet balance for ${u.name || u.email}.\nCurrent: ₹${u.wallet ?? 0}`,
      String(u.wallet ?? 0),
    );
    if (input === null) return;
    const parsed = Number(input);
    if (Number.isNaN(parsed) || parsed < 0) {
      showToast("Please enter a valid, non-negative number.", "error");
      return;
    }
    try {
      await updateDoc(doc(db, "users", u.id), { wallet: parsed });
      showToast("Wallet balance updated.");
    } catch (err) {
      console.error("Failed to update wallet:", err);
      showToast("Could not update wallet balance.", "error");
    }
  };

  const adjustUserTokens = async (u) => {
    const input = window.prompt(
      `Set new token balance for ${u.name || u.email}.\nCurrent: ${u.tokens ?? 0}`,
      String(u.tokens ?? 0),
    );
    if (input === null) return;
    const parsed = Number(input);
    if (Number.isNaN(parsed) || parsed < 0) {
      showToast("Please enter a valid, non-negative number.", "error");
      return;
    }
    try {
      await updateDoc(doc(db, "users", u.id), { tokens: parsed });
      showToast("Token balance updated.");
    } catch (err) {
      console.error("Failed to update tokens:", err);
      showToast("Could not update token balance.", "error");
    }
  };

  /* ============================================================
     ACTIONS: FEEDBACK
  ============================================================ */

  const updateFeedbackStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "feedback", id), { status });
      showToast(`Feedback status marked as "${status}".`);
    } catch (err) {
      console.error("Failed to update feedback status:", err);
      showToast("Could not update feedback status.", "error");
    }
  };

  const handleSendFeedbackReply = async (id) => {
    if (!replyInput.text.trim()) return;
    try {
      await updateDoc(doc(db, "feedback", id), {
        adminReply: replyInput.text.trim(),
        repliedAt: serverTimestamp(),
        status: "resolved",
      });
      setReplyInput({ feedbackId: null, text: "" });
      showToast("Reply sent to customer.");
    } catch (err) {
      console.error("Failed to reply to feedback:", err);
      showToast("Could not send reply.", "error");
    }
  };

  const deleteFeedback = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Customer Feedback",
      message:
        "Are you sure you want to permanently delete this customer review?",
      isDanger: true,
      action: async () => {
        try {
          await deleteDoc(doc(db, "feedback", id));
          showToast("Feedback review deleted.");
        } catch (err) {
          console.error("Failed to delete feedback:", err);
          showToast("Could not delete feedback.", "error");
        }
      },
    });
  };

  /* ============================================================
     COMPUTATIONS & MEMOIZED STATS
  ============================================================ */

  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        (o.id && o.id.toLowerCase().includes(search)) ||
        (o.customerName && o.customerName.toLowerCase().includes(search)) ||
        (o.phone && o.phone.toLowerCase().includes(search));

      const matchStatus =
        orderStatusFilter === "all" || o.status === orderStatusFilter;

      const matchDate =
        !orderDateFilter ||
        (o.createdAt?.toDate &&
          o.createdAt.toDate().toISOString().startsWith(orderDateFilter));

      return matchSearch && matchStatus && matchDate;
    });
  }, [orders, orderSearch, orderStatusFilter, orderDateFilter]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (!search) return true;
      return (
        (u.name && u.name.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.id && u.id.toLowerCase().includes(search))
      );
    });
  }, [users, userSearch]);

  const filteredFeedbackList = useMemo(() => {
    const search = feedbackSearch.trim().toLowerCase();
    return feedbackList.filter((f) => {
      const matchSearch =
        !search ||
        (f.customerName && f.customerName.toLowerCase().includes(search)) ||
        (f.comment && f.comment.toLowerCase().includes(search));

      const matchStatus =
        feedbackFilter === "all" || (f.status || "active") === feedbackFilter;
      return matchSearch && matchStatus;
    });
  }, [feedbackList, feedbackSearch, feedbackFilter]);

  const feedbackStats = useMemo(() => {
    const total = feedbackList.length;
    const avg = total
      ? (
          feedbackList.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) /
          total
        ).toFixed(1)
      : "0.0";

    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: feedbackList.filter((f) => Number(f.rating) === star).length,
    }));

    const sorted = [...filteredFeedbackList].sort(
      (a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0),
    );

    return { total, avg, distribution, sorted };
  }, [feedbackList, filteredFeedbackList]);

  const renderStars = (rating) => {
    const r = Number(rating) || 0;
    return "★".repeat(r) + "☆".repeat(Math.max(0, 5 - r));
  };

  const formatFeedbackDate = (value) => {
    if (!value) return "—";
    const d = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const rewardsSummary = useMemo(() => {
    const totalWalletOutstanding = users.reduce(
      (sum, u) => sum + (Number(u.wallet) || 0),
      0,
    );
    const totalTokensOutstanding = users.reduce(
      (sum, u) => sum + (Number(u.tokens) || 0),
      0,
    );
    const totalReferrals = users.reduce(
      (sum, u) => sum + (Number(u.referralCount) || 0),
      0,
    );
    return { totalWalletOutstanding, totalTokensOutstanding, totalReferrals };
  }, [users]);

  const stockSummary = useMemo(() => {
    const totalUnits = menuItems.reduce((sum, item) => sum + getStock(item), 0);
    const outOfStock = menuItems.filter((item) => getStock(item) <= 0).length;
    const lowStock = menuItems.filter((item) => {
      const stock = getStock(item);
      const threshold = getLowStockAt(item);
      return stock > 0 && stock <= threshold;
    }).length;
    const healthyStock = menuItems.filter(
      (item) => getInventoryStatus(item) === "healthy",
    ).length;
    const inventoryValue = menuItems.reduce(
      (sum, item) => sum + getStock(item) * (Number(item.price) || 0),
      0,
    );
    const reorderRequired = menuItems.filter(
      (item) => getStock(item) < getReorderLevel(item),
    ).length;

    return {
      totalUnits,
      outOfStock,
      lowStock,
      healthyStock,
      inventoryValue,
      reorderRequired,
    };
  }, [menuItems]);

  const inventoryCategories = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(menuItems.map((item) => item.category).filter(Boolean)),
      ).sort(),
    ];
  }, [menuItems]);

  const filteredInventory = useMemo(() => {
    const search = inventorySearch.trim().toLowerCase();

    return [...menuItems]
      .filter((item) => {
        if (!search) return true;
        return (
          String(item.name || "")
            .toLowerCase()
            .includes(search) ||
          String(item.category || "")
            .toLowerCase()
            .includes(search)
        );
      })
      .filter((item) => {
        if (inventoryCategory !== "all")
          return item.category === inventoryCategory;
        return true;
      })
      .filter((item) => {
        if (inventoryFilter === "all") return true;
        return getInventoryStatus(item) === inventoryFilter;
      })
      .sort((a, b) => {
        const order = { out: 0, low: 1, healthy: 2 };
        return order[getInventoryStatus(a)] - order[getInventoryStatus(b)];
      });
  }, [menuItems, inventorySearch, inventoryFilter, inventoryCategory]);

  const lowStockAlerts = useMemo(() => {
    return menuItems
      .filter((item) => {
        const stock = getStock(item);
        const threshold = getLowStockAt(item);
        return stock <= threshold;
      })
      .sort((a, b) => getStock(a) - getStock(b));
  }, [menuItems]);

  const analytics = useMemo(() => {
    const itemQty = {};
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        itemQty[item.name] =
          (itemQty[item.name] || 0) + (Number(item.qty) || 0);
      });
    });

    const itemSales = Object.entries(itemQty).sort((a, b) => b[1] - a[1]);
    const topSellers = itemSales.slice(0, 8);
    const worstSellers = [...itemSales].reverse().slice(0, 8);

    const paymentStats = {};
    orders.forEach((order) => {
      const method = order.paymentMethod || "Unknown";
      if (!paymentStats[method]) {
        paymentStats[method] = { count: 0, amount: 0 };
      }
      paymentStats[method].count += 1;
      paymentStats[method].amount += Number(order.amount) || 0;
    });

    const totalRevenue = orders.reduce(
      (sum, o) => sum + (Number(o.amount) || 0),
      0,
    );
    const totalOrders = orders.length;
    const totalVisits = visits.length;
    const uniqueVisitors = new Set(
      visits.map((v) => v.visitorId).filter(Boolean),
    ).size;

    // Today Revenue & Cancel Rate
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRevenue = orders
      .filter(
        (o) =>
          o.createdAt?.toDate &&
          o.createdAt.toDate().toISOString().startsWith(todayStr),
      )
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    const cancelledCount = orders.filter(
      (o) => o.status === "cancelled",
    ).length;
    const cancelRate = totalOrders
      ? ((cancelledCount / totalOrders) * 100).toFixed(1)
      : "0.0";
    const avgOrderValue = totalOrders
      ? (totalRevenue / totalOrders).toFixed(2)
      : "0.00";

    // Peak Ordering Hour
    const hourCounts = {};
    orders.forEach((o) => {
      if (o.createdAt?.toDate) {
        const hr = o.createdAt.toDate().getHours();
        hourCounts[hr] = (hourCounts[hr] || 0) + 1;
      }
    });
    const peakHour = Object.keys(hourCounts).reduce(
      (a, b) => (hourCounts[a] > hourCounts[b] ? a : b),
      "N/A",
    );

    const dayMap = {};
    visits.forEach((v) => {
      const d = v.createdAt?.toDate
        ? v.createdAt.toDate()
        : v.createdAt
          ? new Date(v.createdAt)
          : null;
      if (!d || Number.isNaN(d.getTime())) return;
      const sortKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
      if (!dayMap[sortKey]) dayMap[sortKey] = { label, count: 0 };
      dayMap[sortKey].count += 1;
    });

    const sortedKeys = Object.keys(dayMap).sort();
    const dayLabels = sortedKeys.map((k) => dayMap[k].label);
    const dayCounts = sortedKeys.map((k) => dayMap[k].count);

    return {
      topSellers,
      worstSellers,
      paymentStats,
      totalRevenue,
      todayRevenue,
      cancelRate,
      avgOrderValue,
      peakHour: peakHour !== "N/A" ? `${peakHour}:00` : "N/A",
      totalOrders,
      totalVisits,
      uniqueVisitors,
      dayLabels,
      dayCounts,
    };
  }, [orders, visits]);

  const customizationStats = useMemo(() => {
    const counts = { size: {}, milk: {}, shot: {}, sugar: {}, roast: {} };
    let customizedQty = 0;
    let plainQty = 0;
    let strawQty = 0;

    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const qty = Number(item.qty) || 1;
        if (item.customization) {
          customizedQty += qty;
          if (item.customization.straw) strawQty += qty;
          ["size", "milk", "shot", "sugar", "roast"].forEach((key) => {
            const val = item.customization[key];
            if (val) counts[key][val] = (counts[key][val] || 0) + qty;
          });
        } else {
          plainQty += qty;
        }
      });
    });

    const topOf = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

    return {
      customizedQty,
      plainQty,
      strawQty,
      topSizes: topOf(counts.size),
      topMilk: topOf(counts.milk),
      topShot: topOf(counts.shot),
      topSugar: topOf(counts.sugar),
      topRoast: topOf(counts.roast),
    };
  }, [orders]);

  const formatTopList = (entries) => {
    return entries.length
      ? entries.map(([label, qty]) => `${label} (${qty})`).join(", ")
      : "—";
  };

  /* ============================================================
     CHARTS RENDERING
  ============================================================ */

  const salesCanvasRef = useRef(null);
  const paymentCanvasRef = useRef(null);
  const visitsCanvasRef = useRef(null);

  const salesChartRef = useRef(null);
  const paymentChartRef = useRef(null);
  const visitsChartRef = useRef(null);

  useEffect(() => {
    if (activeTab !== "analytics") return;

    if (salesCanvasRef.current) {
      salesChartRef.current?.destroy();
      salesChartRef.current = new Chart(salesCanvasRef.current, {
        type: "bar",
        data: {
          labels: analytics.topSellers.map(([name]) => name),
          datasets: [
            {
              data: analytics.topSellers.map(([, qty]) => qty),
              backgroundColor: "rgba(201, 149, 108, 0.85)",
              borderRadius: 8,
              maxBarThickness: 40,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: "#a89070", maxRotation: 40, minRotation: 40 },
              grid: { display: false },
            },
            y: {
              ticks: { color: "#a89070", precision: 0 },
              grid: { color: "rgba(201,149,108,0.1)" },
            },
          },
        },
      });
    }

    if (paymentCanvasRef.current) {
      paymentChartRef.current?.destroy();
      const methods = Object.keys(analytics.paymentStats);
      paymentChartRef.current = new Chart(paymentCanvasRef.current, {
        type: "doughnut",
        data: {
          labels: methods,
          datasets: [
            {
              data: methods.map((m) => analytics.paymentStats[m].amount),
              backgroundColor: ["#c9956c", "#8b6a4a", "#e8c99a", "#5c4326"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: "#f0e6d3" } },
          },
        },
      });
    }

    if (visitsCanvasRef.current) {
      visitsChartRef.current?.destroy();
      visitsChartRef.current = new Chart(visitsCanvasRef.current, {
        type: "line",
        data: {
          labels: analytics.dayLabels,
          datasets: [
            {
              data: analytics.dayCounts,
              borderColor: "#c9956c",
              backgroundColor: "rgba(201, 149, 108, 0.15)",
              fill: true,
              tension: 0.35,
              pointBackgroundColor: "#c9956c",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#a89070" }, grid: { display: false } },
            y: {
              ticks: { color: "#a89070", precision: 0 },
              grid: { color: "rgba(201,149,108,0.1)" },
            },
          },
        },
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
    <div className="admin-panel admin-page">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef} />

      {/* TOAST NOTIFICATION */}
      {toast.message && (
        <div
          className={`admin-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast({ message: "", type: "success" })}>
            ✕
          </button>
        </div>
      )}

      {/* OFFLINE BANNER */}
      {isOffline && (
        <div className="admin-offline-banner">
          ⚠️ Firestore is offline. Changes will sync once internet is restored.
        </div>
      )}

      {/* HEADER */}
      <header className="admin-header">
        <div>
          <p className="section-tag">Logged in as {adminEmail}</p>
          <h1 className="form-title">
            Admin <em>Panel</em>
          </h1>
        </div>

        <button className="ghost-btn admin-logout-btn" onClick={handleLogout}>
          <span>Log Out →</span>
        </button>
      </header>

      {/* TABS */}
      <nav className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          Orders
          <span className="admin-tab-count">{orders.length}</span>
        </button>

        <button
          className={`admin-tab ${activeTab === "menu" ? "active" : ""}`}
          onClick={() => setActiveTab("menu")}
        >
          Menu
          <span className="admin-tab-count">{menuItems.length}</span>
        </button>

        <button
          className={`admin-tab ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          Smart Inventory
          {stockSummary.lowStock + stockSummary.outOfStock > 0 && (
            <span className="admin-tab-count inventory-alert-count">
              {stockSummary.lowStock + stockSummary.outOfStock}
            </span>
          )}
        </button>

        <button
          className={`admin-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
          <span className="admin-tab-count">{users.length}</span>
        </button>

        <button
          className={`admin-tab ${activeTab === "feedback" ? "active" : ""}`}
          onClick={() => setActiveTab("feedback")}
        >
          Feedback
          <span className="admin-tab-count">{feedbackList.length}</span>
        </button>

        <button
          className={`admin-tab ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </button>
      </nav>

      <main className="admin-content">
        {/* ==================== ORDERS TAB ==================== */}
        {activeTab === "orders" && (
          <div className="admin-panel-block">
            {/* Orders Filter & Search Toolbar */}
            <div className="admin-toolbar-row">
              <div className="admin-search-wrap">
                <input
                  type="text"
                  placeholder="Search by ID, customer name, phone..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div className="admin-filter-wrap">
                <select
                  className="admin-select"
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                >
                  <option value="all">All Delivery Statuses</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="admin-input admin-date-input"
                  value={orderDateFilter}
                  onChange={(e) => setOrderDateFilter(e.target.value)}
                />

                <button
                  type="button"
                  className="primary-btn admin-export-btn"
                  onClick={handleExportOrders}
                >
                  <span>📥 Export CSV</span>
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <p className="admin-empty">No orders found matching filters.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID & Date</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Rewards</th>
                      <th>Payment</th>
                      <th>Delivery Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.id.slice(0, 8)}</strong>
                          <div className="admin-subtext">
                            {order.createdAt?.toDate
                              ? order.createdAt.toDate().toLocaleString("en-IN")
                              : "—"}
                          </div>
                          <button
                            type="button"
                            className="stock-edit-link"
                            style={{
                              marginTop: "4px",
                              display: "inline-block",
                            }}
                            onClick={() => setSelectedOrder(order)}
                          >
                            Details Modal →
                          </button>
                        </td>
                        <td>
                          <strong>{order.customerName || "—"}</strong>
                          <div className="admin-subtext">{order.phone}</div>
                          {order.address && (
                            <div className="admin-subtext admin-address-sub">
                              {order.address}
                            </div>
                          )}
                        </td>
                        <td>
                          {(order.items || []).map((i, idx) => {
                            const customTag = formatCustomization(
                              i.customization,
                            );
                            return (
                              <div key={idx} className="admin-order-item-line">
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
                          })}
                        </td>
                        <td>₹ {order.amount}</td>
                        <td>
                          {order.walletUsed > 0 && (
                            <div className="admin-subtext">
                              Wallet: −₹{order.walletUsed}
                            </div>
                          )}
                          {order.tokenDiscount > 0 && (
                            <div className="admin-subtext">
                              Tokens: −₹{order.tokenDiscount}
                            </div>
                          )}
                          {!order.walletUsed && !order.tokenDiscount && "—"}
                        </td>
                        <td>
                          <div className="admin-subtext">
                            {order.paymentMethod}
                          </div>
                          <select
                            className="admin-select admin-select-sm"
                            value={order.paymentStatus || "pending"}
                            onChange={(e) =>
                              updatePaymentStatus(order.id, e.target.value)
                            }
                          >
                            {PAYMENT_STATUSES.map((ps) => (
                              <option key={ps} value={ps}>
                                {ps}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="admin-select"
                            value={order.status}
                            onChange={(e) =>
                              updateOrderStatus(order.id, e.target.value)
                            }
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                          {order.cancelReason && (
                            <div className="admin-cancel-reason-tag">
                              Reason: {order.cancelReason}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="admin-action-btn-group">
                            <button
                              type="button"
                              className="stock-btn"
                              style={{ width: "auto", padding: "0 8px" }}
                              onClick={() =>
                                setCancelModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  reason: "",
                                })
                              }
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="admin-delete-btn"
                              onClick={() => deleteOrder(order.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== MENU TAB ==================== */}
        {activeTab === "menu" && (
          <div className="admin-panel-block">
            <div className="admin-stats-row admin-stock-summary">
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Stock Units</p>
                <h3 className="admin-stat-value">{stockSummary.totalUnits}</h3>
                <p className="admin-stat-sub">Across all menu items</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Out of Stock Items</p>
                <h3 className="admin-stat-value">{stockSummary.outOfStock}</h3>
                <p className="admin-stat-sub">Stock = 0</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Low Stock Items</p>
                <h3 className="admin-stat-value">{stockSummary.lowStock}</h3>
                <p className="admin-stat-sub">Based on each item's threshold</p>
              </div>
            </div>

            {menuItems.length === 0 && (
              <div className="admin-seed-box">
                <p>
                  Firestore's <code>menu</code> collection is empty.
                </p>
                <button
                  className="primary-btn"
                  onClick={seedMenuFromStaticData}
                  disabled={seeding}
                >
                  <span>
                    {seeding
                      ? "Importing..."
                      : "Import existing menu into Firestore"}
                  </span>
                </button>
              </div>
            )}

            <form className="admin-add-form" onSubmit={handleAddItem}>
              <p className="section-tag">Add New Item</p>
              <div className="admin-form-row">
                <div className="admin-input-group">
                  <label className="admin-input-label">Item Name</label>
                  <input
                    placeholder="e.g. Hazelnut Latte"
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Category</label>
                  {categoryMode === "select" ? (
                    <select
                      className="admin-select"
                      value={newItem.category}
                      onChange={handleCategorySelectChange}
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value={CUSTOM_CATEGORY_VALUE}>Custom…</option>
                    </select>
                  ) : (
                    <div className="admin-category-custom-wrap">
                      <input
                        placeholder="Type custom category"
                        value={newItem.category}
                        onChange={(e) =>
                          setNewItem({ ...newItem, category: e.target.value })
                        }
                        autoFocus
                      />
                      <button
                        type="button"
                        className="stock-edit-link"
                        onClick={handleBackToCategoryList}
                      >
                        ← Back to list
                      </button>
                    </div>
                  )}
                </div>

                <div className="admin-input-group">
                  <label className="admin-input-label">Price (₹)</label>
                  <input
                    placeholder="Price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                  />
                </div>
                <div className="admin-input-group">
                  <label className="admin-input-label">Stock (Units)</label>
                  <input
                    placeholder="Stock"
                    type="number"
                    min="0"
                    step="1"
                    value={newItem.stock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, stock: e.target.value })
                    }
                  />
                </div>
                <div className="admin-input-group">
                  <label className="admin-input-label">Low Stock Alert</label>
                  <input
                    placeholder="Alert threshold"
                    type="number"
                    min="0"
                    step="1"
                    value={newItem.lowStockAt}
                    onChange={(e) =>
                      setNewItem({ ...newItem, lowStockAt: e.target.value })
                    }
                  />
                </div>
                <div className="admin-input-group">
                  <label className="admin-input-label">Product Image URL</label>
                  <input
                    placeholder="https://..."
                    value={newItem.img}
                    onChange={(e) =>
                      setNewItem({ ...newItem, img: e.target.value })
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="primary-btn admin-add-submit-btn"
                >
                  <span>Add Item</span>
                </button>
              </div>
            </form>

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
                    {menuItems.map((item) => {
                      const stock = getStock(item);
                      const threshold = getLowStockAt(item);

                      return (
                        <tr key={item.id}>
                          <td>
                            <input
                              className="admin-inline-input"
                              defaultValue={item.name}
                              onBlur={(e) =>
                                e.target.value !== item.name &&
                                updateMenuItem(item.id, "name", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="admin-inline-input"
                              defaultValue={item.category}
                              onBlur={(e) =>
                                e.target.value !== item.category &&
                                updateMenuItem(
                                  item.id,
                                  "category",
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="admin-inline-input admin-price-input"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={item.price}
                              onBlur={(e) => handlePriceBlur(item, e)}
                            />
                          </td>
                          <td>
                            <div className="stock-control">
                              <button
                                type="button"
                                className="stock-btn"
                                onClick={() => changeStock(item, -1)}
                                disabled={stock <= 0}
                              >
                                −
                              </button>
                              <input
                                className="stock-number-input"
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={stock}
                                key={`stock-${item.id}-${stock}`}
                                onBlur={(e) => handleStockBlur(item, e)}
                                onClick={(e) => e.currentTarget.select()}
                              />
                              <button
                                type="button"
                                className="stock-btn"
                                onClick={() => changeStock(item, 1)}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="stock-edit-link"
                              onClick={() => setStockManually(item)}
                            >
                              Set
                            </button>
                          </td>
                          <td>
                            <input
                              className="stock-threshold-input"
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={threshold}
                              key={`threshold-${item.id}-${threshold}`}
                              onBlur={(e) => handleLowStockBlur(item, e)}
                            />
                          </td>
                          <td>
                            {item.img ? (
                              <img
                                src={item.img}
                                alt={item.name}
                                className="admin-thumb"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-delete-btn"
                              onClick={() => deleteMenuItem(item.id)}
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

        {/* ==================== SMART INVENTORY TAB ==================== */}
        {activeTab === "inventory" && (
          <div className="admin-panel-block">
            <div className="inventory-header">
              <div>
                <p className="section-tag">SMART INVENTORY MANAGEMENT</p>
                <h2 className="inventory-title">
                  Inventory <em>Control Center</em>
                </h2>
                <p className="inventory-description">
                  Monitor stock levels, calculate reorder quantities and restock
                  supplies.
                </p>
              </div>

              {stockSummary.lowStock + stockSummary.outOfStock > 0 && (
                <div className="inventory-alert-badge">
                  <span className="inventory-alert-icon">⚠</span>
                  <span>
                    {stockSummary.lowStock + stockSummary.outOfStock} items need
                    attention
                  </span>
                </div>
              )}
            </div>

            <div className="inventory-summary-grid">
              <div className="inventory-summary-card">
                <div className="inventory-summary-icon">📦</div>
                <div>
                  <p>Total Units</p>
                  <h3>{stockSummary.totalUnits}</h3>
                  <span>All inventory</span>
                </div>
              </div>

              <div className="inventory-summary-card inventory-card-danger">
                <div className="inventory-summary-icon">🚫</div>
                <div>
                  <p>Out of Stock</p>
                  <h3>{stockSummary.outOfStock}</h3>
                  <span>Immediate action</span>
                </div>
              </div>

              <div className="inventory-summary-card inventory-card-warning">
                <div className="inventory-summary-icon">⚠️</div>
                <div>
                  <p>Low Stock</p>
                  <h3>{stockSummary.lowStock}</h3>
                  <span>Restock soon</span>
                </div>
              </div>

              <div className="inventory-summary-card inventory-card-success">
                <div className="inventory-summary-icon">✓</div>
                <div>
                  <p>Healthy Stock</p>
                  <h3>{stockSummary.healthyStock}</h3>
                  <span>Good inventory</span>
                </div>
              </div>

              <div className="inventory-summary-card">
                <div className="inventory-summary-icon">₹</div>
                <div>
                  <p>Inventory Value</p>
                  <h3>
                    ₹{stockSummary.inventoryValue.toLocaleString("en-IN")}
                  </h3>
                  <span>Current stock value</span>
                </div>
              </div>

              <div className="inventory-summary-card inventory-card-warning">
                <div className="inventory-summary-icon">🔄</div>
                <div>
                  <p>Reorder Required</p>
                  <h3>{stockSummary.reorderRequired}</h3>
                  <span>Below reorder level</span>
                </div>
              </div>
            </div>

            {lowStockAlerts.length > 0 && (
              <div className="smart-alert-panel">
                <div className="smart-alert-header">
                  <div>
                    <p className="section-tag">INVENTORY ALERT</p>
                    <h3>Low Stock Alert</h3>
                  </div>
                  <span className="smart-alert-count">
                    {lowStockAlerts.length}
                  </span>
                </div>

                <div className="smart-alert-list">
                  {lowStockAlerts.slice(0, 8).map((item) => {
                    const stock = getStock(item);
                    const threshold = getLowStockAt(item);
                    const isOut = stock <= 0;

                    return (
                      <div
                        key={item.id}
                        className={`smart-alert-item ${
                          isOut ? "alert-item-out" : "alert-item-low"
                        }`}
                      >
                        <div className="smart-alert-product">
                          {item.img ? (
                            <img
                              src={item.img}
                              alt={item.name}
                              className="smart-alert-image"
                            />
                          ) : (
                            <div className="smart-alert-image-placeholder">
                              ☕
                            </div>
                          )}
                          <div>
                            <strong>{item.name}</strong>
                            <span>{item.category || "Coffee"}</span>
                            <span className="smart-alert-price">
                              ₹{Number(item.price || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        <div className="smart-alert-stock">
                          <span>Current Stock</span>
                          <div className="stock-control smart-alert-stock-control">
                            <button
                              type="button"
                              className="stock-btn"
                              onClick={() => changeStock(item, -1)}
                              disabled={stock <= 0}
                            >
                              −
                            </button>
                            <input
                              className="stock-number-input"
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={stock}
                              key={`alert-stock-${item.id}-${stock}`}
                              onBlur={(e) => handleStockBlur(item, e)}
                              onClick={(e) => e.currentTarget.select()}
                            />
                            <button
                              type="button"
                              className="stock-btn"
                              onClick={() => changeStock(item, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="smart-alert-threshold">
                          <span>Alert At</span>
                          <strong>{threshold}</strong>
                        </div>

                        <div className="smart-alert-status">
                          <span
                            className={
                              isOut
                                ? "inventory-badge inventory-badge-out"
                                : "inventory-badge inventory-badge-low"
                            }
                          >
                            {isOut ? "OUT OF STOCK" : "LOW STOCK"}
                          </span>
                        </div>

                        <div className="smart-alert-actions">
                          <button
                            type="button"
                            className="inventory-restock-btn"
                            onClick={() => quickRestock(item, 10)}
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            className="inventory-restock-btn"
                            onClick={() => quickRestock(item, 25)}
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            className="inventory-set-btn"
                            onClick={() => setStockManually(item)}
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="inventory-toolbar">
              <div className="inventory-search">
                <span>🔎</span>
                <input
                  type="text"
                  placeholder="Search product or category..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
              </div>

              <div className="inventory-filter-group">
                <button
                  type="button"
                  className={
                    inventoryFilter === "all"
                      ? "inventory-filter active"
                      : "inventory-filter"
                  }
                  onClick={() => setInventoryFilter("all")}
                >
                  All <span>{menuItems.length}</span>
                </button>
                <button
                  type="button"
                  className={
                    inventoryFilter === "out"
                      ? "inventory-filter filter-out active"
                      : "inventory-filter filter-out"
                  }
                  onClick={() => setInventoryFilter("out")}
                >
                  Out <span>{stockSummary.outOfStock}</span>
                </button>
                <button
                  type="button"
                  className={
                    inventoryFilter === "low"
                      ? "inventory-filter filter-low active"
                      : "inventory-filter filter-low"
                  }
                  onClick={() => setInventoryFilter("low")}
                >
                  Low <span>{stockSummary.lowStock}</span>
                </button>
                <button
                  type="button"
                  className={
                    inventoryFilter === "healthy"
                      ? "inventory-filter filter-healthy active"
                      : "inventory-filter filter-healthy"
                  }
                  onClick={() => setInventoryFilter("healthy")}
                >
                  Healthy <span>{stockSummary.healthyStock}</span>
                </button>
              </div>

              <select
                className="inventory-category-select"
                value={inventoryCategory}
                onChange={(e) => setInventoryCategory(e.target.value)}
              >
                {inventoryCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </option>
                ))}
              </select>
            </div>

            {filteredInventory.length === 0 ? (
              <div className="inventory-empty">
                <div>📦</div>
                <h3>No inventory items found</h3>
                <p>Try changing your search or filters.</p>
              </div>
            ) : (
              <div className="admin-table-wrap inventory-table-wrap">
                <table className="admin-table inventory-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Current Stock</th>
                      <th>Alert Level</th>
                      <th>Reorder To</th>
                      <th>Status</th>
                      <th>Quick Restock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const stock = getStock(item);
                      const threshold = getLowStockAt(item);
                      const reorderLevel = getReorderLevel(item);
                      const status = getInventoryStatus(item);

                      return (
                        <tr
                          key={item.id}
                          className={
                            status === "out"
                              ? "inventory-row-out"
                              : status === "low"
                                ? "inventory-row-low"
                                : ""
                          }
                        >
                          <td>
                            <div className="inventory-product-cell">
                              {item.img ? (
                                <img
                                  src={item.img}
                                  alt={item.name}
                                  className="inventory-product-image"
                                />
                              ) : (
                                <div className="inventory-product-placeholder">
                                  ☕
                                </div>
                              )}
                              <div>
                                <strong>{item.name}</strong>
                                <span>
                                  ₹
                                  {Number(item.price || 0).toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>{item.category || "—"}</td>
                          <td>
                            ₹{Number(item.price || 0).toLocaleString("en-IN")}
                          </td>
                          <td>
                            <div className="inventory-stock-control">
                              <button
                                type="button"
                                className="inventory-stock-btn"
                                onClick={() => changeStock(item, -1)}
                                disabled={stock <= 0}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="inventory-stock-input"
                                value={stock}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  if (Number.isInteger(value) && value >= 0) {
                                    updateMenuItem(item.id, "stock", value);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="inventory-stock-btn"
                                onClick={() => changeStock(item, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className="inventory-threshold-cell">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="inventory-threshold-input"
                                defaultValue={threshold}
                                key={`${item.id}-${threshold}`}
                                onBlur={(e) => handleLowStockBlur(item, e)}
                              />
                              <span>units</span>
                            </div>
                          </td>
                          <td>
                            <span className="inventory-reorder-number">
                              {reorderLevel}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`inventory-badge ${getInventoryStatusClass(item)}`}
                            >
                              {status === "out" && "🚫 "}
                              {status === "low" && "⚠ "}
                              {status === "healthy" && "✓ "}
                              {getInventoryStatusLabel(item)}
                            </span>
                          </td>
                          <td>
                            <div className="inventory-quick-actions">
                              <button
                                type="button"
                                onClick={() => quickRestock(item, 10)}
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => quickRestock(item, 25)}
                              >
                                +25
                              </button>
                              <button
                                type="button"
                                className="inventory-set-action"
                                onClick={() => setStockManually(item)}
                              >
                                Set
                              </button>
                            </div>
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

        {/* ==================== USERS TAB ==================== */}
        {activeTab === "users" && (
          <div className="admin-panel-block">
            <div className="admin-stats-row" style={{ marginBottom: "1.5rem" }}>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Wallet Outstanding</p>
                <h3 className="admin-stat-value">
                  ₹{rewardsSummary.totalWalletOutstanding}
                </h3>
                <p className="admin-stat-sub">Across all users</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Tokens Outstanding</p>
                <h3 className="admin-stat-value">
                  {rewardsSummary.totalTokensOutstanding}
                </h3>
                <p className="admin-stat-sub">Across all users</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Referrals</p>
                <h3 className="admin-stat-value">
                  {rewardsSummary.totalReferrals}
                </h3>
                <p className="admin-stat-sub">
                  Successful signups via referral
                </p>
              </div>
            </div>

            <div className="admin-toolbar-row" style={{ marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder="Search users by name, email, ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="admin-input"
                style={{ maxWidth: "320px" }}
              />
            </div>

            {filteredUsers.length === 0 ? (
              <p className="admin-empty">No users found.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name / Details</th>
                      <th>Email</th>
                      <th>Provider</th>
                      <th>Wallet</th>
                      <th>Tokens</th>
                      <th>Referrals</th>
                      <th>Role</th>
                      <th>Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isDefaultAdmin =
                        u.email?.toLowerCase() ===
                        DEFAULT_ADMIN_EMAIL.toLowerCase();

                      return (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name || "—"}</strong>
                            <div className="admin-subtext">
                              ID: {shortUid(u.id)}
                            </div>
                          </td>
                          <td>{u.email}</td>
                          <td>{u.provider || "password"}</td>
                          <td>
                            <button
                              className="admin-inline-input"
                              style={{ cursor: "pointer", textAlign: "left" }}
                              title="Click to edit wallet balance"
                              onClick={() => adjustUserWallet(u)}
                            >
                              ₹{u.wallet ?? 0}
                            </button>
                          </td>
                          <td>
                            <button
                              className="admin-inline-input"
                              style={{ cursor: "pointer", textAlign: "left" }}
                              title="Click to edit token balance"
                              onClick={() => adjustUserTokens(u)}
                            >
                              {u.tokens ?? 0}
                            </button>
                          </td>
                          <td>
                            <div>{u.referralCount ?? 0} referred</div>
                            <div className="admin-subtext">
                              By: {shortUid(u.referredBy)}
                            </div>
                          </td>
                          <td>
                            <select
                              className="admin-select"
                              value={
                                isDefaultAdmin ? "admin" : u.role || "customer"
                              }
                              disabled={isDefaultAdmin}
                              onChange={(e) =>
                                updateUserRole(u.id, e.target.value)
                              }
                            >
                              <option value="customer">customer</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td>
                            <div className="admin-action-btn-group">
                              <button
                                type="button"
                                className="stock-btn"
                                style={{
                                  width: "auto",
                                  padding: "0 8px",
                                  backgroundColor: u.disabled
                                    ? "#e57373"
                                    : "#81c784",
                                }}
                                onClick={() => toggleUserDisabled(u)}
                              >
                                {u.disabled ? "Enable" : "Disable"}
                              </button>
                              <button
                                type="button"
                                className="admin-delete-btn"
                                onClick={() => deleteUser(u)}
                              >
                                Delete
                              </button>
                            </div>
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

        {/* ==================== FEEDBACK TAB ==================== */}
        {activeTab === "feedback" && (
          <div className="admin-panel-block">
            <div className="admin-stats-row">
              <div className="admin-stat-card">
                <p className="admin-stat-label">Average Rating</p>
                <h3 className="admin-stat-value">{feedbackStats.avg} / 5</h3>
                <p className="admin-stat-sub">
                  Across {feedbackStats.total} reviews
                </p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Reviews</p>
                <h3 className="admin-stat-value">{feedbackStats.total}</h3>
                <p className="admin-stat-sub">Submitted by customers</p>
              </div>
              {feedbackStats.distribution.map(({ star, count }) => (
                <div className="admin-stat-card" key={star}>
                  <p className="admin-stat-label">
                    {star} Star{star > 1 ? "s" : ""}
                  </p>
                  <h3 className="admin-stat-value">{count}</h3>
                  <p className="admin-stat-sub">
                    {feedbackStats.total
                      ? Math.round((count / feedbackStats.total) * 100)
                      : 0}
                    % of reviews
                  </p>
                </div>
              ))}
            </div>

            {/* Feedback Search and Filter */}
            <div className="admin-toolbar-row" style={{ marginTop: "1.5rem" }}>
              <input
                type="text"
                placeholder="Search reviews or customers..."
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                className="admin-input"
                style={{ maxWidth: "300px" }}
              />
              <select
                className="admin-select"
                value={feedbackFilter}
                onChange={(e) => setFeedbackFilter(e.target.value)}
              >
                <option value="all">All Feedback Statuses</option>
                <option value="flagged">Flagged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {filteredFeedbackList.length === 0 ? (
              <p className="admin-empty">No feedback found.</p>
            ) : (
              <div className="admin-table-wrap" style={{ marginTop: "1rem" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Rating</th>
                      <th>Comment & Reply</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackStats.sorted.map((f) => (
                      <tr
                        key={f.id}
                        className={
                          Number(f.rating) <= 2 ? "admin-row-flagged" : ""
                        }
                      >
                        <td>
                          <strong>{f.customerName || "—"}</strong>
                          <div className="admin-subtext">
                            {(f.items || []).join(", ")}
                          </div>
                        </td>
                        <td className="admin-rating-cell">
                          {renderStars(f.rating)}
                        </td>
                        <td>
                          <div>
                            {f.comment || (
                              <span className="admin-subtext">No comment</span>
                            )}
                          </div>
                          {f.adminReply && (
                            <div className="admin-reply-box">
                              <strong>Reply:</strong> {f.adminReply}
                            </div>
                          )}

                          {replyInput.feedbackId === f.id ? (
                            <div className="admin-inline-reply-input">
                              <input
                                type="text"
                                placeholder="Type response..."
                                value={replyInput.text}
                                onChange={(e) =>
                                  setReplyInput({
                                    ...replyInput,
                                    text: e.target.value,
                                  })
                                }
                              />
                              <button
                                type="button"
                                className="primary-btn"
                                style={{ padding: "4px 10px" }}
                                onClick={() => handleSendFeedbackReply(f.id)}
                              >
                                Send
                              </button>
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={() =>
                                  setReplyInput({ feedbackId: null, text: "" })
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="stock-edit-link"
                              style={{
                                marginTop: "4px",
                                display: "inline-block",
                              }}
                              onClick={() =>
                                setReplyInput({
                                  feedbackId: f.id,
                                  text: f.adminReply || "",
                                })
                              }
                            >
                              💬 {f.adminReply ? "Edit Reply" : "Reply"}
                            </button>
                          )}
                        </td>
                        <td>
                          <span
                            className={`inventory-badge ${
                              f.status === "flagged"
                                ? "inventory-badge-out"
                                : f.status === "resolved"
                                  ? "inventory-badge-healthy"
                                  : "inventory-badge-low"
                            }`}
                          >
                            {f.status || "active"}
                          </span>
                        </td>
                        <td>{formatFeedbackDate(f.createdAt)}</td>
                        <td>
                          <div className="admin-action-btn-group">
                            <button
                              type="button"
                              className="stock-btn"
                              style={{ width: "auto", padding: "0 6px" }}
                              onClick={() =>
                                updateFeedbackStatus(
                                  f.id,
                                  f.status === "flagged" ? "active" : "flagged",
                                )
                              }
                            >
                              {f.status === "flagged" ? "Unflag" : "Flag"}
                            </button>
                            <button
                              type="button"
                              className="admin-delete-btn"
                              onClick={() => deleteFeedback(f.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== ANALYTICS TAB ==================== */}
        {activeTab === "analytics" && (
          <div className="admin-panel-block">
            <div className="admin-stats-row">
              <div className="admin-stat-card">
                <p className="admin-stat-label">Total Visits</p>
                <h3 className="admin-stat-value">{analytics.totalVisits}</h3>
                <p className="admin-stat-sub">Page views</p>
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
                <p className="admin-stat-sub">
                  Today: ₹{analytics.todayRevenue}
                </p>
              </div>
            </div>

            <div className="admin-stats-row" style={{ marginTop: "1rem" }}>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Avg Order Value</p>
                <h3 className="admin-stat-value">₹{analytics.avgOrderValue}</h3>
                <p className="admin-stat-sub">Revenue per order</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Cancellation Rate</p>
                <h3 className="admin-stat-value">{analytics.cancelRate}%</h3>
                <p className="admin-stat-sub">Cancelled orders</p>
              </div>
              <div className="admin-stat-card">
                <p className="admin-stat-label">Peak Ordering Hour</p>
                <h3 className="admin-stat-value">{analytics.peakHour}</h3>
                <p className="admin-stat-sub">Busiest window</p>
              </div>
            </div>

            <div className="admin-charts-grid">
              <div className="admin-chart-card">
                <h4>Best Selling Coffee</h4>
                <p>Top items by quantity sold.</p>
                <div className="admin-chart-wrap">
                  <canvas ref={salesCanvasRef} />
                </div>
              </div>

              <div className="admin-chart-card">
                <h4>Payment Method Split</h4>
                <p>Revenue share by method.</p>
                <div className="admin-chart-wrap">
                  <canvas ref={paymentCanvasRef} />
                </div>
              </div>

              <div className="admin-chart-card admin-chart-wide">
                <h4>Visits Over Time</h4>
                <p>Daily page views.</p>
                <div className="admin-chart-wrap">
                  <canvas ref={visitsCanvasRef} />
                </div>
              </div>
            </div>

            <div className="admin-table-wrap" style={{ marginTop: "1.5rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Worst Selling Coffee</th>
                    <th>Qty Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.worstSellers.length === 0 ? (
                    <tr>
                      <td colSpan="2">No sales data yet.</td>
                    </tr>
                  ) : (
                    analytics.worstSellers.map(([name, qty]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{qty}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: ORDER DETAILS ================= */}
      {selectedOrder && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-box">
            <div className="admin-modal-header">
              <h3>Order Details #{selectedOrder.id}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="admin-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-modal-row">
                <span className="admin-modal-label">Customer Name:</span>
                <span>{selectedOrder.customerName || "—"}</span>
              </div>
              <div className="admin-modal-row">
                <span className="admin-modal-label">Phone / Email:</span>
                <span>{selectedOrder.phone || selectedOrder.email || "—"}</span>
              </div>
              <div className="admin-modal-row">
                <span className="admin-modal-label">Address:</span>
                <span>{selectedOrder.address || "Dine-in / Pickup"}</span>
              </div>
              <div className="admin-modal-row">
                <span className="admin-modal-label">
                  Payment Method / Status:
                </span>
                <span>
                  {selectedOrder.paymentMethod} (
                  {selectedOrder.paymentStatus || "pending"})
                </span>
              </div>

              <h4
                style={{
                  marginTop: "1rem",
                  borderBottom: "1px solid #332619",
                  paddingBottom: "4px",
                }}
              >
                Order Items
              </h4>
              <div className="admin-modal-items-list">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="admin-modal-item-entry">
                    <span>
                      {item.name} × {item.qty}
                    </span>
                    <strong>
                      ₹{Number(item.price || 0) * Number(item.qty || 1)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                className="primary-btn"
                onClick={() => setSelectedOrder(null)}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CANCEL REASON ================= */}
      {cancelModal.isOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-box">
            <div className="admin-modal-header">
              <h3>Cancel Order</h3>
              <button
                onClick={() =>
                  setCancelModal({ isOpen: false, orderId: null, reason: "" })
                }
                className="admin-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-subtext" style={{ marginBottom: "8px" }}>
                Please specify why this order is being cancelled:
              </p>
              <textarea
                className="admin-textarea"
                rows={3}
                placeholder="e.g. Out of stock, customer requested cancellation..."
                value={cancelModal.reason}
                onChange={(e) =>
                  setCancelModal({ ...cancelModal, reason: e.target.value })
                }
              />
            </div>
            <div className="admin-modal-footer">
              <button
                className="ghost-btn"
                onClick={() =>
                  setCancelModal({ isOpen: false, orderId: null, reason: "" })
                }
              >
                Back
              </button>
              <button className="primary-btn" onClick={confirmCancelOrder}>
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= GENERIC CONFIRM MODAL ================= */}
      {confirmModal.isOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-box">
            <div className="admin-modal-header">
              <h3>{confirmModal.title}</h3>
              <button
                onClick={() =>
                  setConfirmModal({ ...confirmModal, isOpen: false })
                }
                className="admin-modal-close"
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="admin-modal-footer">
              <button
                className="ghost-btn"
                onClick={() =>
                  setConfirmModal({ ...confirmModal, isOpen: false })
                }
              >
                Cancel
              </button>
              <button
                className="primary-btn"
                style={{
                  backgroundColor: confirmModal.isDanger ? "#d32f2f" : "",
                }}
                onClick={() => {
                  confirmModal.action?.();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
              >
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
