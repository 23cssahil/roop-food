import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bike, LogIn } from 'lucide-react';

export default function DeliveryLogin() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/delivery/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('deliveryBoy', JSON.stringify(data.deliveryBoy));
                navigate('/delivery/dashboard');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (e) {
            setError('Server error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pt-32 pb-20 container flex items-center justify-center min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-10 rounded-[40px] w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <Bike size={36} />
                    </div>
                    <h2 className="text-3xl font-black">Delivery <span className="text-primary">Login</span></h2>
                    <p className="text-light mt-2">Sign in to your delivery account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input type="text" className="input" required value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                            placeholder="Your delivery username" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="input" required value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••" />
                    </div>
                    {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">{error}</div>}
                    <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 text-lg">
                        <LogIn size={20} /> {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-3">
                    <p className="text-sm text-light">New delivery partner?</p>
                    <Link to="/delivery/register" className="btn btn-outline w-full">Register as Delivery Boy</Link>
                    <Link to="/admin" className="text-xs text-light hover:text-primary block">Admin Login →</Link>
                </div>
            </motion.div>
        </div>
    );
}
