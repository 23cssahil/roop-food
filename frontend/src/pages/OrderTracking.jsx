import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Phone, ArrowLeft, Bike } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderTracking() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [userLocation, setUserLocation] = useState(null);
    const [distance, setDistance] = useState(null);

    const order = state?.order;

    useEffect(() => {
        if (!order) { navigate('/delivery-dashboard'); return; }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                if (order.lat && order.lng) {
                    const d = calculateDistance(loc.lat, loc.lng, order.lat, order.lng);
                    setDistance(d);
                }
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [order]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    if (!order) return null;

    return (
        <div className="pt-32 pb-20 container max-w-lg">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary font-bold mb-6">
                <ArrowLeft size={20} /> Back to Dashboard
            </button>

            <div className="glass-panel p-8 rounded-[32px] space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-primary">
                        <Bike size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Live Tracking</h2>
                        <p className="text-light">Order #{order.id}</p>
                    </div>
                </div>

                <div className="relative h-48 bg-slate-50 rounded-[24px] overflow-hidden flex items-center justify-center">
                    {/* Visual Line Representation */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                        <div className="w-full h-[1px] bg-primary border-dashed border-b-2"></div>
                    </div>

                    <div className="flex flex-col items-center gap-2 z-10">
                        <div className="w-16 h-16 bg-white shadow-xl rounded-full flex items-center justify-center text-primary animate-bounce">
                            <Navigation size={32} />
                        </div>
                        <p className="font-black text-xl">
                            {distance ? `${distance.toFixed(2)} km away` : 'Calculating...'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-light mb-1">Customer</p>
                        <p className="font-bold">{order.customer_name}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-light mb-1">Status</p>
                        <p className="font-bold text-orange-600">Active Delivery</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <a href={`tel:${order.phone}`} className="btn btn-outline w-full py-4 flex items-center justify-center gap-2">
                        <Phone size={20} /> Call Customer
                    </a>
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${order.lat},${order.lng}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary w-full py-4 flex items-center justify-center gap-2"
                    >
                        <MapPin size={20} /> Open Map Navigation
                    </a>
                </div>
            </div>
        </div>
    );
}
