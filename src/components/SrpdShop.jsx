"use client"
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, ShoppingCart, Home, ListOrdered, Settings, X, Plus, Minus,
  BookOpen, PenTool, UtensilsCrossed, Armchair, Grid3x3, Check,
  Trash2, Pencil, Bell, ChevronLeft, Package, Truck, CircleCheck, Clock
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All", icon: Grid3x3 },
  { id: "notebooks", label: "Notebooks", icon: BookOpen },
  { id: "stationery", label: "Stationery", icon: PenTool },
  { id: "utility", label: "Daily Utility", icon: UtensilsCrossed },
  { id: "furniture", label: "Furniture", icon: Armchair },
];

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const ADMIN_PASSCODE = "SRPD@Bamiyal";

const SEED_PRODUCTS = [
  { id: "p1", name: "200 Page Ruled Notebook", price: 45, category: "notebooks", inStock: true, image: "📓" },
  { id: "p2", name: "Long Notebook (Register)", price: 60, category: "notebooks", inStock: true, image: "📒" },
  { id: "p3", name: "Blue Ball Pen (Pack of 5)", price: 25, category: "stationery", inStock: true, image: "🖊️" },
  { id: "p4", name: "Geometry Box", price: 55, category: "stationery", inStock: true, image: "📐" },
  { id: "p5", name: "Steel Tiffin Box (3 Tier)", price: 320, category: "utility", inStock: true, image: "🍱" },
  { id: "p6", name: "Water Bottle 1L", price: 150, category: "utility", inStock: false, image: "🧴" },
  { id: "p7", name: "Study Table (Foldable)", price: 1450, category: "furniture", inStock: true, image: "🪑" },
  { id: "p8", name: "Bookshelf - Small", price: 950, category: "furniture", inStock: true, image: "🗄️" },
];

const STATUS_STEPS = ["pending", "ready", "completed"];
const STATUS_LABEL = { pending: "Pending", ready: "Ready / Out for Delivery", completed: "Completed" };
const STATUS_COLOR = {
  pending: "bg-slate-100 text-slate-600 border-slate-300",
  ready: "bg-amber-100 text-amber-800 border-amber-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.08;
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 250);
  } catch (e) {}
}

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function Money({ amount }) {
  return <span>₹{Number(amount).toLocaleString("en-IN")}</span>;
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
      {message}
    </div>
  );
}

export default function SrpdShop() {
  const [loading, setLoading] = useState(true);
  const [products, setProductsState] = useState([]);
  const [orders, setOrdersState] = useState([]);
  const [screen, setScreen] = useState("home");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [toast, setToast] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const ordersCountRef = useRef(0);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  function setProducts(next) {
    setProductsState(next);
    lsSet("srpd:products", next);
  }
  function setOrders(next) {
    setOrdersState(next);
    ordersCountRef.current = next.length;
    lsSet("srpd:orders", next);
  }

  useEffect(() => {
    let p = lsGet("srpd:products", null);
    if (!p) { p = SEED_PRODUCTS; lsSet("srpd:products", p); }
    const o = lsGet("srpd:orders", []);
    const saved = lsGet("srpd:my-phone", null);
    setProductsState(p);
    setOrdersState(o);
    ordersCountRef.current = o.length;
    if (saved) { setPhone(saved.phone || ""); setName(saved.name || ""); }
    setLoading(false);
  }, []);

  // Poll localStorage for new orders (admin notification)
  useEffect(() => {
    const t = setInterval(() => {
      const o = lsGet("srpd:orders", []);
      if (o.length > ordersCountRef.current && adminOpen && adminAuthed) {
        beep();
        showToast("🔔 New order received");
      }
      ordersCountRef.current = o.length;
      setOrdersState(o);
    }, 3000);
    return () => clearInterval(t);
  }, [adminOpen, adminAuthed, showToast]);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ ...products.find(p => p.id === id), qty }))
    .filter(i => i.id);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  function addToCart(id) {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
    showToast("Added to cart");
  }
  function changeQty(id, delta) {
    setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + delta) }));
  }

  function placeOrder(paymentMethod) {
    if (!name.trim() || !phone.trim()) return;
    setCheckoutStep("paying");
    lsSet("srpd:my-phone", { name, phone });
    const finalize = () => {
      const order = {
        id: uid("ord_"),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        total: cartTotal,
        paymentMethod,
        status: "pending",
        createdAt: Date.now(),
      };
      const latest = lsGet("srpd:orders", []);
      const next = [order, ...latest];
      setOrders(next);
      setCart({});
      setCheckoutStep("done");
    };
    if (paymentMethod === "online") { setTimeout(finalize, 1300); } else { finalize(); }
  }

  const filteredProducts = products.filter(p => {
    const matchCat = category === "all" || p.category === category;
    const matchQ = p.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const myOrders = orders
    .filter(o => o.customerPhone === phone)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Loading SRPD Shop…</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col relative overflow-hidden" style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" }}>
      <Toast message={toast} />

      {/* Header */}
      <header className="shrink-0 bg-amber-400 text-slate-900 px-4 pt-3 pb-3 shadow-sm z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white text-amber-600 font-extrabold flex items-center justify-center text-sm">SR</div>
            <div className="font-extrabold text-lg tracking-tight">SRPD Shop</div>
          </div>
          <button onClick={() => setAdminOpen(true)} aria-label="Admin" className="w-9 h-9 rounded-full bg-amber-300 flex items-center justify-center">
            <Settings size={18} />
          </button>
        </div>
        <div className="mt-3 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search products"
            className="w-full rounded-full bg-white text-slate-800 placeholder-slate-400 pl-10 pr-4 py-2.5 text-base outline-none"
          />
        </div>
      </header>

      {/* Category chips */}
      {screen === "home" && (
        <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 bg-slate-50 border-b border-slate-100 z-20">
          {CATEGORIES.map(c => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-semibold ${active ? "bg-amber-500 border-amber-500 text-slate-900" : "bg-white border-slate-200 text-slate-600"}`}>
                <Icon size={16} />{c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <main className="flex-1 overflow-y-auto pb-28">
        {screen === "home" && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center text-slate-400 text-sm py-10">No products found.</div>
            )}
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                <div className="h-24 bg-slate-50 flex items-center justify-center text-4xl">
                  {p.image && p.image.startsWith("http")
                    ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    : <span>{p.image || "🛍️"}</span>}
                </div>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <div className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{p.name}</div>
                  <div className="text-lg font-extrabold text-slate-900"><Money amount={p.price} /></div>
                  <div className={`text-xs font-semibold w-fit px-2 py-0.5 rounded-full ${p.inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                    {p.inStock ? "In stock" : "Out of stock"}
                  </div>
                  <button disabled={!p.inStock} onClick={() => addToCart(p.id)}
                    className={`mt-1 w-full py-2.5 rounded-xl text-sm font-bold ${p.inStock ? "bg-amber-500 text-slate-900 active:bg-amber-600" : "bg-slate-100 text-slate-400"}`}>
                    {cart[p.id] ? `In cart · ${cart[p.id]}` : "Add to Cart"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === "cart" && (
          <CartScreen
            checkoutStep={checkoutStep} setCheckoutStep={setCheckoutStep}
            cartItems={cartItems} cartTotal={cartTotal} changeQty={changeQty}
            name={name} setName={setName} phone={phone} setPhone={setPhone}
            placeOrder={placeOrder}
            goHome={() => { setCheckoutStep("cart"); setScreen("home"); }}
            goOrders={() => { setCheckoutStep("cart"); setScreen("orders"); }}
          />
        )}

        {screen === "orders" && (
          <OrdersScreen phone={phone} setPhone={setPhone} myOrders={myOrders} />
        )}
      </main>

      {/* Floating cart pill */}
      {screen === "home" && cartCount > 0 && (
        <button onClick={() => setScreen("cart")}
          className="fixed left-4 right-4 bottom-20 z-30 bg-amber-500 text-slate-900 rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg max-w-lg mx-auto">
          <span className="font-semibold text-sm">{cartCount} item{cartCount > 1 ? "s" : ""} · <Money amount={cartTotal} /></span>
          <span className="font-bold text-sm flex items-center gap-1">View Cart <ShoppingCart size={16} /></span>
        </button>
      )}

      {/* Bottom nav */}
      <nav className="shrink-0 bg-white border-t border-slate-200 flex z-30">
        {[
          { id: "home", label: "Home", icon: Home },
          { id: "orders", label: "My Orders", icon: ListOrdered },
          { id: "cart", label: "Cart", icon: ShoppingCart, badge: cartCount },
        ].map(t => {
          const Icon = t.icon;
          const active = screen === t.id;
          return (
            <button key={t.id} onClick={() => setScreen(t.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative">
              <div className="relative">
                <Icon size={22} className={active ? "text-amber-600" : "text-slate-400"} />
                {t.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{t.badge}</span>
                )}
              </div>
              <span className={`text-[11px] font-semibold ${active ? "text-amber-600" : "text-slate-400"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin */}
      {adminOpen && (
        <AdminModal
          authed={adminAuthed} adminPass={adminPass} setAdminPass={setAdminPass}
          onLogin={() => { if (adminPass === ADMIN_PASSCODE) setAdminAuthed(true); else showToast("Wrong passcode"); }}
          onClose={() => setAdminOpen(false)}
          products={products} setProducts={setProducts}
          orders={orders} setOrders={setOrders}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function CartScreen({ checkoutStep, setCheckoutStep, cartItems, cartTotal, changeQty, name, setName, phone, setPhone, placeOrder, goHome, goOrders }) {
  if (checkoutStep === "done") {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-3 mt-10">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Check size={32} className="text-amber-600" />
        </div>
        <div className="text-lg font-extrabold text-slate-800">Order placed!</div>
        <div className="text-sm text-slate-500">We'll update you as your order moves to Ready and Completed.</div>
        <button onClick={goOrders} className="mt-3 bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-xl w-full max-w-xs">View My Orders</button>
      </div>
    );
  }
  if (checkoutStep === "paying") {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-3 mt-16">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-semibold text-slate-600">Processing…</div>
      </div>
    );
  }
  if (cartItems.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-3 mt-10">
        <ShoppingCart size={40} className="text-slate-300" />
        <div className="text-sm text-slate-400">Your cart is empty.</div>
        <button onClick={goHome} className="mt-2 bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-xl">Browse Products</button>
      </div>
    );
  }
  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="font-extrabold text-slate-800 text-base">Your Cart</div>
      {cartItems.map(item => (
        <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-slate-50 flex items-center justify-center text-xl">{item.image}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{item.name}</div>
            <div className="text-sm font-bold text-slate-900"><Money amount={item.price} /></div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-full px-1.5 py-1">
            <button onClick={() => changeQty(item.id, -1)} className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center"><Minus size={14} /></button>
            <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
            <button onClick={() => changeQty(item.id, 1)} className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center"><Plus size={14} /></button>
          </div>
        </div>
      ))}
      <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">Total</span>
        <span className="text-lg font-extrabold text-slate-900"><Money amount={cartTotal} /></span>
      </div>
      {checkoutStep === "cart" && (
        <button onClick={() => setCheckoutStep("details")} className="bg-amber-500 text-slate-900 font-bold py-3.5 rounded-xl text-base mt-1">Proceed to Order</button>
      )}
      {checkoutStep === "details" && (
        <div className="flex flex-col gap-2 mt-1">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-500" />
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="Phone number" inputMode="numeric" maxLength={10}
            className="border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-500" />
          <div className="text-xs text-slate-400 mt-1 mb-1">Choose how you'd like to pay</div>
          <button disabled={!name.trim() || phone.trim().length < 10} onClick={() => placeOrder("cod")}
            className="border-2 border-amber-500 text-amber-700 font-bold py-3.5 rounded-xl text-base disabled:opacity-40">
            Cash on Delivery / Pay at Pickup
          </button>
          <button disabled={!name.trim() || phone.trim().length < 10} onClick={() => placeOrder("online")}
            className="bg-amber-500 text-slate-900 font-bold py-3.5 rounded-xl text-base disabled:opacity-40">
            Pay Online (UPI / Card)
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersScreen({ phone, setPhone, myOrders }) {
  const [input, setInput] = useState(phone);
  if (!phone) {
    return (
      <div className="p-6 flex flex-col gap-3 mt-6">
        <div className="text-sm font-semibold text-slate-600">Enter your phone number to see your orders</div>
        <input value={input} onChange={e => setInput(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={10}
          placeholder="Phone number" className="border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-500" />
        <button disabled={input.length < 10} onClick={() => setPhone(input)}
          className="bg-amber-500 text-slate-900 font-bold py-3 rounded-xl disabled:opacity-40">View Orders</button>
      </div>
    );
  }
  if (myOrders.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center text-center gap-2 mt-10">
        <Package size={40} className="text-slate-300" />
        <div className="text-sm text-slate-400">No orders yet.</div>
      </div>
    );
  }
  return (
    <div className="p-4 flex flex-col gap-3">
      {myOrders.map(o => (
        <div key={o.id} className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
          </div>
          <div className="text-sm text-slate-600 mb-2">{o.items.map(i => `${i.name} x${i.qty}`).join(", ")}</div>
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-900"><Money amount={o.total} /></span>
            <span className="text-xs text-slate-400">{o.paymentMethod === "cod" ? "Cash on Delivery" : "Paid Online"}</span>
          </div>
          <StatusStepper status={o.status} />
        </div>
      ))}
    </div>
  );
}

function StatusStepper({ status }) {
  const idx = STATUS_STEPS.indexOf(status);
  const icons = [Clock, Truck, CircleCheck];
  return (
    <div className="flex items-center mt-3">
      {STATUS_STEPS.map((s, i) => {
        const Icon = icons[i];
        const done = i <= idx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-300"}`}>
              <Icon size={13} />
            </div>
            {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < idx ? "bg-amber-500" : "bg-slate-100"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function AdminModal({ authed, adminPass, setAdminPass, onLogin, onClose, products, setProducts, orders, setOrders, showToast }) {
  const [tab, setTab] = useState("orders");
  const [editing, setEditing] = useState(null);

  if (!authed) {
    return (
      <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-extrabold text-slate-800">Shop Owner Login</div>
            <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
          </div>
          <input value={adminPass} onChange={e => setAdminPass(e.target.value)} type="password" placeholder="Passcode"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-500" />
          <button onClick={onLogin} className="w-full mt-3 bg-amber-500 text-slate-900 font-bold py-3 rounded-xl">Login</button>
          <div className="text-xs text-slate-400 mt-2 text-center">Default passcode: srpd2026</div>
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      <header className="shrink-0 bg-amber-400 text-slate-900 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 font-extrabold"><Settings size={18} /> Admin Panel</div>
        <button onClick={onClose}><X size={20} /></button>
      </header>
      <div className="shrink-0 flex border-b border-slate-100">
        <button onClick={() => setTab("orders")} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${tab === "orders" ? "text-amber-700 border-b-2 border-amber-500" : "text-slate-400"}`}>
          <Bell size={15} /> Orders
          {pendingCount > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>}
        </button>
        <button onClick={() => setTab("products")} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 ${tab === "products" ? "text-amber-700 border-b-2 border-amber-500" : "text-slate-400"}`}>
          <Package size={15} /> Products
        </button>
      </div>
      <main className="flex-1 overflow-y-auto p-4">
        {tab === "orders" && (
          <div className="flex flex-col gap-3">
            {orders.length === 0 && <div className="text-sm text-slate-400 text-center mt-10">No orders yet.</div>}
            {orders.map(o => (
              <div key={o.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold text-slate-800">{o.customerName} · {o.customerPhone}</div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                </div>
                <div className="text-xs text-slate-500 mb-2">{new Date(o.createdAt).toLocaleString("en-IN")}</div>
                <div className="text-sm text-slate-600 mb-2">{o.items.map(i => `${i.name} x${i.qty}`).join(", ")}</div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold"><Money amount={o.total} /></span>
                  <span className="text-xs text-slate-400">{o.paymentMethod === "cod" ? "COD / Pay at pickup" : "Paid online"}</span>
                </div>
                <div className="flex gap-2">
                  {o.status === "pending" && (
                    <button onClick={() => { const next = orders.map(x => x.id === o.id ? { ...x, status: "ready" } : x); setOrders(next); showToast("Marked Ready"); }}
                      className="flex-1 bg-amber-500 text-slate-900 text-sm font-bold py-2.5 rounded-lg">Mark Ready / Out for Delivery</button>
                  )}
                  {o.status === "ready" && (
                    <button onClick={() => { const next = orders.map(x => x.id === o.id ? { ...x, status: "completed" } : x); setOrders(next); showToast("Marked Completed"); }}
                      className="flex-1 bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-lg">Mark Completed</button>
                  )}
                  {o.status === "completed" && (
                    <div className="flex-1 text-center text-sm text-emerald-600 font-semibold py-2.5">Order complete ✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "products" && (
          <div className="flex flex-col gap-3">
            <button onClick={() => setEditing({ id: null, name: "", price: "", category: "notebooks", inStock: true, image: "" })}
              className="bg-amber-500 text-slate-900 font-bold py-3 rounded-xl">+ Add Product</button>
            {products.map(p => (
              <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-slate-50 flex items-center justify-center text-xl overflow-hidden">
                  {p.image && p.image.startsWith("http") ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : (p.image || "🛍️")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                  <div className="text-xs text-slate-400">{CAT_LABEL[p.category]} · <Money amount={p.price} /></div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                  {p.inStock ? "In stock" : "Out"}
                </span>
                <button onClick={() => setEditing(p)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"><Pencil size={14} className="text-slate-500" /></button>
                <button onClick={() => { setProducts(products.filter(x => x.id !== p.id)); showToast("Removed"); }}
                  className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center"><Trash2 size={14} className="text-rose-500" /></button>
              </div>
            ))}
          </div>
        )}
      </main>
      {editing && (
        <ProductForm product={editing} onCancel={() => setEditing(null)}
          onSave={(p) => {
            const next = p.id ? products.map(x => x.id === p.id ? p : x) : [{ ...p, id: uid("p_") }, ...products];
            setProducts(next);
            setEditing(null);
            showToast("Saved");
          }}
        />
      )}
    </div>
  );
}

function ProductForm({ product, onCancel, onSave }) {
  const [form, setForm] = useState(product);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const valid = form.name.trim() && Number(form.price) > 0;

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, image: ev.target.result }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  const previewIsUrl = form.image && (form.image.startsWith("http") || form.image.startsWith("data:"));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onCancel}><ChevronLeft size={20} className="text-slate-400" /></button>
          <div className="font-extrabold text-slate-800">{form.id ? "Edit Product" : "Add Product"}</div>
          <div className="w-5" />
        </div>
        <div className="flex flex-col gap-3">

          {/* Photo uploader */}
          <label className="text-xs font-semibold text-slate-500">Product Photo</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-full h-36 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
          >
            {uploading ? (
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : previewIsUrl ? (
              <img src={form.image} alt="preview" className="w-full h-full object-cover" />
            ) : form.image ? (
              <span className="text-5xl">{form.image}</span>
            ) : (
              <div className="flex flex-col items-center gap-1 text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm font-semibold">Tap to upload photo</span>
                <span className="text-xs text-amber-500">from your phone or camera</span>
              </div>
            )}
            {previewIsUrl && (
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
                Tap to change
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          {/* Remove photo */}
          {form.image && (
            <button
              onClick={() => setForm(f => ({ ...f, image: "" }))}
              className="text-xs text-rose-500 font-semibold text-center -mt-1"
            >Remove photo</button>
          )}

          <label className="text-xs font-semibold text-slate-500">Product Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            className="border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-500" placeholder="e.g. 200 Page Notebook" />

          <label className="text-xs font-semibold text-slate-500">Price (₹)</label>
          <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })}
            inputMode="decimal" className="border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:border-amber-500" placeholder="0" />

          <label className="text-xs font-semibold text-slate-500">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => c.id !== "all").map(c => (
              <button key={c.id} onClick={() => setForm({ ...form, category: c.id })}
                className={`px-3 py-2 rounded-full text-sm font-semibold border ${form.category === c.id ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-white text-slate-600 border-slate-200"}`}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3 mt-1">
            <span className="text-sm font-semibold text-slate-700">In Stock</span>
            <button onClick={() => setForm({ ...form, inStock: !form.inStock })}
              className={`w-12 h-7 rounded-full relative transition ${form.inStock ? "bg-amber-500" : "bg-slate-200"}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${form.inStock ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          <button disabled={!valid} onClick={() => onSave({ ...form, price: Number(form.price) })}
            className="bg-amber-500 text-slate-900 font-bold py-3.5 rounded-xl mt-2 disabled:opacity-40">Save Product</button>
        </div>
      </div>
    </div>
  );
}
