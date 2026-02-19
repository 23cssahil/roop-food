import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Quote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomeReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/feedback')
            .then(res => res.json())
            .then(data => {
                // Show latest 3 reviews on home page
                setReviews(data.slice(0, 3));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (!loading && reviews.length === 0) return null;

    return (
        <section className="container py-20 border-t border-slate-100">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-2">
                        Guest <span className="text-primary">Love</span>
                    </h2>
                    <p className="text-light text-lg">Real stories from our gourmet community.</p>
                </div>
                <Link to="/reviews" className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
                    View All Reviews <ArrowRight size={20} />
                </Link>
            </div>

            <div className="grid-safe gap-8">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="glass-panel p-8 rounded-[32px] h-64 animate-pulse bg-white/50" />
                    ))
                ) : (
                    reviews.map((review, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-panel p-8 rounded-[32px] relative flex flex-col h-full bg-white shadow-sm border border-slate-50"
                        >
                            <Quote size={40} className="absolute top-6 right-6 text-primary/5 -rotate-12" />

                            <div className="flex gap-1 mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={16}
                                        className={i < review.rating ? "text-amber-400" : "text-slate-100"}
                                        fill={i < review.rating ? "currentColor" : "none"}
                                    />
                                ))}
                            </div>

                            <p className="text-slate-700 font-medium leading-relaxed italic mb-8 flex-1" style={{ overflowWrap: 'break-word' }}>
                                "{review.comment || 'Amazing experience!'}"
                            </p>

                            <div className="flex items-center gap-3 pt-6 border-t border-slate-50">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black">
                                    {review.customer_name?.[0] || 'G'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm leading-none mb-1">{review.customer_name || 'Gourmet Guest'}</h4>
                                    <p className="text-[10px] text-light uppercase tracking-widest font-black">Verified Diner</p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </section>
    );
}
