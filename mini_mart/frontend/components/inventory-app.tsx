'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import FinanceView from './finance-view';
import OrdersView from './orders-view';
import {
  Category,
  Dashboard,
  dateKey,
  FinanceRow,
  money,
  Order,
  OrderClear,
  Product,
  Transaction,
  User,
} from '@/lib/inventory';

type Section = 'dashboard' | 'products' | 'finance' | 'orders' | 'tracker';
type ProductForm = {
  name: string;
  category: string;
  purchasedPrice: string;
  sellingPrice: string;
  stockQuantity: string;
  minStockLevel: string;
};
const blank = (category = ''): ProductForm => ({
  name: '',
  category,
  purchasedPrice: '',
  sellingPrice: '',
  stockQuantity: '0',
  minStockLevel: '5',
});
const today = () => dateKey(new Date());
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
function exportCsv(filename: string, rows: unknown[][]) {
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function InventoryApp() {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [mode, setMode] = useState<'signin' | 'signup'>('signin'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [authError, setAuthError] = useState('');
  const [section, setSection] = useState<Section>('dashboard'),
    [products, setProducts] = useState<Product[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [transactions, setTransactions] = useState<Transaction[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [orderHistory, setOrderHistory] = useState<OrderClear[]>([]),
    [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [finance, setFinance] = useState<FinanceRow[]>([]),
    [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState<'az' | 'za'>('az');
  const [modal, setModal] = useState<
      | 'product'
      | 'adjust'
      | 'detail'
      | 'order'
      | 'lowOrder'
      | 'productsOrder'
      | 'history'
      | 'day'
      | null
    >(null),
    [detail, setDetail] = useState(''),
    [selected, setSelected] = useState<Product | null>(null),
    [quantity, setQuantity] = useState('1'),
    [form, setForm] = useState<ProductForm>(blank()),
    [formError, setFormError] = useState(''),
    [editing, setEditing] = useState<Product | null>(null);
  const [orderItems, setOrderItems] = useState<{ productName: string; quantity: number }[]>([]),
    [orderDate, setOrderDate] = useState(today()),
    [orderName, setOrderName] = useState(''),
    [orderQuantity, setOrderQuantity] = useState('1'),
    [selectedQuantities, setSelectedQuantities] = useState<Record<string, string>>({}),
    [lowOrderProducts, setLowOrderProducts] = useState<Product[]>([]),
    [lowOrderQuantities, setLowOrderQuantities] = useState<Record<string, string>>({}),
    [clearingOrders, setClearingOrders] = useState(false),
    [historyLoading, setHistoryLoading] = useState(false),
    [openHistoryBatch, setOpenHistoryBatch] = useState<string | null>(null);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('month'),
    [cursor, setCursor] = useState(new Date()),
    [selectedDate, setSelectedDate] = useState(today());
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api<User>('/auth/me')
      .then((u) => {
        setUser(u);
        setSection(u.role === 'admin' ? 'dashboard' : 'products');
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSection('products');
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') setModal(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3800);
    return () => clearTimeout(id);
  }, [toast]);
  async function refresh(u = user) {
    if (!u) return;
    setLoading(true);
    setError('');
    try {
      const [p, c, t, o, d, f] = await Promise.all([
        api<Product[]>('/products'),
        api<Category[]>('/categories'),
        api<Transaction[]>('/transactions'),
        api<Order[]>('/orders'),
        u.role === 'admin' ? api<Dashboard>('/dashboard') : Promise.resolve(null),
        api<FinanceRow[]>(`/finance?period=${period}`),
      ]);
      setProducts(p);
      setCategories(c);
      setTransactions(t);
      setOrders(o);
      setDashboard(d);
      setFinance(f);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, [user, period]);
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    try {
      const u = await api<User>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(u);
      setSection(u.role === 'admin' ? 'dashboard' : 'products');
      setPassword('');
    } catch (e) {
      setAuthError((e as Error).message);
    }
  }
  async function signout() {
    await api('/auth/signout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setProducts([]);
    setDashboard(null);
  }
  const low = products.filter((p) => p.stockQuantity <= p.minStockLevel);
  const filtered = products
    .filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  const sales = transactions.filter((t) => t.type === 'SALE');
  const top = (dashboard?.topSold || []).map(({ name, quantity }) => [name, quantity] as const);
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await api(editing ? `/products/${editing.id}` : '/products', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      });
      setModal(null);
      setToast(editing ? 'Product updated' : 'Product added');
      setEditing(null);
      await refresh();
    } catch (e) {
      setFormError((e as Error).message);
    }
  }
  async function deleteProduct(p: Product) {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try {
      await api(`/products/${p.id}`, { method: 'DELETE' });
      setToast('Product deleted');
      await refresh();
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      const result = await api<{ lowStock: boolean }>(`/products/${selected.id}/movement`, {
        method: 'POST',
        body: JSON.stringify({ quantity: Number(quantity), type: detail }),
      });
      setModal(null);
      setToast(
        result.lowStock
          ? `${selected.name} is at or below its low stock level`
          : detail === 'SALE'
            ? 'Sale recorded'
            : 'Stock added',
      );
      await refresh();
    } catch (e) {
      setFormError((e as Error).message);
    }
  }
  function addOrderItem() {
    const name = orderName.trim(),
      q = Number(orderQuantity);
    if (!name || !Number.isInteger(q) || q < 1) {
      setFormError('Enter a product and positive quantity.');
      return;
    }
    setOrderItems((items) => {
      const existing = items.find((i) => i.productName.toLowerCase() === name.toLowerCase());
      return existing
        ? items.map((i) => (i === existing ? { ...i, quantity: i.quantity + q } : i))
        : [...items, { productName: name, quantity: q }];
    });
    setOrderName('');
    setOrderQuantity('1');
    setFormError('');
  }
  function openLowOrder(items: Product[]) {
    setLowOrderProducts(items);
    setLowOrderQuantities(
      Object.fromEntries(
        items.map((p) => [p.id, String(Math.max(1, p.minStockLevel * 2 - p.stockQuantity))]),
      ),
    );
    setFormError('');
    setModal('lowOrder');
  }
  function openProductSelection() {
    setSelectedQuantities({});
    setFormError('');
    setModal('productsOrder');
  }
  async function createOrder(items: { productName: string; quantity: number }[], date = today()) {
    try {
      await api('/orders', { method: 'POST', body: JSON.stringify({ date, items }) });
      setModal(null);
      setToast('Order saved');
      await refresh();
      return true;
    } catch (e) {
      setFormError((e as Error).message);
      return false;
    }
  }
  async function saveOrder(e: React.FormEvent) {
    e.preventDefault();
    if (await createOrder(orderItems, orderDate)) setOrderItems([]);
  }
  async function orderLowStock() {
    const items = lowOrderProducts.map((p) => ({
      productName: p.name,
      quantity: Number(lowOrderQuantities[p.id]),
    }));
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      setFormError('Enter a positive whole quantity for each item.');
      return;
    }
    await createOrder(items);
  }
  async function orderSelected() {
    const items = Object.entries(selectedQuantities).map(([id, value]) => ({
      productName: products.find((p) => p.id === id)?.name || '',
      quantity: Number(value),
    }));
    if (
      !items.length ||
      items.some(
        (item) => !item.productName || !Number.isInteger(item.quantity) || item.quantity < 1,
      )
    ) {
      setFormError('Select products and enter a positive whole quantity for each.');
      return;
    }
    await createOrder(items);
  }
  async function clearOrders() {
    if (!orders.length || clearingOrders) return;
    setClearingOrders(true);
    try {
      await api('/orders/clear', { method: 'POST' });
      setToast('Orders cleared and saved in history');
      await refresh();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setClearingOrders(false);
    }
  }
  async function openOrderHistory() {
    setModal('history');
    setHistoryLoading(true);
    setOpenHistoryBatch(null);
    setFormError('');
    try {
      setOrderHistory(await api<OrderClear[]>('/orders/history'));
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }
  function openAdjust(p: Product, type: 'SALE' | 'ADD_STOCK') {
    setSelected(p);
    setDetail(type);
    setQuantity('1');
    setFormError('');
    setModal('adjust');
  }
  function openDetail(name: string) {
    setDetail(name);
    setModal('detail');
  }
  if (checking) return <div className="loading">Opening Queen Mart…</div>;
  if (!user)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark">Q</span>
            <div>
              <strong>Queen Mart</strong>
              <small>Sales & inventory</small>
            </div>
          </div>
          <h1>{mode === 'signin' ? 'Welcome back' : 'Create sales account'}</h1>
          <p className="muted">Sign in with your email and password.</p>
          <form onSubmit={authenticate}>
            <label>
              Email address
              <input
                autoFocus
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={mode === 'signup' ? 10 : undefined}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 10 characters' : 'Your password'}
              />
            </label>
            {authError && <p className="error">{authError}</p>}
            <button className="primary-button full">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            className="text-button auth-switch"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setPassword('');
              setAuthError('');
            }}
          >
            {mode === 'signin'
              ? 'New to Queen Mart? Create an account'
              : 'Already have an account? Sign in'}
          </button>
        </section>
      </main>
    );
  const nav: { id: Section; label: string; icon: typeof Package }[] = [
    ...(user.role === 'admin'
      ? [{ id: 'dashboard' as Section, label: 'Dashboard', icon: LayoutDashboard }]
      : []),
    { id: 'products', label: 'Products', icon: Package },
    { id: 'finance', label: user.role === 'admin' ? 'Finance' : 'Daily cash', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    ...(user.role === 'admin'
      ? [{ id: 'tracker' as Section, label: 'Date tracker', icon: CalendarDays }]
      : []),
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <span>
            Queen Mart<small>STORE OPERATIONS</small>
          </span>
        </div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-link ${section === n.id ? 'active' : ''}`}
              onClick={() => setSection(n.id)}
            >
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip">
            <span className="avatar">{user.email[0].toUpperCase()}</span>
            <span>
              <strong>{user.role === 'admin' ? 'Administrator' : 'Sales team'}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <button className="logout" onClick={signout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="mobile-brand">Queen Mart</div>
        {error && (
          <div className="load-error">
            {error} <button onClick={() => refresh()}>Retry</button>
          </div>
        )}
        {loading && !products.length ? (
          <div className="loading">Loading store data…</div>
        ) : (
          <>
            {section === 'dashboard' && user.role === 'admin' && (
              <>
                <Header
                  eyebrow="Store overview"
                  title="Dashboard"
                  action={
                    <span className="date-pill">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  }
                />
                <div className="metrics">
                  {[
                    {
                      key: 'sold',
                      label: 'Total sold items',
                      value: dashboard?.soldItems || 0,
                      icon: ShoppingCart,
                      tone: 'red',
                    },
                    {
                      key: 'profit',
                      label: 'Net profit',
                      value: money(dashboard?.netProfit || 0),
                      icon: TrendingUp,
                      tone: 'green',
                    },
                    {
                      key: 'inventory',
                      label: 'Inventory count',
                      value: dashboard?.inventoryCount || 0,
                      icon: Boxes,
                      tone: 'blue',
                    },
                    {
                      key: 'categories',
                      label: 'Active categories',
                      value: dashboard?.categoryCount || 0,
                      icon: Package,
                      tone: 'purple',
                    },
                    {
                      key: 'low',
                      label: 'Low stock alerts',
                      value: dashboard?.lowStockCount || 0,
                      icon: AlertTriangle,
                      tone: 'amber',
                    },
                  ].map((m) => (
                    <button className="metric card" key={m.key} onClick={() => openDetail(m.key)}>
                      <span className={`metric-icon ${m.tone}`}>
                        <m.icon size={20} />
                      </span>
                      <span className="metric-label">{m.label}</span>
                      <strong>{m.value}</strong>
                      <small>
                        View details <ChevronRight size={14} />
                      </small>
                    </button>
                  ))}
                </div>
                <div className="dashboard-grid">
                  <section className="card">
                    <div className="card-heading">
                      <h2>Top selling items</h2>
                      <span className="muted">All time</span>
                    </div>
                    {top.length ? (
                      <ol className="rank-list">
                        {top.map(([name, count], i) => (
                          <li key={name}>
                            <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                            <strong>{name}</strong>
                            <span>{count} sold</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <Empty text="Sales will appear here once recorded." />
                    )}
                  </section>
                  <section className="card">
                    <div className="card-heading">
                      <h2>Needs attention</h2>
                      <button className="text-button" onClick={() => setSection('products')}>
                        View inventory
                      </button>
                    </div>
                    {low.length ? (
                      <ul className="attention-list">
                        {low.slice(0, 5).map((p) => (
                          <li key={p.id}>
                            <span className="attention-dot" />
                            <strong>{p.name}</strong>
                            <span>{p.stockQuantity} left</span>
                            <button className="small-button" onClick={() => openLowOrder([p])}>
                              Reorder
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Empty text="All products are above their stock threshold." />
                    )}
                  </section>
                </div>
                <div className="utility-bar card">
                  <span>
                    <strong>Quick actions</strong>
                    <small>Keep your day moving</small>
                  </span>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSection('products');
                      setToast('Choose a product to add stock.');
                    }}
                  >
                    <Plus size={16} /> Add stock
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSection('finance');
                      setPeriod('day');
                    }}
                  >
                    Daily closing <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
            {section === 'products' && (
              <>
                <Header
                  eyebrow="Inventory control"
                  title="Products"
                  action={
                    user.role === 'admin' ? (
                      <button
                        className="primary-button"
                        onClick={() => {
                          setEditing(null);
                          setForm(blank(categories[0]?.name));
                          setFormError('');
                          setModal('product');
                        }}
                      >
                        <Plus size={17} /> Add product
                      </button>
                    ) : undefined
                  }
                />
                <div className="filter-card card">
                  <label className="search-field">
                    <Search size={18} />
                    <input
                      ref={searchRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products or categories"
                      aria-label="Search products"
                    />
                    <kbd>⌘ K</kbd>
                  </label>
                  <select
                    aria-label="Sort products"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as 'az' | 'za')}
                  >
                    <option value="az">Name: A–Z</option>
                    <option value="za">Name: Z–A</option>
                  </select>
                </div>
                <section className="card table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Selling price</th>
                        {user.role === 'admin' && <th>Purchase price</th>}
                        <th>Stock actions</th>
                        {user.role === 'admin' && <th>Manage</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                          </td>
                          <td>{p.category}</td>
                          <td>
                            <span
                              className={`badge ${p.stockQuantity <= p.minStockLevel ? 'danger' : 'success'}`}
                            >
                              {p.stockQuantity} in stock
                            </span>
                          </td>
                          <td>{money(p.sellingPrice)}</td>
                          {user.role === 'admin' && <td>{money(p.purchasedPrice || 0)}</td>}
                          <td>
                            <div className="stock-actions">
                              <button
                                className="add-button"
                                onClick={() => openAdjust(p, 'ADD_STOCK')}
                                aria-label={`Add stock for ${p.name}`}
                              >
                                <Plus size={20} />
                              </button>
                              <button
                                className="minus-button"
                                disabled={!p.stockQuantity}
                                onClick={() => openAdjust(p, 'SALE')}
                                aria-label={`Record sale of ${p.name}`}
                              >
                                <span>−</span>
                              </button>
                            </div>
                          </td>
                          {user.role === 'admin' && (
                            <td>
                              <div className="manage-actions">
                                <button
                                  aria-label={`Edit ${p.name}`}
                                  onClick={() => {
                                    setEditing(p);
                                    setForm({
                                      name: p.name,
                                      category: p.category,
                                      purchasedPrice: String(p.purchasedPrice || 0),
                                      sellingPrice: String(p.sellingPrice),
                                      stockQuantity: String(p.stockQuantity),
                                      minStockLevel: String(p.minStockLevel),
                                    });
                                    setFormError('');
                                    setModal('product');
                                  }}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  aria-label={`Delete ${p.name}`}
                                  onClick={() => deleteProduct(p)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <Empty
                      text={
                        products.length
                          ? 'No products match your search.'
                          : 'No products yet. Add your first product.'
                      }
                    />
                  )}
                </section>
              </>
            )}
            {section === 'finance' && (
              <>
                <Header
                  eyebrow={
                    user.role === 'admin' ? 'Financial reporting' : 'Register reconciliation'
                  }
                  title={user.role === 'admin' ? 'Finance' : 'Today’s cash summary'}
                />
                <FinanceView
                  role={user.role}
                  period={period}
                  setPeriod={setPeriod}
                  rows={finance}
                  sales={sales}
                />
              </>
            )}
            {section === 'orders' && (
              <OrdersView
                orders={orders}
                low={low}
                clearing={clearingOrders}
                onNew={() => {
                  setFormError('');
                  setModal('order');
                }}
                onLow={() => openLowOrder(low)}
                onChoose={openProductSelection}
                onExport={() =>
                  exportCsv('queen-mart-orders.csv', [
                    ['Order ID', 'Date', 'Product', 'Quantity'],
                    ...orders.flatMap((o) =>
                      o.items.map((i) => [o.id, o.date.slice(0, 10), i.productName, i.quantity]),
                    ),
                  ])
                }
                onClear={clearOrders}
                onHistory={openOrderHistory}
              />
            )}
            {section === 'tracker' && user.role === 'admin' && (
              <>
                <Header eyebrow="Store activity" title="Date tracker" />
                <div className="calendar-toolbar card">
                  <div>
                    <button
                      aria-label="Previous period"
                      onClick={() => setCursor(shift(cursor, view, -1))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <strong>
                      {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </strong>
                    <button
                      aria-label="Next period"
                      onClick={() => setCursor(shift(cursor, view, 1))}
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button className="today-button" onClick={() => setCursor(new Date())}>
                      Today
                    </button>
                  </div>
                  <div className="view-tabs">
                    {(['day', 'week', 'month', 'year'] as const).map((v) => (
                      <button
                        className={view === v ? 'active' : ''}
                        key={v}
                        onClick={() => setView(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <Calendar
                  view={view}
                  cursor={cursor}
                  transactions={transactions}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setModal('day');
                  }}
                  onMonth={(d) => {
                    setCursor(d);
                    setView('month');
                  }}
                />
              </>
            )}
          </>
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal === 'product' && (
        <Modal title={editing ? 'Edit product' : 'Add product'} close={() => setModal(null)}>
          <form onSubmit={saveProduct} className="form-grid">
            <label className="wide">
              Product name
              <input
                autoFocus
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Category
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              Selling price
              <input
                type="number"
                min="0"
                step=".01"
                required
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              />
            </label>
            {user.role === 'admin' && (
              <label>
                Purchase price
                <input
                  type="number"
                  min="0"
                  step=".01"
                  required
                  value={form.purchasedPrice}
                  onChange={(e) => setForm({ ...form, purchasedPrice: e.target.value })}
                />
              </label>
            )}
            {!editing && (
              <label>
                Initial stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                />
              </label>
            )}
            <label>
              Low stock threshold
              <input
                type="number"
                min="0"
                step="1"
                required
                value={form.minStockLevel}
                onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
              />
            </label>
            {formError && <p className="error wide">{formError}</p>}
            <button className="primary-button wide">
              {editing ? 'Save changes' : 'Save product'}
            </button>
          </form>
        </Modal>
      )}
      {modal === 'adjust' && selected && (
        <Modal title={detail === 'SALE' ? 'Record sale' : 'Add stock'} close={() => setModal(null)}>
          <form onSubmit={adjust}>
            <p className="modal-subtitle">
              {selected.name} · {selected.stockQuantity} currently in stock
            </p>
            <label>
              Quantity
              <input
                autoFocus
                type="number"
                min="1"
                max={detail === 'SALE' ? selected.stockQuantity : undefined}
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            {formError && <p className="error">{formError}</p>}
            <button className={`primary-button full ${detail === 'SALE' ? 'sale-submit' : ''}`}>
              {detail === 'SALE' ? 'Record sale' : 'Add stock'}
            </button>
          </form>
        </Modal>
      )}
      {modal === 'detail' && (
        <Modal title={detailTitle(detail)} close={() => setModal(null)} wide>
          <DetailContent
            detail={detail}
            products={products}
            categories={categories}
            sales={sales}
            onReorder={(p) => openLowOrder([p])}
          />
        </Modal>
      )}
      {modal === 'order' && (
        <Modal title="New supplier order" close={() => setModal(null)}>
          <form onSubmit={saveOrder}>
            <label>
              Order date
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Product name
                <input
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  list="product-names"
                  placeholder="Type a product"
                />
                <datalist id="product-names">
                  {products.map((p) => (
                    <option value={p.name} key={p.id} />
                  ))}
                </datalist>
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                />
              </label>
            </div>
            <button type="button" className="secondary-button full" onClick={addOrderItem}>
              Add item
            </button>
            <ul className="draft-list">
              {orderItems.map((i) => (
                <li key={i.productName}>
                  {i.productName}
                  <span>
                    {i.quantity}{' '}
                    <button
                      type="button"
                      aria-label={`Remove ${i.productName}`}
                      onClick={() => setOrderItems(orderItems.filter((x) => x !== i))}
                    >
                      <X size={15} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {formError && <p className="error">{formError}</p>}
            <button className="primary-button full" disabled={!orderItems.length}>
              Save order
            </button>
          </form>
        </Modal>
      )}
      {modal === 'lowOrder' && (
        <Modal title="Order low stock" close={() => setModal(null)}>
          <p className="modal-subtitle">Items at or below their stock threshold</p>
          <ul className="brief-order-list">
            {lowOrderProducts.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                <label>
                  Order quantity
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={lowOrderQuantities[p.id] || ''}
                    onChange={(e) =>
                      setLowOrderQuantities({ ...lowOrderQuantities, [p.id]: e.target.value })
                    }
                  />
                </label>
              </li>
            ))}
          </ul>
          {formError && <p className="error">{formError}</p>}
          <button className="primary-button full" onClick={orderLowStock}>
            Order {lowOrderProducts.length} item{lowOrderProducts.length === 1 ? '' : 's'}
          </button>
        </Modal>
      )}
      {modal === 'productsOrder' && (
        <Modal title="Choose products to order" close={() => setModal(null)} wide>
          <p className="modal-subtitle">Select products and enter how many to order.</p>
          <div className="product-pick-list">
            {products.map((p) => (
              <div className="product-pick-row" key={p.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={p.id in selectedQuantities}
                    onChange={(e) =>
                      setSelectedQuantities((current) => {
                        const next = { ...current };
                        if (e.target.checked) next[p.id] = '1';
                        else delete next[p.id];
                        return next;
                      })
                    }
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.stockQuantity} in stock</small>
                  </span>
                </label>
                {p.id in selectedQuantities && (
                  <input
                    type="number"
                    min="1"
                    step="1"
                    aria-label={`Quantity to order for ${p.name}`}
                    value={selectedQuantities[p.id]}
                    onChange={(e) =>
                      setSelectedQuantities({ ...selectedQuantities, [p.id]: e.target.value })
                    }
                  />
                )}
              </div>
            ))}
          </div>
          {!products.length && <Empty text="Add products before creating an order." />}
          {formError && <p className="error">{formError}</p>}
          <button
            className="primary-button full"
            disabled={!Object.keys(selectedQuantities).length}
            onClick={orderSelected}
          >
            Order selected products
          </button>
        </Modal>
      )}
      {modal === 'history' && (
        <Modal title="Cleared orders" close={() => setModal(null)} wide>
          {historyLoading ? (
            <p className="modal-subtitle">Loading order history…</p>
          ) : formError ? (
            <p className="error">{formError}</p>
          ) : orderHistory.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Day #</th>
                    <th>Cleared on</th>
                    <th>Orders</th>
                    <th>Items</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.map((batch, index) => (
                    <Fragment key={batch.clearedAt}>
                      <tr>
                        <td>{orderHistory.length - index}</td>
                        <td>
                          {new Date(batch.clearedAt).toLocaleString('en-US', {
                            timeZone: 'Africa/Addis_Ababa',
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                        <td>{batch.orders.length}</td>
                        <td>{batch.orders.reduce((sum, order) => sum + order.totalItems, 0)}</td>
                        <td>
                          <button
                            className="text-button"
                            aria-expanded={openHistoryBatch === batch.clearedAt}
                            onClick={() =>
                              setOpenHistoryBatch(
                                openHistoryBatch === batch.clearedAt ? null : batch.clearedAt,
                              )
                            }
                          >
                            {openHistoryBatch === batch.clearedAt ? 'Hide details' : 'Show details'}
                          </button>
                        </td>
                      </tr>
                      {openHistoryBatch === batch.clearedAt && (
                        <tr>
                          <td colSpan={5} className="history-detail-cell">
                            <table>
                              <thead>
                                <tr>
                                  <th>Order</th>
                                  <th>Order date</th>
                                  <th>Product</th>
                                  <th>Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.orders.flatMap((order) =>
                                  order.items.map((item, itemIndex) => (
                                    <tr key={`${order.id}-${itemIndex}`}>
                                      <td>#{order.id.slice(0, 8)}</td>
                                      <td>{order.date.slice(0, 10)}</td>
                                      <td>{item.productName}</td>
                                      <td>{item.quantity}</td>
                                    </tr>
                                  )),
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No cleared orders yet.</div>
          )}
        </Modal>
      )}
      {modal === 'day' && (
        <Modal
          title={new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          close={() => setModal(null)}
          wide
        >
          <DayDetails rows={transactions.filter((t) => dateKey(t.date) === selectedDate)} />
        </Modal>
      )}
    </div>
  );
}
function Header({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}
function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className={`modal card ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function detailTitle(key: string) {
  return (
    (
      {
        sold: 'Sold items',
        profit: 'Profit breakdown',
        inventory: 'Inventory valuation',
        categories: 'Categories',
        low: 'Low stock',
      } as Record<string, string>
    )[key] || 'Details'
  );
}
function DetailContent({
  detail,
  products,
  categories,
  sales,
  onReorder,
}: {
  detail: string;
  products: Product[];
  categories: Category[];
  sales: Transaction[];
  onReorder: (p: Product) => void;
}) {
  const [filter, setFilter] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState('');
  const rows =
    detail === 'sold'
      ? sales.map((t) => [
          dateKey(t.date),
          t.name,
          money(t.unitPrice),
          t.quantity,
          money(t.quantity * t.unitPrice),
        ])
      : detail === 'profit'
        ? Object.entries(
            sales.reduce(
              (m, t) => {
                const d = dateKey(t.date);
                m[d] = (m[d] || 0) + t.quantity * (t.unitPrice - (t.unitCost || 0));
                return m;
              },
              {} as Record<string, number>,
            ),
          ).map(([d, v]) => [d, money(v)])
        : detail === 'inventory'
          ? products.map((p) => [
              p.name,
              p.stockQuantity,
              money(p.stockQuantity * (p.purchasedPrice || 0)),
            ])
          : detail === 'categories'
            ? categories.map((c) => [c.name, c.productCount])
            : products
                .filter((p) => p.stockQuantity <= p.minStockLevel)
                .map((p) => [
                  p.name,
                  p.stockQuantity,
                  p.minStockLevel,
                  <button key={p.id} className="small-button" onClick={() => onReorder(p)}>
                    Reorder
                  </button>,
                ]);
  const headers =
    (
      {
        sold: ['Date sold', 'Item', 'Unit price', 'Quantity', 'Revenue'],
        profit: ['Date', 'Net profit'],
        inventory: ['Product', 'Stock', 'Valuation'],
        categories: ['Category', 'Products'],
        low: ['Product', 'Stock', 'Threshold', 'Action'],
      } as Record<string, string[]>
    )[detail] || [];
  return (
    <>
      <div className="detail-controls">
        <label className="search-field detail-filter">
          <Search size={17} />
          <input
            type="search"
            placeholder="Filter details"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        {['sold', 'profit'].includes(detail) && (
          <>
            <label>
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </>
        )}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter(
                (row) =>
                  row.some((c) => String(c).toLowerCase().includes(filter.toLowerCase())) &&
                  (!from || String(row[0]) >= from) &&
                  (!to || String(row[0]) <= to),
              )
              .sort((a, b) =>
                String(a[detail === 'sold' ? 1 : 0]).localeCompare(
                  String(b[detail === 'sold' ? 1 : 0]),
                ),
              )
              .map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {!rows.length && <Empty text="No activity yet." />}
      </div>
    </>
  );
}
function shift(date: Date, view: 'day' | 'week' | 'month' | 'year', amount: number) {
  const d = new Date(date);
  if (view === 'year') d.setFullYear(d.getFullYear() + amount);
  else if (view === 'month') d.setMonth(d.getMonth() + amount);
  else d.setDate(d.getDate() + amount * (view === 'week' ? 7 : 1));
  return d;
}
function Calendar({
  view,
  cursor,
  transactions,
  onSelect,
  onMonth,
}: {
  view: 'day' | 'week' | 'month' | 'year';
  cursor: Date;
  transactions: Transaction[];
  onSelect: (date: string) => void;
  onMonth: (date: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  let dates: Date[] = [];
  if (view === 'year') {
    dates = Array.from({ length: 12 }, (_, i) => new Date(cursor.getFullYear(), i, 1));
    return (
      <div className="year-grid">
        {dates.map((d) => (
          <button key={d.getMonth()} className="card year-month" onClick={() => onMonth(d)}>
            <strong>{d.toLocaleString('en-US', { month: 'long' })}</strong>
            <span>
              {
                transactions.filter(
                  (t) =>
                    new Date(t.date).getFullYear() === d.getFullYear() &&
                    new Date(t.date).getMonth() === d.getMonth(),
                ).length
              }{' '}
              activities
            </span>
          </button>
        ))}
      </div>
    );
  }
  if (view === 'day') dates = [cursor];
  else if (view === 'week') {
    const start = new Date(cursor);
    start.setDate(start.getDate() - start.getDay());
    dates = Array.from(
      { length: 7 },
      (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  } else {
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    dates = Array.from(
      { length: 42 },
      (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  }
  return (
    <div className={`calendar card calendar-${view}`}>
      {view !== 'day' &&
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div className="weekday" key={d}>
            {d}
          </div>
        ))}
      {dates.map((d) => {
        const key = dateKey(d),
          events = transactions.filter((t) => dateKey(t.date) === key);
        return (
          <button
            key={key}
            className={`calendar-day ${d.getMonth() !== cursor.getMonth() && view === 'month' ? 'outside' : ''} ${key === today() ? 'is-today' : ''}`}
            onClick={() => onSelect(key)}
          >
            <strong>{d.getDate()}</strong>
            {events.slice(0, 2).map((t) => (
              <small className={t.type === 'SALE' ? 'event-sale' : 'event-add'} key={t.id}>
                {t.type === 'SALE' ? 'Sold' : 'Added'} {t.name}
              </small>
            ))}
            {events.length > 2 && <small>+{events.length - 2} more</small>}
          </button>
        );
      })}
    </div>
  );
}
function DayDetails({ rows }: { rows: Transaction[] }) {
  const added = rows.filter((t) => t.type === 'ADD_STOCK'),
    sold = rows.filter((t) => t.type === 'SALE');
  return (
    <>
      <div className="day-totals">
        <span>
          <strong>{added.reduce((a, t) => a + t.quantity, 0)}</strong> units added
        </span>
        <span>
          <strong>{sold.reduce((a, t) => a + t.quantity, 0)}</strong> units sold
        </span>
        <span>
          <strong>{money(sold.reduce((a, t) => a + t.quantity * t.unitPrice, 0))}</strong> revenue
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className={`badge ${t.type === 'SALE' ? 'danger' : 'success'}`}>
                    {t.type === 'SALE' ? 'Sold' : 'Added'}
                  </span>
                </td>
                <td>{t.name}</td>
                <td>{t.quantity}</td>
                <td>{money(t.quantity * (t.type === 'SALE' ? t.unitPrice : t.unitCost || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty text="No activity on this date." />}
      </div>
    </>
  );
}
