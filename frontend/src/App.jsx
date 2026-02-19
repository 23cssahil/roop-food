import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Reviews from './pages/Reviews';
import './App.css';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const PageWrapper = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.2 }}
    style={{ minHeight: '100%' }}
  >
    {children}
  </motion.div>
);

function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="cart" element={<PageWrapper><Cart /></PageWrapper>} />
          <Route path="checkout" element={<PageWrapper><Checkout /></PageWrapper>} />
          <Route path="reviews" element={<PageWrapper><Reviews /></PageWrapper>} />
          <Route path="admin" element={<PageWrapper><AdminLogin /></PageWrapper>} />
          <Route path="admin/dashboard" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
