import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, PlusCircle, CheckCircle2, Trash2, TrendingUp, IndianRupee, AlertTriangle, Bike, ShieldAlert, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

let socket = null;

export default function AdminDashboard() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('adminUser')) || null);
    const [activeTab, setActiveTab] = useState(user?.is_super === 1 ? 'orders' : 'feedback');
    const [orders, setOrders] = useState([]);
    const [items, setItems] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [staff, setStaff] = useState([]);
    const [sales, setSales] = useState([]);
    const [deliveryBoys, setDeliveryBoys] = useState([]);
    const [fraudAlerts, setFraudAlerts] = useState([]);
    const [newItem, setNewItem] = useState({ name: '', price: '', image_url: '', description: '' });
    const [editItem, setEditItem] = useState(null);
    const [pinInputs, setPinInputs] = useState({});
    const [pinMessages, setPinMessages] = useState({});
    const [fraudBanner, setFraudBanner] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) { navigate('/admin'); return; }
        if (user.is_super === 1) {
            fetchOrders();
            fetchStaff();
            fetchSales();
            fetchDeliveryBoys();
            fetchFraudAlerts();
        }
        fetchItems();
        fetchFeedback();
        initSocket();
        return () => { if (socket) socket.disconnect(); };
    }, [user]);

    const initSocket = () => {
        socket = io(window.location.origin, { withCredentials: true });
        socket.on('connect', () => socket.emit('register_admin', user?.is_super));
        socket.on('new_order', () => fetchOrders());
        socket.on('order_status_update', () => fetchOrders());
        socket.on('fraud_alert', (data) => {
            setFraudBanner(data.message);
            fetchFraudAlerts();
            setTimeout(() => setFraudBanner(null), 8000);
        });
    };

    const fetchSales = () => fetch('/admin/daily-sales').then(r => r.json()).then(d => setSales(Array.isArray(d) ? d : [])).catch(() => { });
    const fetchStaff = () => fetch('/admin/staff').then(r => r.json()).then(d => setStaff(Array.isArray(d) ? d : []));
    const fetchDeliveryBoys = () => fetch('/admin/delivery-boys').then(r => r.json()).then(d => setDeliveryBoys(Array.isArray(d) ? d : [])).catch(() => { });
    const fetchFraudAlerts = () => fetch('/admin/fraud-alerts').then(r => r.json()).then(d => setFraudAlerts(Array.isArray(d) ? d : [])).catch(() => { });
    const approveStaff = (id) => fetch(`/admin/approve-staff/${id}`, { method: 'PUT' }).then(() => fetchStaff());
    const deleteStaff = (id) => { if (!confirm('Remove?')) return; fetch(`/admin/delete-staff/${id}`, { method: 'DELETE' }).then(() => fetchStaff()); };
    const approveDeliveryBoy = (id) => fetch(`/admin/delivery-boy/${id}/approve`, { method: 'PUT' }).then(() => fetchDeliveryBoys());
    const rejectDeliveryBoy = (id) => { if (!confirm('Reject this delivery boy?')) return; fetch(`/admin/delivery-boy/${id}/reject`, { method: 'PUT' }).then(() => fetchDeliveryBoys()); };
    const deleteDeliveryBoy = (id) => { if (!confirm('Delete?')) return; fetch(`/admin/delivery-boy/${id}`, { method: 'DELETE' }).then(() => fetchDeliveryBoys()); };
    const resolveAlert = (id) => fetch(`/admin/fraud-alerts/${id}/resolve`, { method: 'PUT' }).then(() => fetchFraudAlerts());

    const handleLogout = () => {
        fetch('/admin/logout', { method: 'POST' }).then(() => { localStorage.removeItem('adminUser'); navigate('/'); });
    };

    const fetchOrders = () => {
        fetch('/admin/orders').then(r => {
            if (r.status === 401 || r.status === 403) { navigate('/admin'); throw new Error('Unauthorized'); }
            return r.json();
        }).then(data => {
            const grouped = data.reduce((acc, curr) => {
                if (!acc[curr.id]) acc[curr.id] = { ...curr, items: [] };
                if (curr.item_name) acc[curr.id].items.push({ name: curr.item_name, qty: curr.qty });
                return acc;
            }, {});
            setOrders(Object.values(grouped).sort((a, b) => b.id - a.id));
        }).catch(e => console.error(e));
    };

    const fetchItems = () => fetch('/api/items').then(r => r.json()).then(d => setItems(d));
    const fetchFeedback = () => fetch('/admin/feedback').then(r => r.json()).then(d => setFeedback(d));

    const addItem = (e) => {
        e.preventDefault();
        fetch('/admin/add-item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) })
            .then(r => r.json()).then(d => { if (d.success) { setNewItem({ name: '', price: '', image_url: '', description: '' }); fetchItems(); } });
    };

    const saveEditItem = () => {
        fetch(`/admin/update-item/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editItem) })
            .then(r => r.json()).then(() => { setEditItem(null); fetchItems(); });
    };

    const deleteItem = (id) => { if (!confirm('Remove item?')) return; fetch(`/admin/delete-item/${id}`, { method: 'DELETE' }).then(() => fetchItems()); };

    const markOrderDone = (id) => fetch(`/admin/order-done/${id}`, { method: 'PUT' }).then(r => r.json()).then(() => fetchOrders());
    const markOutForDelivery = (id) => fetch(`/admin/order-out-for-delivery/${id}`, { method: 'PUT' }).then(r => r.json()).then(() => fetchOrders());

    const verifyAdminPin = async (orderId) => {
        const pin = pinInputs[orderId];
        if (!pin || String(pin).length !== 4) { setPinMessages(prev => ({ ...prev, [orderId]: { type: 'error', text: 'Enter 4-digit PIN' } })); return; }
        const res = await fetch('/admin/verify-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId, pin, delivery_boy_name: user.username }) });
        const data = await res.json();
        setPinMessages(prev => ({ ...prev, [orderId]: { type: data.success ? 'success' : (data.locked ? 'locked' : 'error'), text: data.message } }));
        if (data.success) fetchOrders();
    };

    const statusBadge = (status) => {
        const map = { 'Pending': 'bg-orange-100 text-orange-700', 'Assigned': 'bg-blue-100 text-blue-700', 'Out for Delivery': 'bg-purple-100 text-purple-700', 'Delivered': 'bg-green-100 text-green-700', 'Completed': 'bg-green-100 text-green-700' };
        return map[status] || 'bg-slate-100 text-slate-700';
    };

    const deliveryBoyStatusBadge = (status) => {
        const map = { 'pending': 'bg-yellow-100 text-yellow-700', 'approved': 'bg-green-100 text-green-700', 'rejected': 'bg-red-100 text-red-700' };
        return map[status] || 'bg-slate-100 text-slate-600';
    };

    const tabs = [
        { id: 'orders', label: 'Orders', show: user?.is_super === 1 },
        { id: 'menu', label: 'Menu', show: user?.is_super === 1 },
        { id: 'feedback', label: 'Reviews', show: true },
        { id: 'sales', label: 'Sales', show: user?.is_super === 1 },
        { id: 'delivery_boys', label: `Delivery Boys${deliveryBoys.filter(b => b.status === 'pending').length > 0 ? ` 🔴${deliveryBoys.filter(b => b.status === 'pending').length}` : ''}`, show: user?.is_super === 1 },
        { id: 'fraud', label: `Fraud ${fraudAlerts.filter(f => !f.resolved).length > 0 ? `🚨${fraudAlerts.filter(f => !f.resolved).length}` : ''}`, show: user?.is_super === 1 },
        { id: 'staff', label: 'Staff', show: user?.is_super === 1 },
    ].filter(t => t.show);

    return (
        <div className="admin-dashboard container pt-32 pb-20">
            {/* Fraud Alert Banner */}
            <AnimatePresence>
                {fraudBanner && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-20 left-0 right-0 z-50 mx-auto max-w-2xl bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <ShieldAlert size={24} /> <span className="font-bold">{fraudBanner}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-1">Backoffice</h2>
                    <p className="text-light">Welcome, <span className="font-bold">{user?.username}</span></p>
                </div>
                <div className="flex flex-wrap gap-2 bg-white p-1 rounded-full shadow-sm border border-slate-200 admin-tab-container overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-primary text-white shadow-lg' : 'text-light hover:text-primary'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <button onClick={handleLogout} className="text-light hover:text-red-500 font-bold flex items-center gap-2">Logout</button>
            </div>

            <AnimatePresence mode="wait">
                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                    <motion.div key="orders" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {orders.length === 0 && <p className="col-span-full text-center py-20 text-light italic">No orders yet.</p>}
                        {orders.map(order => (
                            <div key={order.id} className="glass-panel p-6 rounded-[24px]">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-xs font-black uppercase text-primary tracking-widest">#{order.id} {order.order_type === 'delivery' ? '🛵' : '🍽️'}</span>
                                        <h3 className="text-xl font-black">{order.customer_name}</h3>
                                        <p className="text-sm text-light">{order.phone}</p>
                                        {order.delivery_boy_name && <p className="text-xs text-blue-600 font-bold mt-1">By: {order.delivery_boy_name}</p>}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-black uppercase ${statusBadge(order.status)}`}>{order.status || 'Pending'}</div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                                    <ul className="space-y-1">
                                        {order.items.map((item, i) => (
                                            <li key={i} className="flex justify-between text-sm font-medium">
                                                <span className="text-light">{item.name}</span><span className="font-bold">x{item.qty}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {order.landmark && <p className="text-xs text-slate-500 mt-2">📍 {order.landmark}</p>}
                                </div>
                                <div className="flex flex-wrap gap-3 items-center">
                                    <p className="text-lg font-black">₹{Number(order.total).toFixed(2)}</p>
                                    <div className="flex gap-2 flex-wrap ml-auto">
                                        {order.status === 'Pending' && order.order_type === 'delivery' && (
                                            <button className="btn btn-primary px-4 py-2 text-sm" onClick={() => markOutForDelivery(order.id)}>🛵 Out for Delivery</button>
                                        )}
                                        {order.status !== 'Completed' && order.status !== 'Delivered' && order.order_type === 'dine_in' && (
                                            <button className="btn btn-primary px-4 py-2 text-sm" onClick={() => markOrderDone(order.id)}>✅ Mark Done</button>
                                        )}
                                        {order.lat && order.lng && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${order.lat},${order.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-4 py-2 text-sm">📍 Map</a>
                                        )}
                                    </div>
                                </div>

                                {/* Admin PIN Verify for Dine-in */}
                                {order.order_type === 'dine_in' && order.status !== 'Completed' && order.status !== 'Delivered' && order.verification_pin && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-light">Verify Order PIN</p>
                                        <div className="flex gap-3">
                                            <input type="text" maxLength={4} className="input text-center text-2xl font-black tracking-widest"
                                                placeholder="****"
                                                value={pinInputs[order.id] || ''}
                                                onChange={e => setPinInputs(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/, '') }))} />
                                            <button onClick={() => verifyAdminPin(order.id)} className="btn btn-primary px-5"><CheckCircle2 size={20} /></button>
                                        </div>
                                        {pinMessages[order.id] && (
                                            <p className={`text-sm font-bold ${pinMessages[order.id].type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{pinMessages[order.id].text}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* MENU TAB */}
                {activeTab === 'menu' && (
                    <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                        <form onSubmit={addItem} className="glass-panel p-8 rounded-[32px]">
                            <h3 className="text-2xl font-black mb-6">Add Item</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <input className="input" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Item Name" required />
                                <input type="number" step="0.01" className="input" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} placeholder="Price (₹)" required />
                                <input className="input" value={newItem.image_url} onChange={e => setNewItem({ ...newItem, image_url: e.target.value })} placeholder="Image URL" />
                                <input className="input" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Description" />
                            </div>
                            <button type="submit" className="btn btn-primary"><PlusCircle size={20} /> Add to Menu</button>
                        </form>

                        {editItem && (
                            <div className="glass-panel p-8 rounded-[32px] border-2 border-primary/20">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-black">Edit Item #{editItem.id}</h3>
                                    <button onClick={() => setEditItem(null)}><X size={20} /></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <input className="input" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} placeholder="Name" />
                                    <input type="number" step="0.01" className="input" value={editItem.price} onChange={e => setEditItem({ ...editItem, price: e.target.value })} placeholder="Price" />
                                    <input className="input" value={editItem.image_url || ''} onChange={e => setEditItem({ ...editItem, image_url: e.target.value })} placeholder="Image URL" />
                                    <input className="input" value={editItem.description || ''} onChange={e => setEditItem({ ...editItem, description: e.target.value })} placeholder="Description" />
                                </div>
                                <button onClick={saveEditItem} className="btn btn-primary mt-4">Save Changes</button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map(item => (
                                <div key={item.id} className="glass-panel p-4 rounded-[24px] flex items-center gap-4">
                                    <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={item.name}
                                        className="w-16 h-16 rounded-2xl object-cover shrink-0"
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'; }} />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black truncate">{item.name}</h4>
                                        <p className="text-primary font-bold text-sm">₹{item.price}</p>
                                        {item.description && <p className="text-xs text-light truncate">{item.description}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditItem({ ...item })} className="p-2 text-slate-400 hover:text-primary transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* FEEDBACK TAB */}
                {activeTab === 'feedback' && (
                    <motion.div key="feedback" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {feedback.map(f => (
                            <div key={f.id} className="glass-panel p-6 rounded-[24px]">
                                <div className="flex gap-1 mb-3">{[...Array(5)].map((_, i) => <span key={i} className={i < f.rating ? 'text-amber-400' : 'text-slate-200'}>★</span>)}</div>
                                <p className="italic text-slate-600 mb-4">"{f.comment}"</p>
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="font-bold text-sm">{f.customer_name}</h4>
                                    <p className="text-[10px] text-light uppercase">{new Date(f.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {feedback.length === 0 && <p className="col-span-full text-center py-20 text-light italic">No reviews yet.</p>}
                    </motion.div>
                )}

                {/* SALES TAB */}
                {activeTab === 'sales' && user?.is_super === 1 && (
                    <motion.div key="sales" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-panel p-6 rounded-[24px] bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
                                <p className="text-xs font-black uppercase tracking-widest text-light mb-1">Total Revenue</p>
                                <h4 className="text-3xl font-black text-primary flex items-center gap-1">
                                    <IndianRupee size={24} />
                                    {(sales || []).reduce((acc, curr) => acc + Number(curr.revenue || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </h4>
                            </div>
                            <div className="glass-panel p-6 rounded-[24px] bg-gradient-to-br from-secondary/5 to-transparent border-secondary/10">
                                <p className="text-xs font-black uppercase tracking-widest text-light mb-1">Lifetime Orders</p>
                                <h4 className="text-3xl font-black text-secondary">
                                    {(sales || []).reduce((acc, curr) => acc + Number(curr.orders || 0), 0)}
                                </h4>
                            </div>
                        </div>

                        <div className="glass-panel rounded-[32px] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr className="border-b border-slate-100">
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-light whitespace-nowrap">Date</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-light whitespace-nowrap text-center">Orders</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-light whitespace-nowrap text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(sales || []).map((d, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-8 py-5 font-bold whitespace-nowrap">
                                                    {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-5 text-center whitespace-nowrap">
                                                    <span className="px-3 py-1 bg-slate-100/50 text-slate-600 rounded-full text-xs font-black">{d.orders}</span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-primary whitespace-nowrap">
                                                    ₹{Number(d.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!sales || sales.length === 0) && (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center text-light italic">No sales data recorded yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* DELIVERY BOYS TAB */}
                {activeTab === 'delivery_boys' && user?.is_super === 1 && (
                    <motion.div key="delivery_boys" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        <h3 className="text-2xl font-black mb-6">Delivery Team Management</h3>
                        {deliveryBoys.length === 0 && <p className="text-center py-20 text-light italic glass-panel rounded-[32px]">No delivery boy registrations yet.</p>}
                        {deliveryBoys.map(b => (
                            <div key={b.id} className="glass-panel p-6 rounded-[24px] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-black text-lg">{b.full_name}</h4>
                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${deliveryBoyStatusBadge(b.status)}`}>{b.status}</span>
                                    </div>
                                    <p className="text-sm text-light">@{b.username} · {b.phone}</p>
                                    {b.aadhar && <p className="text-xs text-light">Aadhar: {b.aadhar}</p>}
                                    {b.address && <p className="text-xs text-light mt-1">📍 {b.address}</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    {b.status === 'pending' && (
                                        <>
                                            <button onClick={() => approveDeliveryBoy(b.id)} className="btn btn-primary px-5 py-2">✅ Approve</button>
                                            <button onClick={() => rejectDeliveryBoy(b.id)} className="btn btn-outline px-5 py-2 text-red-500">❌ Reject</button>
                                        </>
                                    )}
                                    {b.status === 'approved' && <span className="text-green-600 font-bold text-sm">Active ✓</span>}
                                    {b.status === 'rejected' && <span className="text-red-500 font-bold text-sm">Rejected</span>}
                                    <button onClick={() => deleteDeliveryBoy(b.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* FRAUD ALERTS TAB */}
                {activeTab === 'fraud' && user?.is_super === 1 && (
                    <motion.div key="fraud" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        <h3 className="text-2xl font-black mb-6 flex items-center gap-2"><AlertTriangle size={24} className="text-red-500" /> Fraud Alerts</h3>
                        {fraudAlerts.length === 0 && <p className="text-center py-20 text-light italic glass-panel rounded-[32px]">No fraud alerts. 🎉</p>}
                        {fraudAlerts.map(a => (
                            <div key={a.id} className={`glass-panel p-6 rounded-[24px] border-l-4 ${a.resolved ? 'border-green-400 opacity-60' : 'border-red-500'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-black text-red-600">🚨 Wrong PIN Attempts on Order #{a.order_id}</p>
                                        <p className="text-sm text-light mt-1">By: <span className="font-bold">{a.delivery_boy_name}</span> · {a.attempts} failed attempts</p>
                                        <p className="text-xs text-light mt-1">{new Date(a.created_at).toLocaleString('en-IN')}</p>
                                    </div>
                                    {!a.resolved && (
                                        <button onClick={() => resolveAlert(a.id)} className="btn btn-outline text-sm px-4">Mark Resolved</button>
                                    )}
                                    {a.resolved && <span className="text-green-600 font-bold text-sm">Resolved ✓</span>}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* STAFF TAB */}
                {activeTab === 'staff' && user?.is_super === 1 && (
                    <motion.div key="staff" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        <h3 className="text-2xl font-black mb-4">Staff Management</h3>
                        {staff.map(s => (
                            <div key={s.id} className="glass-panel p-6 rounded-[24px] flex items-center justify-between">
                                <div>
                                    <h4 className="font-black text-lg flex items-center gap-2">{s.username} {s.is_super === 1 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Super</span>}</h4>
                                    <p className="text-sm text-light">ID: #{s.id}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {s.is_approved === 0 ? (
                                        <button onClick={() => approveStaff(s.id)} className="btn btn-primary px-5">Approve</button>
                                    ) : <span className="text-green-500 font-bold text-sm">Active</span>}
                                    {s.is_super === 0 && <button onClick={() => deleteStaff(s.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={20} /></button>}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
