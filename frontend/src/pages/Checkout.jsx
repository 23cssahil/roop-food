import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { MapPin, Home, Truck, ShieldCheck, Landmark, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Checkout() {
    const { cart, total, clearCart } = useCart();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ customer_name: '', phone: '' });
    const [orderType, setOrderType] = useState('dine_in');
    const [location, setLocation] = useState(null);
    const [landmark, setLandmark] = useState('');
    const [locLoading, setLocLoading] = useState(false);
    const [locError, setLocError] = useState('');
    const [loading, setLoading] = useState(false);
    const [payLoading, setPayLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentDone, setPaymentDone] = useState(false);
    const [paymentId, setPaymentId] = useState(null);

    const getLocation = () => {
        setLocLoading(true);
        setLocError('');
        if (!navigator.geolocation) {
            setLocError('Geolocation not supported by your browser.');
            setLocLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocLoading(false);
            },
            (err) => {
                setLocError('Could not get location. Please allow location access.');
                setLocLoading(false);
            },
            { timeout: 10000 }
        );
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleRazorpay = async () => {
        if (!formData.customer_name || !formData.phone) {
            setError('Please fill your name and phone number first.');
            return;
        }
        if (orderType === 'delivery' && !location) {
            setError('Please share your live location first.');
            return;
        }

        setPayLoading(true);
        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
            setError('Could not load payment gateway. Please check your internet connection.');
            setPayLoading(false);
            return;
        }
        fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total })
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) throw new Error(data.error || 'Payment init failed');
                const options = {
                    key: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_placeholder', // Default for test
                    amount: data.amount,
                    currency: 'INR',
                    name: 'Roop Food',
                    description: 'Order Payment',
                    order_id: data.orderId,
                    handler: (response) => {
                        fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(response)
                        })
                            .then(r => r.json())
                            .then(v => {
                                if (v.success) {
                                    setPaymentDone(true);
                                    setPaymentId(v.payment_id);
                                    setPayLoading(false);
                                    setError(null);
                                } else {
                                    setError('Payment verification failed. Please try again.');
                                    setPayLoading(false);
                                }
                            });
                    },
                    prefill: { name: formData.customer_name, contact: formData.phone },
                    theme: { color: '#FF6B2B' },
                    modal: { ondismiss: () => setPayLoading(false) }
                };
                if (typeof window.Razorpay !== 'function') {
                    throw new Error('Razorpay failed to initialize. Please refresh the page or disable AdBlock.');
                }
                const rzp = new window.Razorpay(options);
                rzp.open();
            })
            .catch(err => {
                setError(err.message);
                setPayLoading(false);
            });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (orderType === 'delivery' && !paymentDone) {
            setError('Please complete payment first.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const orderData = {
                ...formData,
                items: cart,
                total,
                order_type: orderType,
                lat: location?.lat || null,
                lng: location?.lng || null,
                landmark: landmark || null,
                payment_status: orderType === 'delivery' ? 'paid' : 'cash',
                payment_id: paymentId || null
            };
            const res = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            const data = await res.json();
            if (data.success) {
                // Save phone to localStorage for My Orders
                localStorage.setItem('roop-customer-phone', formData.phone);
                clearCart();
                // WhatsApp notification
                const locationText = location
                    ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
                    : 'Dine-in';
                const landmarkText = landmark ? `%0ALandmark: ${landmark}` : '';
                const message = `*New Order #${data.orderId}!*%0A%0A*Customer:* ${formData.customer_name}%0A*Phone:* ${formData.phone}%0A*Type:* ${orderType === 'delivery' ? '🛵 Delivery' : '🍽️ Dine-in'}%0A*Location:* ${locationText}${landmarkText}%0A%0A*Items:*%0A${cart.map(i => `- ${i.name} (x${i.qty})`).join('%0A')}%0A%0A*Total:* ₹${total.toFixed(2)}%0A*Payment:* ${orderType === 'delivery' ? `Paid (${paymentId})` : 'Cash'}`;
                window.open(`https://wa.me/919120322488?text=${message}`, '_blank');
                navigate('/order-confirmed', { state: { orderId: data.orderId, pin: data.pin, orderType, customerName: formData.customer_name } });
            } else {
                const errorData = await res.json();
                console.error("Backend Order Error:", errorData);
                throw new Error(errorData.error || 'Order failed');
            }
        } catch (err) {
            console.error("Frontend Order Exception:", err);
            setError(err.message || 'Could not place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="pt-40 container text-center">
                <p className="text-light italic">Your cart is empty.</p>
                <Link to="/" className="btn btn-primary mt-4">Browse Menu</Link>
            </div>
        );
    }

    return (
        <div className="checkout-page pt-32 container pb-20">
            <h2 className="text-4xl font-black mb-8 px-4">Checkout</h2>

            {/* Order Type Toggle */}
            <div className="order-type-toggle mb-8 px-4">
                <p className="text-sm font-black uppercase tracking-widest text-light mb-3">Where are you?</p>
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setOrderType('dine_in')}
                        className={`order-type-btn ${orderType === 'dine_in' ? 'order-type-btn--active' : ''}`}
                    >
                        <Home size={20} />
                        <span>Dine-In</span>
                        <span className="order-type-sub">Inside Restaurant</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={`order-type-btn ${orderType === 'delivery' ? 'order-type-btn--delivery' : ''}`}
                    >
                        <Truck size={20} />
                        <span>Delivery</span>
                        <span className="order-type-sub">Outside / Home</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-[32px] space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-primary">
                                <CreditCard size={20} />
                            </div>
                            <h3 className="text-xl font-black">Your Details</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input type="text" className="input" required value={formData.customer_name}
                                onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                placeholder="Enter your name" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input type="tel" className="input" required value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="For order updates" />
                        </div>

                        {/* Delivery Section */}
                        <AnimatePresence>
                            {orderType === 'delivery' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                        <p className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
                                            <MapPin size={16} /> Share your live location for delivery
                                        </p>
                                        {location ? (
                                            <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                                                <ShieldCheck size={18} />
                                                Location captured! ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                                            </div>
                                        ) : (
                                            <button type="button" onClick={getLocation} disabled={locLoading}
                                                className="btn btn-primary py-2 text-sm">
                                                {locLoading ? '📍 Getting location...' : '📍 Share My Location'}
                                            </button>
                                        )}
                                        {locError && <p className="text-red-500 text-sm mt-2">{locError}</p>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label flex items-center gap-2">
                                            <Landmark size={14} /> Landmark (Optional)
                                        </label>
                                        <input type="text" className="input" value={landmark}
                                            onChange={e => setLandmark(e.target.value)}
                                            placeholder="e.g. Near City Mall, opposite SBI Bank" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="p-4 bg-slate-50 rounded-2xl flex gap-3 text-xs text-light">
                            <ShieldCheck size={16} className="text-secondary shrink-0" />
                            <p>Your details are secured and only used for order coordination.</p>
                        </div>

                        {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">{error}</div>}

                        {/* Payment + Order Buttons */}
                        {orderType === 'delivery' ? (
                            <div className="space-y-3">
                                {!paymentDone ? (
                                    <button type="button" onClick={handleRazorpay} disabled={payLoading}
                                        className="btn btn-primary w-full py-5 text-lg shadow-xl">
                                        {payLoading ? 'Opening Payment...' : '💳 Pay ₹' + total.toFixed(2) + ' & Order'}
                                    </button>
                                ) : (
                                    <>
                                        <div className="p-3 bg-green-50 text-green-700 font-bold rounded-2xl text-sm text-center">
                                            ✅ Payment Successful! Now place your order.
                                        </div>
                                        <button type="submit" disabled={loading} className="btn btn-primary w-full py-5 text-lg shadow-xl">
                                            {loading ? 'Placing Order...' : '🛵 Place Delivery Order'}
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <button type="submit" disabled={loading} className="btn btn-primary w-full py-5 text-lg shadow-xl">
                                {loading ? 'Processing...' : '🍽️ Place Dine-In Order'}
                            </button>
                        )}
                    </form>
                </motion.div>

                {/* Order Summary */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="glass-panel p-8 rounded-[32px] sticky top-32">
                        <h3 className="text-xl font-black mb-6">Your Selection</h3>
                        <div className="space-y-4 mb-8">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{item.name}</span>
                                        <span className="text-light text-xs">Qty: {item.qty}</span>
                                    </div>
                                    <span className="font-black">₹{(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-black">Total</span>
                                <span className="text-2xl font-black text-primary">₹{total.toFixed(2)}</span>
                            </div>
                            <div className={`text-center text-xs rounded-full py-2 font-bold uppercase tracking-widest ${orderType === 'delivery' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                {orderType === 'delivery' ? '🛵 Delivery Order' : '🍽️ Dine-In Order'}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
