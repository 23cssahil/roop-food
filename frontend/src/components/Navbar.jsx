import { Link } from 'react-router-dom';
import { ShoppingBag, User, Utensils, Package, Bike } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';

export default function Navbar() {
    const { count } = useCart();

    return (
        <nav className="navbar glass-panel">
            <div className="nav-container">
                <Link to="/" className="nav-logo">
                    <Utensils size={28} />
                    Roop<span>Food</span>
                </Link>

                <div className="nav-actions">
                    <Link to="/my-orders" className="btn btn-outline btn-icon" title="My Orders">
                        <Package size={20} />
                    </Link>

                    <Link to="/delivery/login" className="btn btn-outline btn-icon" title="Delivery Login">
                        <Bike size={20} />
                    </Link>

                    <Link to="/admin" className="btn btn-outline btn-icon" title="Admin">
                        <User size={20} />
                    </Link>

                    <Link to="/cart" className="btn btn-primary cart-btn">
                        <ShoppingBag size={20} />
                        <span>Cart</span>
                        {count > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="cart-badge"
                            >
                                {count}
                            </motion.span>
                        )}
                    </Link>
                </div>
            </div>
        </nav>
    );
}
