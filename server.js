try {
    require('dotenv').config();
} catch (e) {
    console.log("dotenv not found, skipping (likely production environment)");
}

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const webpush = require("web-push");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const BUILD_ID = "2026-02-20-V01-FULL";
console.log("=======================================");
console.log(`🚀 APP STARTING... VERSION: ${BUILD_ID}`);
console.log("=======================================");

app.use(cors());
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || "adminsecret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" }
}));

// ================= RAZORPAY =================
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret"
});

// ================= WEB PUSH VAPID KEYS =================
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "UUxI4O8-FbRouAevSmBQ6co62groRr79VMW1qkIc";
try {
    webpush.setVapidDetails("mailto:admin@roopfood.com", VAPID_PUBLIC, VAPID_PRIVATE);
} catch (e) {
    console.warn("⚠️ VAPID keys invalid — push notifications disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env.");
}

// Push subscriptions stored in memory (use DB in production for persistence across restarts)
const pushSubscriptions = {};

// ================= MYSQL (Connection Pool) =================
let isDbConnected = false;
const dbConfig = {
    host: process.env.DB_HOST || "mysql.railway.internal",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "JAjNBoVYqqFqjZEVxHnnEaOwlFTKIsKS",
    database: process.env.DB_NAME || process.env.DB_DATABASE || "railway",
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 30000
};

const db = mysql.createPool(dbConfig);

db.getConnection((err, connection) => {
    if (err) {
        isDbConnected = false;
        console.error("❌ Database connection failed!", err.message);
    } else {
        isDbConnected = true;
        console.log("✅ MySQL Pool connected successfully!");
        connection.release();
        runMigrations();
    }
});

// Keep-alive
setInterval(() => {
    db.query('SELECT 1', (err) => {
        isDbConnected = !err;
    });
}, 5 * 60 * 1000);

// ================= MIGRATIONS =================
function runMigrations() {
    console.log("🛠️ Running database migrations...");

    const tableQueries = [
        `CREATE TABLE IF NOT EXISTS items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            image_url TEXT,
            description TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
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
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            item_name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            qty INT NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            is_approved TINYINT DEFAULT 0,
            is_super TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            customer_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS delivery_boys (
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
        )`,
        `CREATE TABLE IF NOT EXISTS fraud_alerts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT,
            delivery_boy_id INT,
            delivery_boy_name VARCHAR(255),
            attempts INT DEFAULT 3,
            resolved TINYINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            delivery_boy_id INT NOT NULL,
            subscription JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_delivery_boy (delivery_boy_id)
        )`
    ];

    tableQueries.forEach(sql => {
        db.query(sql, (err) => {
            if (err) console.error("Table Error:", err.message);
        });
    });

    // Alter existing orders columns (safe for existing data)
    const alterQueries = [
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'dine_in'",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS verification_pin VARCHAR(10)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS pin_attempts INT DEFAULT 0",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS lat DECIMAL(10,7)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS lng DECIMAL(10,7)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS landmark TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'unpaid'",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_boy_id INT"
    ];

    alterQueries.forEach(sql => {
        db.query(sql, (err) => {
            if (err && !err.message.includes("Duplicate column")) {
                // Ignore "column already exists"
            }
        });
    });

    // Sync super admin
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    db.query(
        "INSERT INTO admins (username, password, is_approved, is_super) VALUES (?, ?, 1, 1) ON DUPLICATE KEY UPDATE is_approved=1, is_super=1",
        ["admin", hashedPassword],
        (err) => {
            if (err) console.error("❌ Super admin sync failed:", err.message);
            else console.log("✅ Super Admin synced.");
        }
    );
}

// ================= SOCKET.IO =================
const connectedDeliveryBoys = {};
const superAdminSockets = [];

io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("register_delivery_boy", (deliveryBoyId) => {
        connectedDeliveryBoys[deliveryBoyId] = socket.id;
        db.query("UPDATE delivery_boys SET socket_id=? WHERE id=?", [socket.id, deliveryBoyId]);
        socket.join("delivery_boys");
        console.log(`📦 Delivery Boy ${deliveryBoyId} registered with socket ${socket.id}`);
    });

    socket.on("register_admin", (isSuper) => {
        socket.join("admins");
        if (isSuper) socket.join("super_admins");
        console.log(`👑 Admin registered. Super: ${isSuper}`);
    });

    socket.on("disconnect", () => {
        for (const [id, sid] of Object.entries(connectedDeliveryBoys)) {
            if (sid === socket.id) {
                delete connectedDeliveryBoys[id];
                db.query("UPDATE delivery_boys SET socket_id=NULL WHERE id=?", [id]);
                break;
            }
        }
        console.log("🔌 Socket disconnected:", socket.id);
    });
});

// ================= HELPER =================
function generatePin() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

// ================= AUTH MIDDLEWARE =================
function checkAdmin(req, res, next) {
    if (req.session.admin) return next();
    res.status(401).json({ error: "Admin login required" });
}

function checkSuperAdmin(req, res, next) {
    if (req.session.admin && req.session.admin.is_super) return next();
    res.status(403).json({ error: "Super Admin access required" });
}

function checkDeliveryBoy(req, res, next) {
    if (req.session.deliveryBoy) return next();
    res.status(401).json({ error: "Delivery boy login required" });
}

// ================= HEALTH CHECK =================
app.get("/api/health-check", (req, res) => {
    if (!isDbConnected) return res.json({ status: "disconnected" });
    db.query("SELECT 1", (err) => {
        if (err) return res.status(500).json({ status: "error", message: err.message });
        res.json({ status: "ok" });
    });
});

app.get("/api/vapid-public-key", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC });
});

// ================= ADMIN AUTH =================
app.post("/admin/signup", async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.query("INSERT INTO admins (username, password) VALUES (?,?)", [username, hashed], (err) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Username exists" });
                return res.status(500).json({ error: "Signup failed" });
            }
            res.json({ success: true });
        });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM admins WHERE username=?", [username], async (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!results || results.length === 0) return res.json({ success: false, message: "Invalid credentials" });
        const admin = results[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) return res.json({ success: false, message: "Invalid credentials" });
        if (admin.is_approved === 0) return res.json({ success: false, message: "Account pending approval" });
        req.session.admin = { id: admin.id, username: admin.username, is_super: admin.is_super };
        res.json({ success: true, user: { id: admin.id, username: admin.username, is_super: admin.is_super } });
    });
});

app.post("/admin/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ================= ITEMS =================
app.get("/api/items", (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "DB not connected" });
    db.query("SELECT * FROM items ORDER BY id ASC", (e, r) => {
        if (e) return res.status(500).json({ error: "DB query failed" });
        res.json(r || []);
    });
});

app.post("/admin/add-item", checkSuperAdmin, (req, res) => {
    const { name, price, image_url, description } = req.body;
    db.query("INSERT INTO items (name,price,image_url,description) VALUES (?,?,?,?)",
        [name, price, image_url, description || ''],
        (e) => { if (e) return res.status(500).json({ error: e.message }); res.json({ success: true }); }
    );
});

app.put("/admin/update-item/:id", checkSuperAdmin, (req, res) => {
    const { name, price, image_url, description } = req.body;
    db.query("UPDATE items SET name=?,price=?,image_url=?,description=? WHERE id=?",
        [name, price, image_url, description || '', req.params.id],
        () => res.json({ success: true })
    );
});

app.delete("/admin/delete-item/:id", checkSuperAdmin, (req, res) => {
    db.query("DELETE FROM items WHERE id=?", [req.params.id], () => res.json({ success: true }));
});

// ================= PAYMENT (RAZORPAY) =================
app.post("/api/create-payment", async (req, res) => {
    const { amount } = req.body; // in paise (rupees * 100)
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    try {
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `order_${Date.now()}`
        });
        res.json({ success: true, orderId: order.id, amount: order.amount });
    } catch (e) {
        console.error("Razorpay Error:", e.message);
        res.status(500).json({ error: "Payment creation failed. Check Razorpay keys." });
    }
});

app.post("/api/verify-payment", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    try {
        const expectedSig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_secret")
            .update(body).digest("hex");
        if (expectedSig === razorpay_signature) {
            res.json({ success: true, payment_id: razorpay_payment_id });
        } else {
            res.status(400).json({ success: false, error: "Payment verification failed" });
        }
    } catch (e) {
        res.status(500).json({ error: "Signature check failed" });
    }
});

// ================= PLACE ORDER (After Payment or Dine-in) =================
app.post("/api/order", (req, res) => {
    const { customer_name, phone, items, total, order_type, lat, lng, landmark, payment_status, payment_id } = req.body;
    if (!customer_name || !phone || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing required order fields" });
    }

    const pin = generatePin();
    const type = order_type || "dine_in";
    const payStatus = payment_status || (type === "dine_in" ? "cash" : "unpaid");

    db.query(
        "INSERT INTO orders (customer_name, phone, total, order_type, verification_pin, lat, lng, landmark, payment_status, payment_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [customer_name, phone, total, type, pin, lat || null, lng || null, landmark || null, payStatus, payment_id || null],
        (err, result) => {
            if (err) {
                console.error("Order insert failed:", err);
                return res.status(500).json({ error: "Order failed" });
            }
            const orderId = result.insertId;
            let processed = 0;

            if (items.length === 0) {
                emitNewOrder(orderId, customer_name, phone, items, total, type, lat, lng, landmark, pin);
                return res.json({ success: true, orderId, pin });
            }

            items.forEach(i => {
                db.query("INSERT INTO order_items (order_id, item_name, price, qty) VALUES (?,?,?,?)",
                    [orderId, i.name, i.price, i.qty],
                    (itemErr) => {
                        if (itemErr) console.error("Item insert failed:", itemErr);
                        processed++;
                        if (processed === items.length) {
                            emitNewOrder(orderId, customer_name, phone, items, total, type, lat, lng, landmark, pin);
                            res.json({ success: true, orderId, pin });
                        }
                    }
                );
            });
        }
    );
});

function emitNewOrder(orderId, customer_name, phone, items, total, type, lat, lng, landmark, pin) {
    const orderData = { orderId, customer_name, phone, items, total, order_type: type, lat, lng, landmark, pin };
    io.to("admins").emit("new_order", orderData);
    if (type === "delivery") {
        io.to("delivery_boys").emit("new_order", orderData);
        // Send push notifications to all delivery boys
        sendPushToAllDeliveryBoys({
            title: "🛵 New Delivery Order!",
            body: `Order #${orderId} from ${customer_name} — ₹${total}`,
            data: { orderId }
        });
    }
}

// ================= CUSTOMER: MY ORDERS =================
app.get("/api/my-orders/:phone", (req, res) => {
    const phone = req.params.phone;
    const sql = `
        SELECT o.id, o.customer_name, o.total, o.status, o.order_type, o.verification_pin,
               o.created_at, o.lat, o.lng, o.landmark, o.payment_status,
               GROUP_CONCAT(CONCAT(oi.item_name, ' x', oi.qty) SEPARATOR ', ') as items_summary
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.phone = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;
    db.query(sql, [phone], (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(results || []);
    });
});

// ================= ORDER STATUS =================
app.get("/admin/orders", checkAdmin, (req, res) => {
    const sql = `
        SELECT o.*, oi.item_name, oi.qty,
               db.full_name as delivery_boy_name
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN delivery_boys db ON o.delivery_boy_id = db.id
        ORDER BY o.id DESC
    `;
    db.query(sql, (e, r) => res.json(r || []));
});

app.put("/admin/order-done/:id", checkAdmin, (req, res) => {
    db.query("UPDATE orders SET status='Completed' WHERE id=?", [req.params.id], () => {
        io.to("admins").emit("order_status_update", { orderId: req.params.id, status: "Completed" });
        res.json({ success: true });
    });
});

app.put("/admin/order-out-for-delivery/:id", checkAdmin, (req, res) => {
    db.query("UPDATE orders SET status='Out for Delivery' WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Update failed" });
        io.to("admins").emit("order_status_update", { orderId: parseInt(req.params.id), status: "Out for Delivery" });
        io.to("delivery_boys").emit("order_status_update", { orderId: parseInt(req.params.id), status: "Out for Delivery" });
        res.json({ success: true });
    });
});

// ================= PIN VERIFICATION =================
app.post("/admin/verify-pin", checkAdmin, (req, res) => {
    const { order_id, pin, delivery_boy_id, delivery_boy_name } = req.body;
    db.query("SELECT verification_pin, pin_attempts, status FROM orders WHERE id=?", [order_id], (err, results) => {
        if (err || !results.length) return res.status(404).json({ error: "Order not found" });
        const order = results[0];

        if (order.status === "Completed" || order.status === "Delivered") {
            return res.json({ success: false, message: "Order already completed." });
        }

        if (order.pin_attempts >= 3) {
            return res.json({ success: false, message: "Order locked due to too many failed attempts. Fraud alert sent." });
        }

        if (order.verification_pin === String(pin)) {
            db.query("UPDATE orders SET status='Delivered', pin_attempts=0 WHERE id=?", [order_id], () => {
                io.to("admins").emit("order_status_update", { orderId: order_id, status: "Delivered" });
                res.json({ success: true, message: "PIN verified! Order marked as Delivered." });
            });
        } else {
            const newAttempts = (order.pin_attempts || 0) + 1;
            db.query("UPDATE orders SET pin_attempts=? WHERE id=?", [newAttempts, order_id], () => {
                if (newAttempts >= 3) {
                    // Fraud alert
                    db.query("INSERT INTO fraud_alerts (order_id, delivery_boy_id, delivery_boy_name, attempts) VALUES (?,?,?,3)",
                        [order_id, delivery_boy_id || null, delivery_boy_name || "Unknown Admin"],
                        () => {
                            io.to("super_admins").emit("fraud_alert", {
                                order_id, delivery_boy_id, delivery_boy_name,
                                message: `🚨 FRAUD ALERT: 3 wrong PINs for Order #${order_id}`
                            });
                        }
                    );
                    return res.json({ success: false, message: "Order locked! Fraud alert sent to Super Admin.", locked: true });
                }
                res.json({ success: false, message: `Wrong PIN. ${3 - newAttempts} attempt(s) remaining.`, attempts: newAttempts });
            });
        }
    });
});

// ================= DELIVERY BOY AUTH =================
app.post("/delivery/register", async (req, res) => {
    const { full_name, phone, aadhar, address, username, password } = req.body;
    if (!full_name || !phone || !username || !password) {
        return res.status(400).json({ error: "All required fields must be filled" });
    }
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO delivery_boys (full_name, phone, aadhar, address, username, password) VALUES (?,?,?,?,?,?)",
            [full_name, phone, aadhar || '', address || '', username, hashed],
            (err) => {
                if (err) {
                    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ error: "Username already taken" });
                    return res.status(500).json({ error: "Registration failed" });
                }
                res.json({ success: true, message: "Registration successful. Await Super Admin approval." });
            }
        );
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/delivery/login", (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM delivery_boys WHERE username=?", [username], async (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!results || results.length === 0) return res.json({ success: false, message: "Invalid credentials" });
        const boy = results[0];
        const match = await bcrypt.compare(password, boy.password);
        if (!match) return res.json({ success: false, message: "Invalid credentials" });
        if (boy.status === "pending") return res.json({ success: false, message: "Account pending Super Admin approval." });
        if (boy.status === "rejected") return res.json({ success: false, message: "Account rejected. Contact admin." });
        req.session.deliveryBoy = { id: boy.id, username: boy.username, full_name: boy.full_name };
        res.json({ success: true, deliveryBoy: { id: boy.id, username: boy.username, full_name: boy.full_name } });
    });
});

app.post("/delivery/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ================= DELIVERY: ORDER POOL =================
app.get("/delivery/available-orders", checkDeliveryBoy, (req, res) => {
    const sql = `
        SELECT o.id, o.customer_name, o.total, o.landmark, o.created_at, o.status,
               GROUP_CONCAT(CONCAT(oi.item_name, ' x', oi.qty) SEPARATOR ', ') as items_summary
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.order_type = 'delivery' AND o.status = 'Pending' AND o.delivery_boy_id IS NULL
        GROUP BY o.id
        ORDER BY o.created_at ASC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(results || []);
    });
});

app.get("/delivery/my-orders", checkDeliveryBoy, (req, res) => {
    const boyId = req.session.deliveryBoy.id;
    const sql = `
        SELECT o.id, o.customer_name, o.phone, o.total, o.status, o.lat, o.lng, o.landmark,
               o.verification_pin, o.pin_attempts, o.created_at,
               GROUP_CONCAT(CONCAT(oi.item_name, ' x', oi.qty) SEPARATOR ', ') as items_summary
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.delivery_boy_id = ? AND o.status != 'Delivered'
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;
    db.query(sql, [boyId], (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(results || []);
    });
});

// CONCURRENCY-SAFE ORDER CLAIMING
app.post("/delivery/take-order/:id", checkDeliveryBoy, (req, res) => {
    const orderId = req.params.id;
    const boyId = req.session.deliveryBoy.id;

    // Check active order limit (max 2)
    db.query(
        "SELECT COUNT(*) as cnt FROM orders WHERE delivery_boy_id=? AND status NOT IN ('Delivered','Completed')",
        [boyId],
        (err, results) => {
            if (err) return res.status(500).json({ error: "DB error" });
            if (results[0].cnt >= 2) {
                return res.status(429).json({ error: "You can only handle 2 active orders at a time. Complete your current orders first." });
            }

            // Atomic update — only succeeds if order is still unassigned
            db.query(
                "UPDATE orders SET delivery_boy_id=?, status='Assigned' WHERE id=? AND delivery_boy_id IS NULL AND status='Pending'",
                [boyId, orderId],
                (updateErr, result) => {
                    if (updateErr) return res.status(500).json({ error: "DB error" });
                    if (result.affectedRows === 0) {
                        return res.status(409).json({ error: "Sorry, this order was already taken by someone else." });
                    }
                    // Broadcast to all delivery boys — remove from pool
                    io.to("delivery_boys").emit("order_taken", { orderId: parseInt(orderId), takenBy: boyId });
                    io.to("admins").emit("order_status_update", { orderId: parseInt(orderId), status: "Assigned" });
                    res.json({ success: true, message: "Order claimed successfully!" });
                }
            );
        }
    );
});

app.post("/delivery/verify-pin", checkDeliveryBoy, (req, res) => {
    const { order_id, pin } = req.body;
    const boyId = req.session.deliveryBoy.id;
    const boyName = req.session.deliveryBoy.full_name;

    db.query("SELECT verification_pin, pin_attempts, delivery_boy_id, status FROM orders WHERE id=?", [order_id], (err, results) => {
        if (err || !results.length) return res.status(404).json({ error: "Order not found" });
        const order = results[0];

        if (order.delivery_boy_id !== boyId) return res.status(403).json({ error: "This order is not assigned to you." });
        if (order.status === "Delivered") return res.json({ success: false, message: "Already delivered." });
        if (order.pin_attempts >= 3) return res.json({ success: false, message: "Order locked. Fraud alert sent.", locked: true });

        if (String(order.verification_pin) === String(pin)) {
            db.query("UPDATE orders SET status='Delivered', pin_attempts=0 WHERE id=?", [order_id], () => {
                io.to("super_admins").emit("order_status_update", { orderId: order_id, status: "Delivered" });
                io.to("admins").emit("order_status_update", { orderId: order_id, status: "Delivered" });
                res.json({ success: true, message: "✅ PIN Verified! Order Delivered Successfully." });
            });
        } else {
            const attempts = (order.pin_attempts || 0) + 1;
            db.query("UPDATE orders SET pin_attempts=? WHERE id=?", [attempts, order_id], () => {
                if (attempts >= 3) {
                    db.query("INSERT INTO fraud_alerts (order_id, delivery_boy_id, delivery_boy_name, attempts) VALUES (?,?,?,3)",
                        [order_id, boyId, boyName], () => {
                            io.to("super_admins").emit("fraud_alert", {
                                order_id, delivery_boy_id: boyId, delivery_boy_name: boyName,
                                message: `🚨 FRAUD ALERT: Delivery Boy "${boyName}" entered wrong PIN 3 times for Order #${order_id}`
                            });
                        }
                    );
                    return res.json({ success: false, locked: true, message: "Order LOCKED! Fraud alert sent to Super Admin." });
                }
                res.json({ success: false, message: `Wrong PIN. ${3 - attempts} attempt(s) remaining.` });
            });
        }
    });
});

// ================= ADMIN: DELIVERY BOY MANAGEMENT =================
app.get("/admin/delivery-boys", checkSuperAdmin, (req, res) => {
    db.query("SELECT id, full_name, phone, aadhar, address, username, status, created_at FROM delivery_boys ORDER BY created_at DESC",
        (err, results) => {
            if (err) return res.status(500).json({ error: "DB error" });
            res.json(results || []);
        }
    );
});

app.put("/admin/delivery-boy/:id/approve", checkSuperAdmin, (req, res) => {
    db.query("UPDATE delivery_boys SET status='approved' WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Update failed" });
        io.to("delivery_boys").emit("delivery_boy_approved", { id: parseInt(req.params.id) });
        res.json({ success: true });
    });
});

app.put("/admin/delivery-boy/:id/reject", checkSuperAdmin, (req, res) => {
    db.query("UPDATE delivery_boys SET status='rejected' WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Update failed" });
        res.json({ success: true });
    });
});

app.delete("/admin/delivery-boy/:id", checkSuperAdmin, (req, res) => {
    db.query("DELETE FROM delivery_boys WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Delete failed" });
        res.json({ success: true });
    });
});

// ================= FRAUD ALERTS =================
app.get("/admin/fraud-alerts", checkSuperAdmin, (req, res) => {
    db.query("SELECT * FROM fraud_alerts ORDER BY created_at DESC", (err, r) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.json(r || []);
    });
});

app.put("/admin/fraud-alerts/:id/resolve", checkSuperAdmin, (req, res) => {
    db.query("UPDATE fraud_alerts SET resolved=1 WHERE id=?", [req.params.id], () => res.json({ success: true }));
});

// ================= STAFF MANAGEMENT =================
app.get("/admin/staff", checkSuperAdmin, (req, res) => {
    db.query("SELECT id, username, is_approved, is_super FROM admins ORDER BY id ASC", (e, r) => {
        if (e) return res.status(500).json({ error: "Failed" });
        res.json(r || []);
    });
});

app.put("/admin/approve-staff/:id", checkSuperAdmin, (req, res) => {
    db.query("UPDATE admins SET is_approved=1 WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Failed" });
        res.json({ success: true });
    });
});

app.delete("/admin/delete-staff/:id", checkSuperAdmin, (req, res) => {
    if (req.session.admin.id == req.params.id) return res.status(400).json({ error: "Cannot delete yourself" });
    db.query("DELETE FROM admins WHERE id=?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Failed" });
        res.json({ success: true });
    });
});

// ================= SALES =================
app.get("/admin/daily-sales", checkSuperAdmin, (req, res) => {
    const sql = `SELECT DATE_FORMAT(created_at,'%Y-%m-%d') as date, SUM(total) as revenue, COUNT(*) as orders
        FROM orders GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d') ORDER BY date DESC`;
    db.query(sql, (err, r) => {
        if (err) return res.status(500).json({ error: "Failed" });
        res.json(r);
    });
});

// ================= FEEDBACK =================
app.get("/api/feedback", (req, res) => {
    if (!isDbConnected) return res.status(503).json([]);
    db.query("SELECT * FROM feedback ORDER BY created_at DESC", (err, r) => {
        if (err) return res.status(500).json([]);
        res.json(r || []);
    });
});

app.post("/api/order/:orderId/feedback", (req, res) => {
    const { rating, comment, customer_name } = req.body;
    const { orderId } = req.params;
    if (!rating || !customer_name) return res.status(400).json({ error: "Rating and name required" });
    db.query("INSERT INTO feedback (order_id, rating, comment, customer_name) VALUES (?,?,?,?)",
        [orderId, rating, comment || '', customer_name],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Failed to save feedback" });
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.get("/admin/feedback", checkAdmin, (req, res) => {
    db.query("SELECT * FROM feedback ORDER BY created_at DESC", (e, r) => res.json(r || []));
});

// ================= PUSH NOTIFICATIONS =================
app.post("/api/push/subscribe", checkDeliveryBoy, (req, res) => {
    const { subscription } = req.body;
    const boyId = req.session.deliveryBoy.id;
    db.query(
        "INSERT INTO push_subscriptions (delivery_boy_id, subscription) VALUES (?,?) ON DUPLICATE KEY UPDATE subscription=VALUES(subscription)",
        [boyId, JSON.stringify(subscription)],
        (err) => {
            if (err) return res.status(500).json({ error: "Subscribe failed" });
            pushSubscriptions[boyId] = subscription;
            res.json({ success: true });
        }
    );
});

function sendPushToAllDeliveryBoys(payload) {
    db.query("SELECT delivery_boy_id, subscription FROM push_subscriptions", (err, rows) => {
        if (err || !rows) return;
        rows.forEach(row => {
            try {
                const sub = typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;
                webpush.sendNotification(sub, JSON.stringify(payload)).catch(e => {
                    if (e.statusCode === 410) {
                        db.query("DELETE FROM push_subscriptions WHERE delivery_boy_id=?", [row.delivery_boy_id]);
                    }
                });
            } catch (e) { /* ignore */ }
        });
    });
}

// ================= PRODUCTION SERVING =================
const distPath = path.join(__dirname, "frontend/dist");
const indexPath = path.join(distPath, "index.html");

if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // Serve index.html for all non-API routes (SPA support)
    app.get("(.*)", (req, res) => {
        if (!req.path.startsWith("/api")) {
            res.sendFile(indexPath);
        } else {
            res.status(404).json({ error: "API route not found" });
        }
    });
} else {
    app.get("/", (req, res) => res.send("API Server running. Frontend not built."));
}

app.use((err, req, res, next) => {
    console.error("💥 Unhandled Error:", err.stack);
    res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
