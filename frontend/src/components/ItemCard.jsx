import { motion } from 'framer-motion';
import { Plus, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ItemCard({ item, index = 0 }) {
    const { addToCart } = useCart();

    return (
        <motion.div
            className="item-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
        >
            <div className="item-image-wrapper">
                <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                    alt={item.name}
                    className="item-image"
                    loading="lazy"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }}
                />
                <div style={{
                    position: 'absolute', top: '0.75rem', right: '0.75rem',
                    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    padding: '0.15rem 0.5rem', borderRadius: '99px',
                    display: 'flex', alignItems: 'center', gap: '0.2rem',
                    fontSize: '0.75rem', fontWeight: '700', boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}>
                    <Star size={11} fill="#FFD700" color="#FFD700" /> 4.8
                </div>
            </div>

            <div className="item-content">
                <div className="item-header">
                    <h3 className="item-title">{item.name}</h3>
                    <span className="item-price">
                        ₹{Number(item.price).toFixed(2)}
                    </span>
                </div>

                <p className="item-desc">
                    {item.description || 'Crafted with premium ingredients for a truly gourmet experience.'}
                </p>

                <button
                    className="btn btn-primary w-full mt-auto py-2 px-1 text-[10px] sm:text-sm flex items-center justify-center gap-1"
                    onClick={() => addToCart(item)}
                >
                    <Plus size={14} />
                    <span className="hidden sm:inline">Add to Cart</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>
        </motion.div>
    );
}
