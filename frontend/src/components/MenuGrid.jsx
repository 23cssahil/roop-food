import { useState, useEffect } from 'react';
import ItemCard from './ItemCard';

export default function MenuGrid() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/items')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch items');
                return res.json();
            })
            .then(data => {
                setItems(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching items:', err);
                setError('Could not load menu. Please make sure the backend is running.');
                setLoading(false);
            });
    }, []);

    if (loading) return <div id="menu" className="text-center p-8">Loading delicious menu...</div>;

    if (error) return (
        <div className="text-center p-8 text-red-500">
            <p>{error}</p>
            <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Retry</button>
        </div>
    );

    return (
        <section id="menu" className="container section-spacing">
            <h2 className="section-title">
                Our <span className="text-primary">Menu</span>
            </h2>

            {items.length === 0 ? (
                <p className="text-center">No items found.</p>
            ) : (
                <div className="menu-grid">
                    {items.map(item => (
                        <ItemCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </section>
    );
}
