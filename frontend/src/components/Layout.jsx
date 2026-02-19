import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="app-layout">
            <Navbar />
            <div className="main-content">
                <Outlet />
            </div>
            <footer className="app-footer">
                <div className="container">
                    <span className="footer-logo">Roop<span>Food</span></span>
                    <p>&copy; {new Date().getFullYear()} Gourmet QR App. Crafted for Culinary Excellence.</p>
                </div>
            </footer>
        </div>
    );
}

