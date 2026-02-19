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

app.use(cors());
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || "adminsecret",
    resave: false,
    saveUninitialized: true
}));


// ================= MYSQL =================
const db = mysql.createConnection({
    host: process.env.DB_HOST || "mysql.railway.internal",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "JAjNBoVYqqFqjZEVxHnnEaOwlFTKIsKS",
    database: process.env.DB_NAME || process.env.DB_DATABASE || "railway",
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) {
        console.error("Database connection failed:", err.stack);
        return;
    }
    console.log("MySQL Connected as ID " + db.threadId);
});

// ================= API ROUTES =================

app.post("/admin/signup", async (req, res) => {
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
    const { username, password } = req.body;
    db.query("SELECT * FROM admins WHERE username = ?", [username], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (results.length === 0) return res.json({ success: false, message: "Invalid credentials" });

        const admin = results[0];
        const match = await bcrypt.compare(password, admin.password);

        if (match) {
            req.session.admin = true;
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    });
});

function checkAdmin(req, res, next) {
    if (req.session.admin) next();
    else res.status(401).json({ error: "Login required" });
}




// ================= ITEMS =================

// get items
app.get("/api/items", (req, res) => {
    db.query("SELECT * FROM items", (e, r) => res.json(r));
});

// add item
app.post("/admin/add-item", checkAdmin, (req, res) => {
    const { name, price, image_url } = req.body;
    db.query(
        "INSERT INTO items (name,price,image_url) VALUES (?,?,?)",
        [name, price, image_url],
        () => res.json({ success: true })
    );
});

// update item
app.put("/admin/update-item/:id", checkAdmin, (req, res) => {
    const { name, price, image_url } = req.body;
    db.query(
        "UPDATE items SET name=?,price=?,image_url=? WHERE id=?",
        [name, price, image_url, req.params.id],
        () => res.json({ success: true })
    );
});

// delete item
app.delete("/admin/delete-item/:id", checkAdmin, (req, res) => {
    db.query("DELETE FROM items WHERE id=?", [req.params.id],
        () => res.json({ success: true }));
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

// ================= PRODUCTION SERVING =================

// ================= PRODUCTION SERVING =================
const distPath = path.join(__dirname, 'frontend/dist');
const indexPath = path.join(distPath, 'index.html');

console.log("Checking for static files at:", distPath);
if (require('fs').existsSync(distPath)) {
    console.log("Found static assets directory");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        if (require('fs').existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send("Frontend build not found (index.html missing)");
        }
    });
} else {
    console.warn("Warning: static assets directory NOT found at:", distPath);
    app.get('/', (req, res) => res.send("API Server is running, but frontend is not built."));
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
