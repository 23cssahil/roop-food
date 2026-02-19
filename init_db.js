const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "S@hilkh@nmysql83183",
    database: process.env.DB_NAME || "qr_food",
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) {
        console.error("Connection failed:", err);
        process.exit(1);
    }
    console.log("MySQL Connected");

    const queries = [
        `CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE,
            password VARCHAR(255)
        )`,
        `CREATE TABLE IF NOT EXISTS items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            price DECIMAL(10,2),
            image_url TEXT,
            description TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(255),
            phone VARCHAR(20),
            total DECIMAL(10,2),
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT,
            item_name VARCHAR(255),
            price DECIMAL(10,2),
            qty INT,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT,
            customer_name VARCHAR(255),
            rating INT,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )`
    ];

    let completed = 0;
    queries.forEach(q => {
        db.query(q, (err) => {
            if (err) console.error("Error executing query:", q, err);
            completed++;
            if (completed === queries.length) {
                console.log("Database initialized successfully");
                db.end();
            }
        });
    });
});
