import { useState, useEffect } from 'react';
import ItemCard from './ItemCard';

export default function MenuGrid() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/items')
            .then(async res => {
                const contentType = res.headers.get('content-type');
                if (!res.ok) {
                    const errorText = await res.text();
                    let errorData;
                    try { errorData = JSON.parse(errorText); } catch (e) { }
                    throw new Error(errorData?.error || `Server returned ${res.status}: ${errorText.substring(0, 100)}`);
                }
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await res.text();
                    throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}`);
                }
                return res.json();
            })
            .then(data => {
                setItems(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching items:', err);
                setError(err.message);
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
                    {items.map((item, idx) => (
                        <ItemCard key={item.id} item={item} index={idx} />
                    ))}
                </div>
            )}
        </section>
    );
}
