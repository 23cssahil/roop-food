import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ArrowLeft, ArrowRight, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Cart() {
    const { cart, removeFromCart, updateQty, total, clearCart } = useCart();

    if (cart.length === 0) {
        return (
            <div className="empty-state pt-32 px-4 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-panel p-8 md:p-12 rounded-[32px] md:rounded-[40px] max-w-md mx-auto inline-block w-full"
                >
                    <ShoppingBag size={64} className="mx-auto mb-6 text-slate-200" />
                    <h2 className="text-2xl md:text-3xl font-black mb-4">Your cart is empty</h2>
                    <p className="text-light mb-8">
                        Looks like you haven't added any gourmet delights yet.
                    </p>
                    <Link to="/" className="btn btn-primary">
                        Browse Menu <ArrowRight size={18} />
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="cart-page pt-32 container pb-20">
            <h2 className="text-3xl md:text-4xl font-black mb-8 px-4">Your Cart</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4 px-4 md:px-0">
                    <AnimatePresence>
                        {cart.map(item => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="glass-panel p-4 rounded-[24px] flex items-center gap-4 md:gap-6 flex-wrap md:flex-nowrap"
                            >
                                <img
                                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                                    alt={item.name}
                                    className="w-16 h-16 md:w-24 md:h-24 rounded-2xl object-cover shrink-0"
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }}
                                />

                                <div className="flex-1 min-w-[150px]">
                                    <h3 className="text-lg font-black">{item.name}</h3>
                                    <p className="text-primary font-bold">₹{Number(item.price).toFixed(2)}</p>
                                </div>

                                <div className="cart-qty-controls flex items-center bg-slate-50 rounded-full p-1 border border-slate-100">
                                    <button
                                        className="p-2 hover:text-primary transition-colors"
                                        onClick={() => updateQty(item.id, -1)}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center font-black">{item.qty}</span>
                                    <button
                                        className="p-2 hover:text-primary transition-colors"
                                        onClick={() => updateQty(item.id, 1)}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <button
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    onClick={() => removeFromCart(item.id)}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="lg:col-span-1 px-4 md:px-0">
                    <div className="glass-panel p-6 md:p-8 rounded-[32px] lg:sticky lg:top-32 shadow-xl">
                        <h3 className="text-xl font-black mb-6">Order Summary</h3>

                        <div className="space-y-4 mb-6 md:mb-8">
                            <div className="flex justify-between text-light">
                                <span>Subtotal</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-light">
                                <span>Delivery Fee</span>
                                <span className="text-secondary font-bold">FREE</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <span className="text-lg font-black">Total</span>
                                <span className="text-2xl font-black text-primary">₹{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Link to="/checkout" className="btn btn-primary w-full py-4 text-lg">
                                Checkout <ArrowRight size={20} />
                            </Link>
                            <button
                                className="text-sm text-light font-bold hover:text-red-500 transition-colors"
                                onClick={clearCart}
                            >
                                Clear cart
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
