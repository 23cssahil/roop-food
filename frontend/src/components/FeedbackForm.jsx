import { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackForm({ orderId, customerName, onComplete }) {
    const [rating, setRating] = useState(5);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/order/${orderId}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, comment, customer_name: customerName })
            });

            if (res.ok) {
                setSubmitted(true);
                setTimeout(() => onComplete(), 3000);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to submit feedback. Please try again.');
            }
        } catch (err) {
            console.error('Feedback failed:', err);
            setError('Connection error. Please check if the server is running.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center p-10 bg-green-50 rounded-[32px] border-2 border-green-100"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                    <CheckCircle2 size={64} className="text-secondary mx-auto mb-4" />
                </motion.div>
                <h3 className="text-secondary font-black text-2xl mb-2">You're Awesome!</h3>
                <p className="text-light">Your feedback makes us perform better. See you soon!</p>
            </motion.div>
        );
    }

    return (
        <div className="glass-panel p-8 rounded-[32px] max-w-md mx-auto mt-12 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent"></div>
            <h3 className="text-2xl font-black mb-2 text-center">Share Your Thoughts</h3>
            <p className="text-light text-center mb-8 text-sm">How was your gourmet experience today?</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            className="star-btn p-1 outline-none transform transition-transform hover:scale-125"
                        >
                            <Star
                                size={36}
                                fill={(hover || rating) >= star ? "#FFD700" : "none"}
                                color={(hover || rating) >= star ? "#FFD700" : "#E2E8F0"}
                                strokeWidth={(hover || rating) >= star ? 0 : 2}
                            />
                        </button>
                    ))}
                </div>

                <div className="form-group text-left">
                    <label className="form-label">Tell us more</label>
                    <textarea
                        className="input"
                        rows="3"
                        placeholder="What made your day? Or how can we improve?"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    ></textarea>
                </div>

                {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                <button
                    type="submit"
                    className="btn btn-primary w-full py-4 shadow-lg shadow-orange-200"
                    disabled={loading}
                >
                    {loading ? 'Sending Love...' : 'Submit Review'}
                </button>
            </form>
        </div>
    );
}
