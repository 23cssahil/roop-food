import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowLeft, MessageSquare, Quote, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/feedback')
            .then(res => res.json())
            .then(data => {
                setReviews(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="cart-page">
            <div className="container px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                            Guest <span className="text-primary">Reviews</span>
                        </h2>
                        <p className="text-light text-lg">See what our community loves about Roops Food.</p>
                    </motion.div>

                    <Link to="/" className="btn btn-outline">
                        <ArrowLeft size={18} /> Back to Menu
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="glass-panel p-8 rounded-[32px] h-64 animate-pulse bg-white/50" />
                        ))}
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-20 glass-panel rounded-[40px]">
                        <MessageSquare size={64} className="mx-auto text-slate-200 mb-6" />
                        <h3 className="text-2xl font-bold mb-2">No reviews yet</h3>
                        <p className="text-light mb-8">Be the first to share your gourmet experience!</p>
                        <Link to="/" className="btn btn-primary">Order Now</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 w-full max-w-2xl mx-auto">
                        {reviews.map((review, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-panel p-8 rounded-[32px] relative group hover:shadow-xl transition-all duration-300 border border-white min-w-0 w-full"
                            >
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            size={16}
                                            className={i < review.rating ? "text-amber-400" : "text-slate-200"}
                                            fill={i < review.rating ? "currentColor" : "none"}
                                        />
                                    ))}
                                </div>

                                <p className="text-slate-700 font-medium leading-relaxed italic mb-8 min-h-[60px] whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                    "{review.comment}"
                                </p>

                                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                                        {review.customer_name?.[0] || 'G'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 text-sm">{review.customer_name || 'Anonymous'}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-light uppercase tracking-tighter font-bold">
                                            <Calendar size={10} /> {new Date(review.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
