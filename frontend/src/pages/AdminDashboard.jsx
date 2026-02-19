import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, PlusCircle, CheckCircle2, Trash2, LayoutDashboard, UtensilsCrossed, MessageSquare, TrendingUp, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('orders');
    const [orders, setOrders] = useState([]);
    const [items, setItems] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [staff, setStaff] = useState([]);
    const [sales, setSales] = useState([]);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('adminUser')) || null);
    const [newItem, setNewItem] = useState({ name: '', price: '', image_url: '' });

    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/admin/login');
            return;
        }
        fetchOrders();
        fetchItems();
        fetchFeedback();
        if (user.is_super) {
            fetchStaff();
            fetchSales();
        }

        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const fetchSales = () => {
        fetch('/admin/daily-sales')
            .then(res => res.json())
            .then(data => setSales(Array.isArray(data) ? data : []))
            .catch(err => console.error("Sales fetch error:", err));
    };

    const fetchStaff = () => {
        fetch('/admin/staff')
            .then(res => res.json())
            .then(data => setStaff(Array.isArray(data) ? data : []));
    };

    const approveStaff = (id) => {
        fetch(`/admin/approve-staff/${id}`, { method: 'PUT' })
            .then(() => fetchStaff());
    };

    const deleteStaff = (id) => {
        if (!confirm("Are you sure you want to remove this staff member?")) return;
        fetch(`/admin/delete-staff/${id}`, { method: 'DELETE' })
            .then(() => fetchStaff());
    };

    const handleLogout = () => {
        fetch('/admin/logout', { method: 'POST' })
            .then(() => {
                localStorage.removeItem('adminUser');
                navigate('/');
            });
    };

    const fetchOrders = () => {
        fetch('/admin/orders')
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    navigate('/admin');
                    throw new Error("Unauthorized");
                }
                return res.json();
            })
            .then(data => {
                const grouped = data.reduce((acc, curr) => {
                    if (!acc[curr.id]) {
                        acc[curr.id] = { ...curr, items: [] };
                    }
                    if (curr.item_name) {
                        acc[curr.id].items.push({ name: curr.item_name, qty: curr.qty });
                    }
                    return acc;
                }, {});
                setOrders(Object.values(grouped).sort((a, b) => b.id - a.id));
            })
            .catch(err => console.error(err));
    };

    const fetchItems = () => {
        fetch('/api/items')
            .then(res => res.json())
            .then(data => setItems(data));
    };

    const fetchFeedback = () => {
        fetch('/admin/feedback')
            .then(res => res.json())
            .then(data => setFeedback(data));
    };

    const addItem = (e) => {
        e.preventDefault();
        fetch('/admin/add-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setNewItem({ name: '', price: '', image_url: '' });
                    fetchItems();
                }
            });
    };

    const deleteItem = (id) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        fetch(`/admin/delete-item/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) fetchItems();
            });
    };

    const markOrderDone = (id) => {
        fetch(`/admin/order-done/${id}`, { method: 'PUT' })
            .then(res => res.json())
            .then(data => {
                if (data.success) fetchOrders();
            });
    };

    return (
        <div className="admin-dashboard container pt-32 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">Backoffice</h2>
                    <p className="text-light">Manage your kitchen operations and feedback.</p>
                </div>

                <div className="flex bg-white p-1 rounded-full shadow-sm border border-slate-200 admin-tab-container">
                    <button
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'orders' ? 'bg-primary text-white shadow-lg' : 'text-light hover:text-primary'}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        Orders
                    </button>
                    {user.is_super === 1 && (
                        <button
                            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'menu' ? 'bg-primary text-white shadow-lg' : 'text-light hover:text-primary'}`}
                            onClick={() => setActiveTab('menu')}
                        >
                            Menu
                        </button>
                    )}
                    <button
                        className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'feedback' ? 'bg-primary text-white shadow-lg' : 'text-light hover:text-primary'}`}
                        onClick={() => setActiveTab('feedback')}
                    >
                        Reviews
                    </button>
                    {user?.is_super === 1 && (
                        <button
                            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'sales' ? 'bg-primary text-white shadow-lg' : 'text-light hover:text-primary'}`}
                            onClick={() => setActiveTab('sales')}
                        >
                            Sales
                        </button>
                    )}
                    {user?.is_super === 1 && (
                        <button
                            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'staff' ? 'bg-primary text-white shadow-lg' : 'text-light hover:text-primary'}`}
                            onClick={() => setActiveTab('staff')}
                        >
                            Staff
                        </button>
                    )}
                </div>

                <button onClick={handleLogout} className="text-light hover:text-red-500 font-bold flex items-center gap-2">
                    Logout
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'orders' && (
                    <motion.div
                        key="orders"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        {orders.map(order => (
                            <div key={order.id} className="glass-panel p-6 rounded-[24px] flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-black uppercase text-primary tracking-widest">Order ID: #{order.id}</span>
                                            <h3 className="text-xl font-black">{order.customer_name}</h3>
                                            <p className="text-sm text-light">{order.phone}</p>
                                        </div>
                                        <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {order.status || 'Pending'}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                                        <ul className="space-y-2">
                                            {order.items.map((item, idx) => (
                                                <li key={idx} className="flex justify-between text-sm font-medium">
                                                    <span className="text-light">{item.name}</span>
                                                    <span className="font-bold">x{item.qty}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="order-card-footer">
                                    <p className="text-lg font-black">Total: <span className="text-primary">₹{Number(order.total).toFixed(2)}</span></p>
                                    {order.status !== 'Completed' && (
                                        <button className="btn btn-primary px-6 w-full sm:w-auto" onClick={() => markOrderDone(order.id)}>
                                            Mark as Done
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {activeTab === 'menu' && (
                    <motion.div
                        key="menu"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                    >
                        <form onSubmit={addItem} className="glass-panel p-8 rounded-[32px]">
                            <h3 className="text-2xl font-black mb-6">Add Specialty</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="form-group">
                                    <label className="form-label">Item Name</label>
                                    <input className="input" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Classic Burger" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Price (₹)</label>
                                    <input type="number" step="0.01" className="input" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} placeholder="e.g. 199.00" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Image URL</label>
                                    <input className="input" value={newItem.image_url} onChange={e => setNewItem({ ...newItem, image_url: e.target.value })} placeholder="https://unsplash.com/..." />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary">
                                <PlusCircle size={20} /> Deploy to Menu
                            </button>
                        </form>

                        <div className="admin-items-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map(item => (
                                <div key={item.id} className="glass-panel p-4 rounded-[24px] flex items-center gap-4">
                                    <img
                                        src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                                        alt={item.name}
                                        className="w-16 h-16 rounded-2xl object-cover"
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }}
                                    />
                                    <div className="flex-1">
                                        <h4 className="font-black text-lg">{item.name}</h4>
                                        <p className="text-primary font-bold">₹{item.price}</p>
                                    </div>
                                    <button className="p-2 text-slate-300 hover:text-red-500 transition-colors" onClick={() => deleteItem(item.id)}>
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'feedback' && (
                    <motion.div
                        key="feedback"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="feedback-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {feedback.map(f => (
                            <div key={f.id} className="glass-panel p-6 rounded-[24px]">
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <CheckCircle2 key={i} size={14} className={i < f.rating ? "text-amber-400" : "text-slate-200"} fill={i < f.rating ? "currentColor" : "none"} />
                                    ))}
                                </div>
                                <p className="italic text-slate-600 mb-4">"{f.comment || 'No comment provided.'}"</p>
                                <div className="pt-4 border-t border-slate-100">
                                    <h4 className="font-bold text-sm">{f.customer_name || 'Anonymous Guest'}</h4>
                                    <p className="text-[10px] text-light uppercase tracking-widest">{new Date(f.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {feedback.length === 0 && <p className="text-center py-20 text-light italic col-span-full">No reviews yet. Feed your guests!</p>}
                    </motion.div>
                )}
                {activeTab === 'sales' && user?.is_super === 1 && (
                    <motion.div
                        key="sales"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black">Sales Analytics</h3>
                                <p className="text-sm text-light font-medium uppercase tracking-widest">Performance Insights</p>
                            </div>
                        </div>

                        <div className="glass-panel rounded-[32px] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-light">Date</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-light">Orders</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-light text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sales.length > 0 ? sales.map((day, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-8 py-5 font-bold text-slate-900">
                                                    {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-5 font-bold">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs">
                                                        {day.orders} {day.orders === 1 ? 'Order' : 'Orders'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-primary">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <IndianRupee size={16} />
                                                        {Number(day.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="px-8 py-20 text-center text-light italic">
                                                    No sales data recorded yet. Time to get some orders!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
                {activeTab === 'staff' && user?.is_super === 1 && (
                    <motion.div
                        key="staff"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <h3 className="text-2xl font-black mb-6">Team Management</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {staff.map(s => (
                                <div key={s.id} className="glass-panel p-6 rounded-[24px] flex items-center justify-between">
                                    <div>
                                        <h4 className="font-black text-lg flex items-center gap-2">
                                            {s.username}
                                            {s.is_super === 1 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Super</span>}
                                        </h4>
                                        <p className="text-sm text-light">ID: #{s.id}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {s.is_approved === 0 ? (
                                            <button
                                                onClick={() => approveStaff(s.id)}
                                                className="btn btn-primary px-6 py-2"
                                            >
                                                Approve
                                            </button>
                                        ) : (
                                            <span className="text-green-500 font-bold text-sm">Active Member</span>
                                        )}
                                        {s.is_super === 0 && (
                                            <button
                                                onClick={() => deleteStaff(s.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

