import { useState, useEffect } from 'react';
import ItemCard from './ItemCard';
import { ArrowDown } from 'lucide-react';

const ITEMS_PER_PAGE = 8; // 2 rows of 4 on desktop

export default function MenuGrid() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAll, setShowAll] = useState(false);

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

    const displayedItems = showAll ? items : items.slice(0, ITEMS_PER_PAGE);
    const hasMore = items.length > ITEMS_PER_PAGE;

    return (
        <section id="menu" className="container section-spacing">
            <h2 className="section-title">
                Our <span className="text-primary">Menu</span>
            </h2>

            {items.length === 0 ? (
                <p className="text-center">No items found.</p>
            ) : (
                <>
                    <div className="menu-grid">
                        {displayedItems.map(item => (
                            <ItemCard key={item.id} item={item} />
                        ))}
                    </div>

                    {hasMore && !showAll && (
                        <div className="flex justify-center mt-10">
                            <button
                                className="btn btn-outline flex items-center gap-2 hover:border-primary hover:text-primary"
                                onClick={() => setShowAll(true)}
                            >
                                <ArrowDown size={18} />
                                View All {items.length} Items
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
