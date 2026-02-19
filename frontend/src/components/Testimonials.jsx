import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageCircle, Quote } from 'lucide-react';

export default function Testimonials() {
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

    if (!loading && reviews.length === 0) return null;

    return (
        <section className="py-24 px-4 bg-slate-50/50">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-16 px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">What Our Guests Say</h2>
                        <p className="text-light max-w-2xl mx-auto text-lg leading-relaxed">
                            Join thousands of happy food lovers who have shared their gourmet experience with us.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="glass-panel p-8 rounded-[40px] h-64 animate-pulse bg-white/50" />
                        ))
                    ) : (
                        reviews.map((review, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="glass-panel p-8 rounded-[40px] relative group hover:shadow-2xl transition-all duration-500 border border-white"
                            >
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary transform rotate-12 group-hover:rotate-0 transition-transform">
                                    <Quote size={24} fill="currentColor" />
                                </div>

                                <div className="flex gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            size={18}
                                            className={i < review.rating ? "text-amber-400" : "text-slate-200"}
                                            fill={i < review.rating ? "currentColor" : "none"}
                                        />
                                    ))}
                                </div>

                                <p className="text-slate-700 font-medium text-lg leading-relaxed italic mb-8 min-h-[80px]">
                                    "{review.comment || 'An absolute delight! The flavors were exceptional and the service was perfect.'}"
                                </p>

                                <div className="flex items-center gap-4 pt-6 border-t border-slate-100/50">
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">
                                        {review.customer_name?.[0] || 'G'}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 tracking-tight">{review.customer_name || 'Anonymous Guest'}</h4>
                                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                            <ShieldCheck size={12} className="text-green-500" /> Verified Guest
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

function ShieldCheck({ size, className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
