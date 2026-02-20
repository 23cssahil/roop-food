-- ===================================================
-- Roop Food App — Full Database Schema
-- ===================================================

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    order_type VARCHAR(20) DEFAULT 'dine_in',
    verification_pin VARCHAR(10),
    pin_attempts INT DEFAULT 0,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    landmark TEXT,
    payment_status VARCHAR(30) DEFAULT 'unpaid',
    payment_id VARCHAR(255),
    delivery_boy_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_approved TINYINT DEFAULT 0,
    is_super TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    customer_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_boys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    aadhar VARCHAR(20),
    address TEXT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    socket_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    delivery_boy_id INT,
    delivery_boy_name VARCHAR(255),
    attempts INT DEFAULT 3,
    resolved TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    delivery_boy_id INT NOT NULL,
    subscription JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_delivery_boy (delivery_boy_id)
);

-- Sample Menu Items
INSERT IGNORE INTO items (id, name, price, image_url, description) VALUES
(1, 'Cheeseburger', 199.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=60', 'Juicy beef patty with melted cheese, lettuce & tomato'),
(2, 'Pepperoni Pizza', 349.00, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=500&q=60', 'Crispy thin crust with spicy pepperoni & mozzarella'),
(3, 'Caesar Salad', 149.00, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=60', 'Fresh romaine lettuce with creamy Caesar dressing'),
(4, 'Spaghetti Carbonara', 299.00, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=500&q=60', 'Classic Italian pasta with eggs, cheese & pancetta');
