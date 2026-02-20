import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import FeedbackForm from '../components/FeedbackForm';

export default function OrderConfirmed() {
    const { state } = useLocation();
    const navigate = useNavigate();

    if (!state) {
        return (
            <div className="pt-40 container text-center">
                <p className="text-light">No order data found.</p>
                <Link to="/" className="btn btn-primary mt-4">Go Home</Link>
            </div>
        );
    }

    const { orderId, pin, orderType, customerName } = state;

    return (
        <div className="pt-32 pb-20 container text-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-panel p-12 rounded-[40px] max-w-2xl mx-auto"
            >
                <div className="text-green-500 mb-6">
                    <CheckCircle size={80} className="mx-auto" />
                </div>
                <h2 className="text-4xl font-black mb-2">Order Confirmed! 🎉</h2>
                <p className="text-light text-lg mb-8">
                    Your {orderType === 'delivery' ? 'delivery' : 'dine-in'} order has been received!
                </p>

                {/* Delivery PIN Card */}
                {pin && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="delivery-pin-card mb-8"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">
                            {orderType === 'delivery' ? '🔐 Your Delivery Verification PIN' : '🔐 Your Order PIN'}
                        </p>
                        <div className="pin-display">
                            {pin.split('').map((digit, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="pin-digit"
                                >
                                    {digit}
                                </motion.span>
                            ))}
                        </div>
                        <p className="text-sm text-slate-600 mt-4 font-medium">
                            {orderType === 'delivery'
                                ? '📱 Show this PIN to the delivery boy when your order arrives. Do not share it before!'
                                : '📋 Share this PIN with hotel staff if asked for verification.'}
                        </p>
                        <p className="text-xs text-light mt-2">Order #{orderId}</p>
                    </motion.div>
                )}

                {/* My Orders link */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                    <Link to="/my-orders" className="btn btn-outline">
                        <ShoppingBag size={18} /> My Orders
                    </Link>
                    <Link to="/" className="btn btn-primary">Order More</Link>
                </div>

                {/* Feedback */}
                {orderId && (
                    <FeedbackForm
                        orderId={orderId}
                        customerName={customerName}
                        onComplete={() => navigate('/')}
                    />
                )}
            </motion.div>
        </div>
    );
}
