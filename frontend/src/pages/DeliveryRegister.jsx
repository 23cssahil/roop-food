import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bike, UserPlus } from 'lucide-react';

export default function DeliveryRegister() {
    const [form, setForm] = useState({
        full_name: '', phone: '', aadhar: '', address: '', username: '', password: '', confirm_password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm_password) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/delivery/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: form.full_name,
                    phone: form.phone,
                    aadhar: form.aadhar,
                    address: form.address,
                    username: form.username,
                    password: form.password
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch {
            setError('Server error. Try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="pt-32 pb-20 container flex items-center justify-center min-h-screen">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="glass-panel p-12 rounded-[40px] max-w-md text-center">
                    <div className="text-6xl mb-6">⏳</div>
                    <h2 className="text-3xl font-black mb-4">Registration Successful!</h2>
                    <p className="text-light mb-6">Your account is <span className="text-orange-500 font-bold">Pending Approval</span>. The Super Admin will review and approve your account shortly.</p>
                    <Link to="/delivery/login" className="btn btn-primary">Go to Login</Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="pt-32 pb-20 container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-10 rounded-[40px] w-full max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <Bike size={36} />
                    </div>
                    <h2 className="text-3xl font-black">Delivery Partner <span className="text-primary">Registration</span></h2>
                    <p className="text-light mt-2">Fill in your details to join our delivery team</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input name="full_name" type="text" className="input" required value={form.full_name}
                                onChange={handleChange} placeholder="Your full name" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone Number *</label>
                            <input name="phone" type="tel" className="input" required value={form.phone}
                                onChange={handleChange} placeholder="10-digit mobile number" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Aadhar Card Number</label>
                            <input name="aadhar" type="text" className="input" value={form.aadhar}
                                onChange={handleChange} placeholder="12-digit Aadhar number" maxLength={12} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Username *</label>
                            <input name="username" type="text" className="input" required value={form.username}
                                onChange={handleChange} placeholder="Choose a username" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Full Address</label>
                        <textarea name="address" className="input min-h-[80px]" value={form.address}
                            onChange={handleChange} placeholder="Your full residential address" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <input name="password" type="password" className="input" required value={form.password}
                                onChange={handleChange} placeholder="Create a password" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password *</label>
                            <input name="confirm_password" type="password" className="input" required value={form.confirm_password}
                                onChange={handleChange} placeholder="Repeat your password" />
                        </div>
                    </div>

                    {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">{error}</div>}

                    <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 text-lg">
                        <UserPlus size={20} /> {loading ? 'Registering...' : 'Submit Registration'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-light">Already registered? <Link to="/delivery/login" className="text-primary font-bold hover:underline">Login here</Link></p>
                </div>
            </motion.div>
        </div>
    );
}
