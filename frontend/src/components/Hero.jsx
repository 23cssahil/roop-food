import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
    return (
        <section className="hero">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-4 px-4 py-1 bg-white rounded-full shadow-sm text-primary font-bold text-sm"
            >
                <Sparkles size={16} /> Premium Dining Experience
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="hero-title"
            >
                Roops Food,<br />
                <span className="text-primary">Delivered Magic.</span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="hero-subtitle"
            >
                Experience gourmet local flavors delivered with care. Your premium selection is just a click away.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-4"
            >
                <button
                    className="btn btn-primary"
                    onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}
                >
                    Explore Menu <ArrowRight size={20} />
                </button>

                <Link to="/reviews" className="btn btn-outline bg-white flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all text-light hover:text-primary border border-slate-200 shadow-sm">
                    <MessageSquare size={18} /> Reviews
                </Link>
            </motion.div>
        </section>
    );
}

