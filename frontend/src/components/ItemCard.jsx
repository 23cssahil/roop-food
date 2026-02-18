import { motion } from 'framer-motion';
import { Plus, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ItemCard({ item }) {
    const { addToCart } = useCart();

    return (
        <motion.div
            className="item-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <div className="item-image-wrapper">
                <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                    alt={item.name}
                    className="item-image"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }}
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-full flex items-center gap-1 text-xs font-bold shadow-sm">
                    <Star size={12} fill="#FFD700" color="#FFD700" /> 4.8
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
                    className="btn btn-primary w-full mt-auto"
                    onClick={() => addToCart(item)}
                >
                    <Plus size={18} /> Add to Cart
                </button>
            </div>
        </motion.div>
    );
}
