const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "S@hilkh@nmysql83183",
    database: process.env.DB_NAME || "qr_food",
    port: process.env.DB_PORT || 3306
};

const connection = mysql.createConnection(dbConfig);

connection.connect(async (err) => {
    if (err) {
        console.warn("⚠️ Database seeding skipped: Connection failed. This is expected if you haven't set your Render Environment Variables yet.");
        console.warn("Details:", err.message);
        process.exit(0); // Don't fail the build
    }
    console.log("✅ Connected to database. Seeding data...");

    try {
        // 1. Create tables first (Insurance)
        const tables = [
            `CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY, 
                username VARCHAR(255) UNIQUE, 
                password VARCHAR(255),
                is_approved TINYINT DEFAULT 0,
                is_super TINYINT DEFAULT 0
            )`,
            `CREATE TABLE IF NOT EXISTS items (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2), image_url TEXT, description TEXT)`,
            `CREATE TABLE IF NOT EXISTS feedback (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, rating INT, comment TEXT, customer_name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, customer_name VARCHAR(255), phone VARCHAR(20), total DECIMAL(10,2), status VARCHAR(50) DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, item_name VARCHAR(255), price DECIMAL(10,2), qty INT, FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE)`
        ];

        for (let sql of tables) {
            await connection.promise().query(sql);
        }

        // 1b. Migration: Add columns if table already existed without them
        const migrations = [
            ["admins", "is_approved", "TINYINT DEFAULT 0"],
            ["admins", "is_super", "TINYINT DEFAULT 0"],
            ["items", "description", "TEXT"]
        ];

        for (let [table, col, type] of migrations) {
            try {
                await connection.promise().query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
                console.log(`✅ Added ${col} column to ${table}`);
            } catch (e) { /* Ignore if already exists */ }
        }

        // 2. Add Initial Admin (Approved & Super) or Update if exists
        const hashedPassword = await bcrypt.hash("admin123", 10);
        await connection.promise().query(
            "INSERT INTO admins (username, password, is_approved, is_super) VALUES (?, ?, 1, 1) ON DUPLICATE KEY UPDATE is_approved = 1, is_super = 1",
            ["admin", hashedPassword]
        );
        console.log("✅ Admin 'admin' is now synchronized (Approved & Super).");

        // 3. Add Sample Items
        const sampleItems = [
            ["Margherita Pizza", 299, "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800", "Classic tomato and mozzarella"],
            ["Spicy Chicken Burger", 189, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800", "Zesty chicken with secret sauce"],
            ["Chocolate Lava Cake", 149, "https://images.unsplash.com/photo-1624353365286-3f8d62ffff51?w=800", "Warm oozing chocolate delight"],
            ["Gourmet Pasta", 249, "https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800", "Creamy alfredo with fresh herbs"]
        ];

        for (let item of sampleItems) {
            await connection.promise().query(
                "INSERT INTO items (name, price, image_url, description) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = ?)",
                [...item, item[0]]
            );
        }
        console.log("✅ Sample food items added.");

        // 4. Add Sample Feedback
        const sampleFeedback = [
            [1, 5, "The Margherita Pizza was incredible! Best I've had in years.", "Sahil Khan"],
            [2, 4, "Really loved the chicken burger. Proper gourmet quality.", "Sarah J."],
            [3, 5, "That lava cake is out of this world. Highly recommended!", "Amit P."]
        ];

        for (let fb of sampleFeedback) {
            await connection.promise().query(
                "INSERT INTO feedback (order_id, rating, comment, customer_name) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM feedback WHERE comment = ?)",
                [...fb, fb[2]]
            );
        }
        console.log("✅ Sample feedback added.");

        console.log("\n🚀 Seeding Complete! Your app should now show items and allow login.");
        process.exit(0);

    } catch (error) {
        console.warn("⚠️ Seeding failed midway:", error.message);
        process.exit(0); // Still don't fail the build
    }
});
