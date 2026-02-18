import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CheckCircle, ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import FeedbackForm from '../components/FeedbackForm';

export default function Checkout() {
    const { cart, total, clearCart } = useCart();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        customer_name: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const orderData = {
            ...formData,
            items: cart,
            total: total
        };

        try {
            const res = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const data = await res.json();

            if (data.success) {
                setOrderId(data.orderId);
                setSuccess(true);
                clearCart();

                // WhatsApp Integration
                const message = `*New Order Confirmed!*%0A%0A*Customer:* ${formData.customer_name}%0A*Phone:* ${formData.phone}%0A%0A*Items:*%0A${cart.map(i => `- ${i.name} (x${i.qty})`).join('%0A')}%0A%0A*Total:* ₹${total.toFixed(2)}`;
                const whatsappUrl = `https://wa.me/919120322488?text=${message}`;

                window.open(whatsappUrl, '_blank');
            } else {
                throw new Error('Order failed');
            }
        } catch (err) {
            console.error(err);
            setError('Could not place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="pt-32 pb-20 container text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-panel p-12 rounded-[40px] max-w-2xl mx-auto"
                >
                    <div className="text-secondary mb-6 scale-125">
                        <CheckCircle size={80} className="mx-auto" />
                    </div>
                    <h2 className="text-4xl font-black mb-4">Bon Appétit!</h2>
                    <p className="text-light text-lg mb-8">
                        Your gourmet order has been received. We're crafting it with love!
                    </p>

                    {orderId && (
                        <FeedbackForm
                            orderId={orderId}
                            customerName={formData.customer_name}
                            onComplete={() => navigate('/')}
                        />
                    )}

                    <div className="mt-12">
                        <Link to="/" className="btn btn-outline px-10">
                            Return to Selection
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="pt-40 container text-center">
                <p className="text-light italic">Your cart is empty. Please select your meal first.</p>
                <Link to="/" className="btn btn-primary mt-4">Browse Menu</Link>
            </div>
        );
    }

    return (
        <div className="checkout-page pt-32 container pb-20">
            <div className="flex items-center gap-4 mb-8 px-4">
                <Link to="/cart" className="p-2 hover:bg-white rounded-full transition-all">
                    <ArrowLeft size={24} />
                </Link>
                <h2 className="text-4xl font-black">Checkout</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-[32px] space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-primary">
                                <CreditCard size={20} />
                            </div>
                            <h3 className="text-xl font-black">Delivery Details</h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                className="input"
                                required
                                value={formData.customer_name}
                                onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                                placeholder="Enter your name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="tel"
                                className="input"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="For delivery updates"
                            />
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl flex gap-3 text-xs text-light">
                            <ShieldCheck size={16} className="text-secondary shrink-0" />
                            <p>Your details are secured. We'll only use your number for order coordination.</p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-full py-5 text-lg shadow-xl"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Place Secure Order'}
                        </button>
                    </form>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="glass-panel p-8 rounded-[32px] sticky top-32">
                        <h3 className="text-xl font-black mb-6">Your Selection</h3>

                        <div className="space-y-4 mb-8">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{item.name}</span>
                                        <span className="text-light text-xs">Quantity: {item.qty}</span>
                                    </div>
                                    <span className="font-black">₹{(item.price * item.qty).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-slate-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-black">Total Amount</span>
                                <span className="text-2xl font-black text-primary">₹{total.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-center text-light uppercase tracking-widest font-bold">Free Instant Delivery Included</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

