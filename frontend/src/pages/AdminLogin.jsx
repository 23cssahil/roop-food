import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLogin() {
    const [isSignup, setIsSignup] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        const endpoint = isSignup ? '/admin/signup' : '/admin/login';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                if (isSignup) {
                    setMessage('Account created! Step into your kitchen.');
                    setIsSignup(false);
                    setUsername('');
                    setPassword('');
                } else {
                    navigate('/admin/dashboard');
                }
            } else {
                setError(data.error || data.message || 'Authentication failed');
            }
        } catch (err) {
            setError('Connection lost. Please try again.');
        }
    };

    return (
        <div className="login-container pt-40 px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-10 rounded-[40px] max-w-md mx-auto relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent"></div>

                <div className="w-16 h-16 bg-orange-100 rounded-[20px] flex items-center justify-center text-primary mx-auto mb-6 shadow-inner">
                    <ShieldCheck size={32} />
                </div>

                <h2 className="text-3xl font-black mb-2 text-center">
                    {isSignup ? 'Create Access' : 'Backoffice Access'}
                </h2>
                <p className="text-light text-center mb-10 text-sm">
                    {isSignup ? "Start managing your gourmet digital storefront." : "Secure entry for authorized personnel only."}
                </p>

                {message && <p className="p-4 bg-green-50 text-secondary text-sm font-bold rounded-2xl mb-6 text-center border border-green-100">{message}</p>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="form-group text-left">
                        <label className="form-label">Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                className="input pl-12"
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter username"
                            />
                        </div>
                    </div>

                    <div className="form-group text-left">
                        <label className="form-label">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                className="input pl-12"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && <p className="p-4 bg-red-50 text-red-500 text-sm font-bold rounded-2xl text-center border border-red-100">{error}</p>}

                    <button type="submit" className="btn btn-primary w-full py-4 text-lg shadow-xl">
                        {isSignup ? 'Grant Permission' : 'Enter Terminal'} <ArrowRight size={20} className="ml-2" />
                    </button>

                    <p className="pt-6 text-center text-sm font-medium text-light border-t border-slate-100">
                        {isSignup ? 'Back to' : 'New station?'}
                        <button
                            type="button"
                            className="text-primary font-black ml-2 hover:underline"
                            onClick={() => {
                                setIsSignup(!isSignup);
                                setError(null);
                                setMessage(null);
                            }}
                        >
                            {isSignup ? 'Staff Login' : 'Request Access'}
                        </button>
                    </p>
                </form>
            </motion.div>
        </div>
    );
}
