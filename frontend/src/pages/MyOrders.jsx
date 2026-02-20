import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, CheckCircle, Truck, Phone, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusColors = {
    'Pending': 'bg-orange-100 text-orange-700',
    'Assigned': 'bg-blue-100 text-blue-700',
    'Out for Delivery': 'bg-purple-100 text-purple-700',
    'Delivered': 'bg-green-100 text-green-700',
    'Completed': 'bg-green-100 text-green-700',
};

const statusIcons = {
    'Pending': <Clock size={14} />,
    'Assigned': <Truck size={14} />,
    'Out for Delivery': <Truck size={14} />,
    'Delivered': <CheckCircle size={14} />,
    'Completed': <CheckCircle size={14} />,
};

export default function MyOrders() {
    const [phone, setPhone] = useState(localStorage.getItem('roop-customer-phone') || '');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        if (phone) fetchOrders(phone);
    }, []);

    const fetchOrders = (ph) => {
        if (!ph) return;
        setLoading(true);
        fetch(`/api/my-orders/${encodeURIComponent(ph)}`)
            .then(r => r.json())
            .then(data => {
                setOrders(Array.isArray(data) ? data : []);
                setLoading(false);
                setSearched(true);
            })
            .catch(() => { setLoading(false); setSearched(true); });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        localStorage.setItem('roop-customer-phone', phone);
        fetchOrders(phone);
    };

    const activeOrder = orders.find(o => o.status !== 'Delivered' && o.status !== 'Completed');
    const pastOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'Completed');

    return (
        <div className="cart-page">
            <div className="container px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                            My <span className="text-primary">Orders</span>
                        </h2>
                        <p className="text-light text-lg">Track your active and past orders.</p>
                    </motion.div>
                    <Link to="/" className="btn btn-outline"><ArrowLeft size={18} /> Back to Menu</Link>
                </div>

                {/* Phone Search */}
                <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSearch}
                    className="glass-panel p-6 rounded-[24px] mb-8 flex flex-col sm:flex-row gap-4"
                >
                    <div className="flex-1 form-group mb-0">
                        <label className="form-label flex items-center gap-2"><Phone size={14} /> Your Phone Number</label>
                        <input type="tel" className="input" value={phone}
                            onChange={e => setPhone(e.target.value)} placeholder="Enter your phone number"
                            required />
                    </div>
                    <button type="submit" className="btn btn-primary self-end" disabled={loading}>
                        {loading ? 'Searching...' : 'Find Orders'}
                    </button>
                </motion.form>

                {/* Active Order with PIN */}
                {activeOrder && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8"
                    >
                        <h3 className="text-xl font-black mb-4 text-primary">📦 Active Order</h3>
                        <div className="active-order-card glass-panel p-8 rounded-[32px] border-2 border-primary/20">
                            <div className="flex flex-col md:flex-row gap-6 justify-between">
                                <div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${statusColors[activeOrder.status] || 'bg-slate-100'}`}>
                                        {statusIcons[activeOrder.status]} {activeOrder.status}
                                    </span>
                                    <h4 className="text-2xl font-black mt-3">Order #{activeOrder.id}</h4>
                                    <p className="text-light text-sm mt-1">{activeOrder.items_summary}</p>
                                    <p className="text-primary font-black text-lg mt-2">₹{Number(activeOrder.total).toFixed(2)}</p>
                                    <p className="text-xs text-light mt-1">{new Date(activeOrder.created_at).toLocaleString('en-IN')}</p>
                                </div>

                                {/* PIN Display */}
                                {activeOrder.verification_pin && activeOrder.order_type === 'delivery' && (
                                    <div className="delivery-pin-card !mb-0 flex-shrink-0">
                                        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">🔐 Delivery PIN</p>
                                        <div className="pin-display">
                                            {String(activeOrder.verification_pin).split('').map((d, i) => (
                                                <span key={i} className="pin-digit">{d}</span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-600 mt-3 max-w-[200px] text-center">
                                            Show this to the delivery boy to receive your order
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Past Orders */}
                {searched && pastOrders.length > 0 && (
                    <div>
                        <h3 className="text-xl font-black mb-4 text-slate-600">📋 Past Orders</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pastOrders.map((o, idx) => (
                                <motion.div
                                    key={o.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-panel p-6 rounded-[24px]"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="text-xs font-black text-primary uppercase tracking-widest">Order #{o.id}</span>
                                            <h4 className="font-bold text-slate-900 mt-0.5">{o.customer_name}</h4>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${statusColors[o.status] || 'bg-slate-100'}`}>
                                            {statusIcons[o.status]} {o.status}
                                        </span>
                                    </div>
                                    <p className="text-light text-sm mb-3">{o.items_summary}</p>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                        <p className="text-xs text-light">{new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                                        <p className="font-black text-primary">₹{Number(o.total).toFixed(2)}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {searched && orders.length === 0 && (
                    <div className="text-center py-20 glass-panel rounded-[40px]">
                        <Package size={64} className="mx-auto text-slate-200 mb-4" />
                        <h3 className="text-2xl font-bold mb-2">No orders found</h3>
                        <p className="text-light mb-6">No orders found for this phone number.</p>
                        <Link to="/" className="btn btn-primary">Order Now</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
