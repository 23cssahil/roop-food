try {
    require('dotenv').config();
} catch (e) {
    console.log("dotenv not found, skipping (likely production environment)");
}
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const BUILD_ID = "2026-02-19-V22";
console.log("=======================================");
console.log(`🚀 APP STARTING... VERSION: ${BUILD_ID}`);
console.log("=======================================");

app.use(cors());
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "adminsecret",
    resave: false,
    saveUninitialized: true
}));


let isDbConnected = false;

// ================= MYSQL =================
const dbConfig = {
    host: process.env.DB_HOST || "mysql.railway.internal",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "JAjNBoVYqqFqjZEVxHnnEaOwlFTKIsKS",
    database: process.env.DB_NAME || process.env.DB_DATABASE || "railway",
    port: process.env.DB_PORT || 3306,
    connectTimeout: 10000 // 10 seconds timeout
};

let db = mysql.createConnection(dbConfig);

function handleDisconnect() {
    db.connect(err => {
        if (err) {
            isDbConnected = false;
            console.error("❌ Database connection failed at startup!");
            console.error(`Attempted Host: ${dbConfig.host}`);
            console.error(`Attempted Port: ${dbConfig.port}`);
            console.error("Error Details:", err.message);
            console.error("HINT: Double-check your Render environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME");
            // Don't exit, allow the app to run and show errors via API
        } else {
            isDbConnected = true;
            console.log("✅ MySQL Connected successfully as ID " + db.threadId);
            runMigrations();
        }
    });

    db.on('error', err => {
        console.error('❌ Database error event:', err.code);
        isDbConnected = false;
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
            console.log("Attempting to reconnect...");
            db = mysql.createConnection(dbConfig);
            handleDisconnect();
        } else {
            console.error("Fatal DB error. Re-initialization might be needed.");
        }
    });
}

function runMigrations() {
    console.log("🛠️ Running database migrations...");

    // 1. Create missing tables
    const tableQueries = [
        "CREATE TABLE IF NOT EXISTS feedback (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT, rating INT, comment TEXT, customer_name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, customer_name VARCHAR(255), phone VARCHAR(20), total DECIMAL(10,2), status VARCHAR(50) DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE IF NOT EXISTS items (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), price DECIMAL(10,2), image_url TEXT, description TEXT)"
    ];

    tableQueries.forEach(sql => {
        db.query(sql, (err) => {
            if (err) console.error("Table Creation Error:", err.message);
        });
    });

    // 2. Add individual columns if missing
    const checkAndAddColumn = (table, column, type, callback) => {
        db.query(
            "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
            [table, column],
            (err, results) => {
                if (!err && results[0] && results[0].count === 0) {
                    db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (alterErr) => {
                        if (alterErr) console.error(`Failed to add ${column} to ${table}:`, alterErr.message);
                        else console.log(`✅ Migration complete: Added ${column} to ${table}`);
                        if (callback) callback();
                    });
                } else if (callback) {
                    callback();
                }
            }
        );
    };

    checkAndAddColumn('admins', 'is_approved', 'TINYINT DEFAULT 0');
    checkAndAddColumn('admins', 'is_super', 'TINYINT DEFAULT 0');
    checkAndAddColumn('items', 'description', 'TEXT');

    // Synchronize Super Admin
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    db.query(
        "INSERT INTO admins (username, password, is_approved, is_super) VALUES (?, ?, 1, 1) ON DUPLICATE KEY UPDATE is_approved = 1, is_super = 1",
        ["admin", hashedPassword],
        (err) => {
            if (err) console.error("❌ Failed to sync super admin:", err.message);
            else console.log("✅ Super Admin synchronized.");
        }
    );
}

handleDisconnect();

// ================= API ROUTES =================

app.get("/api/health-check", (req, res) => {
    console.log("Health check hit. isDbConnected:", isDbConnected);
    if (!isDbConnected) {
        return res.json({
            status: "disconnected",
            message: "Database is not connected. Check Render environment variables.",
            hint: "Look for '❌ Database connection failed' in your Render logs."
        });
    }

    db.query("SELECT 1", (err) => {
        if (err) {
            console.error("Health check query failed:", err.message);
            return res.status(500).json({
                status: "error",
                message: "Database connection failed during query",
                details: err.message
            });
        }
        res.json({ status: "ok", message: "Database is live and responding" });
    });
});

app.post("/admin/signup", async (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "Database not connected" });
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO admins (username, password) VALUES (?, ?)",
            [username, hashedPassword],
            (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Username already exists" });
                    return res.status(500).json({ error: "Signup failed" });
                }
                res.json({ success: true });
            }
        );
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/admin/login", (req, res) => {
    if (!isDbConnected) {
        console.error("Login attempted but DB is disconnected");
        return res.status(503).json({ error: "Database not connected. Please check Render Environment Variables." });
    }
    const { username, password } = req.body;
    try {
        db.query("SELECT * FROM admins WHERE username = ?", [username], async (err, results) => {
            if (err) {
                console.error("DB Query Error during login:", err);
                return res.status(500).json({ error: "Database error during login" });
            }
            if (!results || results.length === 0) return res.json({ success: false, message: "Invalid credentials" });

            const admin = results[0];
            const match = await bcrypt.compare(password, admin.password);

            if (match) {
                if (admin.is_approved === 0) {
                    return res.json({ success: false, message: "Account pending approval" });
                }
                req.session.admin = {
                    id: admin.id,
                    username: admin.username,
                    is_super: admin.is_super
                };
                res.json({ success: true, user: { username: admin.username, is_super: admin.is_super } });
            } else {
                res.json({ success: false, message: "Invalid credentials" });
            }
        });
    } catch (queryErr) {
        console.error("Critical Login Error:", queryErr);
        res.status(500).json({ error: "Internal server error during login request" });
    }
});

function checkAdmin(req, res, next) {
    if (req.session.admin) next();
    else res.status(401).json({ error: "Login required" });
}

app.post("/admin/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});




// ================= ITEMS =================

// get items
app.get("/api/items", (req, res) => {
    if (!isDbConnected) return res.status(503).json({ error: "Database not connected. Check Render environment variables." });
    db.query("SELECT * FROM items", (e, r) => {
        if (e) return res.status(500).json({ error: "Database query failed" });
        res.json(r || []);
    });
});

// add item
app.post("/admin/add-item", checkSuperAdmin, (req, res) => {
    const { name, price, image_url } = req.body;
    db.query(
        "INSERT INTO items (name,price,image_url) VALUES (?,?,?)",
        [name, price, image_url],
        () => res.json({ success: true })
    );
});

// update item
app.put("/admin/update-item/:id", checkSuperAdmin, (req, res) => {
    const { name, price, image_url } = req.body;
    db.query(
        "UPDATE items SET name=?,price=?,image_url=? WHERE id=?",
        [name, price, image_url, req.params.id],
        () => res.json({ success: true })
    );
});

// delete item
app.delete("/admin/delete-item/:id", checkSuperAdmin, (req, res) => {
    db.query("DELETE FROM items WHERE id=?", [req.params.id],
        () => res.json({ success: true }));
});

// ================= FEEDBACK / REVIEWS =================

// GET all public feedback (for Reviews page)
app.get("/api/feedback", (req, res) => {
    if (!isDbConnected) return res.status(503).json([]);
    db.query(
        "SELECT * FROM feedback ORDER BY created_at DESC",
        (err, results) => {
            if (err) {
                console.error("Feedback fetch error:", err.message);
                return res.status(500).json([]);
            }
            res.json(results || []);
        }
    );
});

// POST submit feedback for an order
app.post("/api/order/:orderId/feedback", (req, res) => {
    const { orderId } = req.params;
    const { rating, comment, customer_name } = req.body;
    if (!rating || !customer_name) {
        return res.status(400).json({ error: "Rating and customer name are required." });
    }
    db.query(
        "INSERT INTO feedback (order_id, rating, comment, customer_name) VALUES (?, ?, ?, ?)",
        [orderId, rating, comment || '', customer_name],
        (err, result) => {
            if (err) {
                console.error("Feedback insert error:", err.message);
                return res.status(500).json({ error: "Failed to save feedback." });
            }
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.get("/admin/daily-sales", checkSuperAdmin, (req, res) => {
    const sql = `
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m-%d') as date,
            SUM(total) as revenue,
            COUNT(*) as orders
        FROM orders 
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Failed to fetch sales data" });
        res.json(results);
    });
});


// ================= PLACE ORDER =================
app.post("/api/order", (req, res) => {
    const { customer_name, phone, items, total } = req.body;

    db.query(
        "INSERT INTO orders (customer_name, phone, total) VALUES (?, ?, ?)",
        [customer_name, phone, total],
        (err, result) => {
            if (err) {
                console.error("Order insertion failed:", err);
                return res.status(500).json({ success: false, error: "Order failed" });
            }

            const orderId = result.insertId;

            // Using a counter to track item insertions
            let itemsProcessed = 0;
            if (items.length === 0) {
                return res.json({ success: true, orderId: orderId });
            }

            items.forEach(i => {
                db.query(
                    "INSERT INTO order_items (order_id, item_name, price, qty) VALUES (?, ?, ?, ?)",
                    [orderId, i.name, i.price, i.qty],
                    (itemErr) => {
                        if (itemErr) console.error("Item insertion failed:", itemErr);
                        itemsProcessed++;
                        if (itemsProcessed === items.length) {
                            res.json({ success: true, orderId: orderId });
                        }
                    }
                );
            });
        }
    );
});


// ================= FEEDBACK =================
app.post("/api/order/:id/feedback", (req, res) => {
    const { rating, comment, customer_name } = req.body;
    const orderId = req.params.id;

    db.query(
        "INSERT INTO feedback (order_id, rating, comment, customer_name) VALUES (?, ?, ?, ?)",
        [orderId, rating, comment, customer_name],
        (err) => {
            if (err) return res.status(500).json({ error: "Failed to submit feedback" });
            res.json({ success: true });
        }
    );
});

// public get feedback
app.get("/api/feedback", (req, res) => {
    db.query("SELECT rating, comment, customer_name, created_at FROM feedback WHERE rating >= 4 ORDER BY created_at DESC LIMIT 12", (e, r) => res.json(r || []));
});

app.get("/admin/feedback", checkAdmin, (req, res) => {
    db.query("SELECT * FROM feedback ORDER BY created_at DESC", (e, r) => res.json(r));
});


// ================= ORDER STATUS =================

// get orders
app.get("/admin/orders", checkAdmin, (req, res) => {

    const sql = `
SELECT orders.*,order_items.item_name,order_items.qty
FROM orders
LEFT JOIN order_items
ON orders.id=order_items.order_id
ORDER BY orders.id DESC
`;

    db.query(sql, (e, r) => res.json(r || []));
});

// mark done
app.put("/admin/order-done/:id", checkAdmin, (req, res) => {
    db.query(
        "UPDATE orders SET status='Completed' WHERE id=?",
        [req.params.id],
        () => res.json({ success: true })
    );
});

// ================= STAFF MANAGEMENT (SUPER ADMIN ONLY) =================

function checkSuperAdmin(req, res, next) {
    if (req.session.admin && req.session.admin.is_super) next();
    else res.status(403).json({ error: "Access denied. Super Admin only." });
}

app.get("/admin/staff", checkSuperAdmin, (req, res) => {
    db.query("SELECT id, username, is_approved, is_super FROM admins ORDER BY id ASC", (e, r) => {
        if (e) return res.status(500).json({ error: "Failed to fetch staff" });
        res.json(r || []);
    });
});

app.put("/admin/approve-staff/:id", checkSuperAdmin, (req, res) => {
    db.query("UPDATE admins SET is_approved = 1 WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Approval failed" });
        res.json({ success: true });
    });
});

app.delete("/admin/delete-staff/:id", checkSuperAdmin, (req, res) => {
    // Prevent deleting self
    if (req.session.admin.id == req.params.id) return res.status(400).json({ error: "Cannot delete yourself" });
    db.query("DELETE FROM admins WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Deletion failed" });
        res.json({ success: true });
    });
});


// ================= PRODUCTION SERVING =================

// ================= PRODUCTION SERVING =================
const distPath = path.join(__dirname, 'frontend/dist');
const indexPath = path.join(distPath, 'index.html');

console.log("Checking for static files at:", distPath);
if (require('fs').existsSync(distPath)) {
    console.log("Found static assets directory");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
        // Serve index.html for any GET request that isn't an /api call
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            if (require('fs').existsSync(indexPath)) {
                return res.sendFile(indexPath);
            }
        }
        next();
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error("💥 Unhandled Server Error:", err.stack);
        res.status(500).json({ error: "Internal server error" });
    });
} else {
    console.warn("Warning: static assets directory NOT found at:", distPath);
    app.get('/', (req, res) => res.send("API Server is running, but frontend is not built."));
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
