import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Package, CheckCircle2, Truck, LogOut, Navigation, AlertTriangle, ShoppingBag, ShieldAlert, BarChart3, Bike, IndianRupee, Clock, Calendar } from 'lucide-react';

let socket = null;

export default function DeliveryDashboard() {
    const navigate = useNavigate();
    const [boy, setBoy] = useState(() => {
        const saved = localStorage.getItem('deliveryBoy');
        return saved ? JSON.parse(saved) : null;
    });
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [pinInputs, setPinInputs] = useState({});
    const [pinMessages, setPinMessages] = useState({});
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('pool');
    const [takingOrder, setTakingOrder] = useState(null);
    const [analytics, setAnalytics] = useState([]);

    useEffect(() => {
        if (!boy) { navigate('/delivery/login'); return; }
        fetchAvailableOrders();
        fetchMyOrders();
        fetchAnalytics();
        initSocket();
        registerPush();
        return () => { if (socket) socket.disconnect(); };
    }, []);

    const initSocket = () => {
        socket = io(window.location.origin, { withCredentials: true });
        socket.on('connect', () => {
            socket.emit('register_delivery_boy', boy.id);
        });
        socket.on('new_order', (order) => {
            setAvailableOrders(prev => {
                if (prev.find(o => o.id === order.orderId)) return prev;
                return [{ id: order.orderId, customer_name: order.customer_name, total: order.total, landmark: order.landmark, items_summary: order.items?.map(i => `${i.name} x${i.qty}`).join(', '), status: 'Pending', created_at: new Date() }, ...prev];
            });
            showNotification(`🛵 New Order #${order.orderId} — ₹${order.total}`);
        });
        socket.on('order_taken', ({ orderId }) => {
            setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
        });
        socket.on('order_status_update', ({ orderId, status }) => {
            setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        });
        socket.on('order_assigned', ({ orderId }) => {
            fetchMyOrders();
            fetchAvailableOrders();
            setActiveTab('my'); // Automatically switch to My Orders
            showNotification(`🛵 Order #${orderId} has been assigned to you!`);
        });
    };

    const registerPush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const reg = await navigator.serviceWorker.ready;
            const res = await fetch('/api/vapid-public-key');
            const { publicKey } = await res.json();
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey
            });
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub })
            });
        } catch (e) { /* push not available, ignore */ }
    };

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 5000);
    };

    const fetchAvailableOrders = () => {
        fetch('/delivery/available-orders')
            .then(r => {
                if (r.status === 401 || r.status === 403) { handleLogout(); throw new Error('Unauthorized'); }
                return r.json();
            })
            .then(data => setAvailableOrders(Array.isArray(data) ? data : []))
            .catch(() => { });
    };

    const fetchMyOrders = () => {
        fetch('/delivery/my-orders')
            .then(r => {
                if (r.status === 401 || r.status === 403) { handleLogout(); throw new Error('Unauthorized'); }
                return r.json();
            })
            .then(data => setMyOrders(Array.isArray(data) ? data : []))
            .catch(() => { });
    };

    const fetchAnalytics = () => {
        fetch('/delivery/analytics')
            .then(r => r.json())
            .then(data => setAnalytics(Array.isArray(data) ? data : []))
            .catch(() => { });
    };

    const takeOrder = async (orderId) => {
        setTakingOrder(orderId);
        try {
            const res = await fetch(`/delivery/take-order/${orderId}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showNotification('✅ Order claimed! Check "My Orders" tab.');
                setAvailableOrders(prev => prev.filter(o => o.id !== orderId));
                fetchMyOrders();
                setActiveTab('my');
            } else {
                showNotification(`❌ ${data.error}`);
            }
        } catch { showNotification('❌ Failed to claim order.'); }
        finally { setTakingOrder(null); }
    };

    const verifyPin = async (orderId) => {
        const pin = pinInputs[orderId];
        if (!pin || pin.length !== 4) {
            setPinMessages(prev => ({ ...prev, [orderId]: { type: 'error', text: 'Enter a 4-digit PIN.' } }));
            return;
        }
        try {
            const res = await fetch('/delivery/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, pin })
            });
            const data = await res.json();
            setPinMessages(prev => ({ ...prev, [orderId]: { type: data.success ? 'success' : (data.locked ? 'locked' : 'error'), text: data.message } }));
            if (data.success) {
                fetchMyOrders();
                showNotification(`✅ Order #${orderId} delivered!`);
            }
        } catch {
            setPinMessages(prev => ({ ...prev, [orderId]: { type: 'error', text: 'Server error.' } }));
        }
    };

    const startDelivery = (orderId) => {
        fetch(`/admin/order-out-for-delivery/${orderId}`, { method: 'PUT' })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    fetchMyOrders();
                    showNotification('🚀 Delivery started! Drive safe.');
                }
            });
    };

    const handleLogout = () => {
        fetch('/delivery/logout', { method: 'POST' });
        localStorage.removeItem('deliveryBoy');
        if (socket) socket.disconnect();
        navigate('/delivery/login');
    };

    if (!boy) return null;

    return (
        <div className="admin-dashboard container pt-32 pb-20">
            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold">
                        {notification}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-1">Delivery <span className="text-primary">Dashboard</span></h2>
                    <div className="flex items-center gap-3">
                        <p className="text-light">Welcome, <span className="font-bold text-slate-700">{boy.full_name}</span></p>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">ID: #{boy.id}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Tab Switcher */}
                    <div className="flex bg-white p-1 rounded-full shadow-sm border border-slate-200">
                        <button onClick={() => setActiveTab('pool')}
                            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'pool' ? 'bg-primary text-white shadow' : 'text-light hover:text-primary'}`}>
                            Available Orders {availableOrders.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{availableOrders.length}</span>}
                        </button>
                        <button onClick={() => setActiveTab('my')}
                            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'my' ? 'bg-primary text-white shadow' : 'text-light hover:text-primary'}`}>
                            My Orders
                        </button>
                        <button onClick={() => setActiveTab('analytics')}
                            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-primary text-white shadow' : 'text-light hover:text-primary'}`}>
                            Analytics
                        </button>
                    </div>
                    <button onClick={handleLogout} className="text-light hover:text-red-500 font-bold flex items-center gap-2 text-sm">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </div>

            {/* Available Orders Pool */}
            {activeTab === 'pool' && (
                <AnimatePresence>
                    <motion.div key="pool" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {availableOrders.length === 0 ? (
                            <div className="text-center py-24 glass-panel rounded-[40px]">
                                <ShoppingBag size={64} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-2xl font-bold mb-2">No orders available</h3>
                                <p className="text-light">New orders will appear here in real-time.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {availableOrders.map(order => (
                                    <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="glass-panel p-6 rounded-[24px] border-2 border-orange-100">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-xs font-black uppercase text-primary tracking-widest">Order #{order.id}</span>
                                                <h3 className="text-xl font-black mt-1">{order.customer_name}</h3>
                                                <p className="text-sm text-light mt-0.5">{order.items_summary}</p>
                                            </div>
                                            <span className="text-xl font-black text-primary">₹{Number(order.total).toFixed(2)}</span>
                                        </div>
                                        {order.landmark && (
                                            <p className="text-sm text-slate-600 flex items-center gap-1 mb-4">
                                                <MapPin size={14} className="text-primary" /> {order.landmark}
                                            </p>
                                        )}
                                        <button onClick={() => takeOrder(order.id)} disabled={takingOrder === order.id}
                                            className="btn btn-primary w-full">
                                            <Truck size={18} /> {takingOrder === order.id ? 'Claiming...' : 'Take This Order'}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}

            {/* My Assigned Orders */}
            {activeTab === 'my' && (
                <AnimatePresence>
                    <motion.div key="my" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {myOrders.length === 0 ? (
                            <div className="text-center py-24 glass-panel rounded-[40px]">
                                <Package size={64} className="mx-auto text-slate-200 mb-4" />
                                <h3 className="text-2xl font-bold mb-2">No active orders</h3>
                                <p className="text-light">Take an order from the pool to get started.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {myOrders.map(order => (
                                    <motion.div key={order.id} layout className="glass-panel p-6 rounded-[24px]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-xs font-black uppercase text-primary tracking-widest">Order #{order.id}</span>
                                                <h3 className="text-xl font-black mt-1">{order.customer_name}</h3>
                                                <p className="text-sm text-light">{order.phone}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {order.status}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-1">
                                            <p className="text-sm font-medium text-slate-600">{order.items_summary}</p>
                                            {order.landmark && (
                                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                                    <MapPin size={12} /> {order.landmark}
                                                </p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 mb-4">
                                            {order.status === 'Assigned' && (
                                                <button onClick={() => startDelivery(order.id)}
                                                    className="btn btn-primary w-full py-4 flex items-center justify-center gap-2">
                                                    <Bike size={20} /> Start Delivery
                                                </button>
                                            )}

                                            {order.status === 'Out for Delivery' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <button onClick={() => navigate('/order-tracking', { state: { order } })}
                                                        className="btn btn-primary text-sm flex items-center justify-center gap-2">
                                                        <Navigation size={16} /> Track & Navigate
                                                    </button>
                                                    <a href={`https://www.google.com/maps/search/?api=1&query=${order.lat},${order.lng}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="btn btn-outline text-sm flex items-center justify-center gap-2">
                                                        <MapPin size={16} /> Maps Link
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* PIN Verification */}
                                        {(order.status === 'Assigned' || order.status === 'Out for Delivery') && (
                                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                                <p className="text-xs font-black uppercase tracking-widest text-light">Verify Delivery PIN</p>
                                                <div className="flex gap-3">
                                                    <input type="text" maxLength={4} className="input text-center text-2xl font-black tracking-widest"
                                                        placeholder="****"
                                                        value={pinInputs[order.id] || ''}
                                                        onChange={e => setPinInputs(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))} />
                                                    <button onClick={() => verifyPin(order.id)} className="btn btn-primary px-6">
                                                        <CheckCircle2 size={20} />
                                                    </button>
                                                </div>
                                                {pinMessages[order.id] && (
                                                    <div className={`p-3 rounded-2xl text-sm font-bold ${pinMessages[order.id].type === 'success' ? 'bg-green-50 text-green-700' : pinMessages[order.id].type === 'locked' ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600'}`}>
                                                        {pinMessages[order.id].type === 'locked' && <ShieldAlert size={16} className="inline mr-2" />}
                                                        {pinMessages[order.id].text}
                                                    </div>
                                                )}
                                                {order.pin_attempts >= 3 && (
                                                    <div className="p-3 bg-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
                                                        <AlertTriangle size={16} /> Order LOCKED — Fraud alert sent to Admin
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {order.status === 'Delivered' && (
                                            <div className="p-3 bg-green-50 text-green-700 rounded-2xl text-sm font-bold text-center">
                                                ✅ Delivered Successfully
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
            {activeTab === 'analytics' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-panel p-6 rounded-[24px] bg-gradient-to-br from-primary/10 to-transparent">
                            <p className="text-[10px] font-black uppercase tracking-widest text-light mb-1">Total Orders</p>
                            <h4 className="text-3xl font-black text-primary">{analytics.reduce((acc, curr) => acc + curr.total_orders, 0)}</h4>
                        </div>
                        <div className="glass-panel p-6 rounded-[24px] bg-gradient-to-br from-green-500/10 to-transparent">
                            <p className="text-[10px] font-black uppercase tracking-widest text-light mb-1">Delivered</p>
                            <h4 className="text-3xl font-black text-green-600">{analytics.reduce((acc, curr) => acc + (Number(curr.completed_orders) || 0), 0)}</h4>
                        </div>
                        <div className="glass-panel p-6 rounded-[24px] bg-gradient-to-br from-amber-500/10 to-transparent">
                            <p className="text-[10px] font-black uppercase tracking-widest text-light mb-1">Completion</p>
                            <h4 className="text-3xl font-black text-amber-600">
                                {analytics.length > 0 && analytics.reduce((acc, curr) => acc + curr.total_orders, 0) > 0 ? Math.round((analytics.reduce((acc, curr) => acc + (Number(curr.completed_orders) || 0), 0) / analytics.reduce((acc, curr) => acc + curr.total_orders, 0)) * 100) : 0}%
                            </h4>
                        </div>
                    </div>
                    <div className="glass-panel rounded-[32px] overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-black">Daily Performance</h3>
                            <Calendar size={20} className="text-slate-300" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr className="border-b border-slate-100">
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-light">Date</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-light text-center">Tasks</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-light text-center">Done</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-light text-right">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.map((day, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5 font-bold text-slate-700">{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                            <td className="px-8 py-5 text-center font-black">{day.total_orders}</td>
                                            <td className="px-8 py-5 text-center font-black text-green-600">{day.completed_orders}</td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${Number(day.completed_orders) === Number(day.total_orders) ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {Number(day.total_orders) > 0 ? Math.round((Number(day.completed_orders) / Number(day.total_orders)) * 100) : 0}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {analytics.length === 0 && <tr><td colSpan="4" className="px-8 py-20 text-center text-light italic">No analytics yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
