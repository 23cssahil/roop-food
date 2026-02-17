const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
    secret: "adminsecret",
    resave: false,
    saveUninitialized: true
}));


// ================= MYSQL =================
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "S@hilkh@nmysql83183",
    database: "qr_food"
});

db.connect(err=>{
    if(err) throw err;
    console.log("MySQL Connected");
});


// ================= ADMIN LOGIN =================
const ADMIN_USER="admin";
const ADMIN_PASS="1234";

app.post("/admin/login",(req,res)=>{
    const {username,password}=req.body;
    if(username===ADMIN_USER && password===ADMIN_PASS){
        req.session.admin=true;
        res.json({success:true});
    }else res.json({success:false});
});

function checkAdmin(req,res,next){
    if(req.session.admin) next();
    else res.send("Login required");
}

app.get("/admin",checkAdmin,(req,res)=>{
    res.sendFile(path.join(__dirname,"public","admin.html"));
});


// ================= ITEMS =================

// get items
app.get("/items",(req,res)=>{
    db.query("SELECT * FROM items",(e,r)=>res.json(r));
});

// add item
app.post("/admin/add-item",checkAdmin,(req,res)=>{
    const {name,price,image_url}=req.body;
    db.query(
        "INSERT INTO items (name,price,image_url) VALUES (?,?,?)",
        [name,price,image_url],
        ()=>res.json({success:true})
    );
});

// update item
app.put("/admin/update-item/:id",checkAdmin,(req,res)=>{
    const {name,price,image_url}=req.body;
    db.query(
        "UPDATE items SET name=?,price=?,image_url=? WHERE id=?",
        [name,price,image_url,req.params.id],
        ()=>res.json({success:true})
    );
});

// delete item
app.delete("/admin/delete-item/:id",checkAdmin,(req,res)=>{
    db.query("DELETE FROM items WHERE id=?",[req.params.id],
    ()=>res.json({success:true}));
});


// ================= PLACE ORDER =================
app.post("/order",(req,res)=>{
    const {customer_name,phone,items,total}=req.body;

    db.query(
        "INSERT INTO orders (customer_name,phone,total) VALUES (?,?,?)",
        [customer_name,phone,total],
        (err,result)=>{
            const orderId=result.insertId;

            items.forEach(i=>{
                db.query(
                    "INSERT INTO order_items (order_id,item_name,price,qty) VALUES (?,?,?,?)",
                    [orderId,i.name,i.price,i.qty]
                );
            });

            res.json({success:true});
        }
    );
});


// ================= ORDER STATUS =================

// get orders
app.get("/admin/orders",checkAdmin,(req,res)=>{

const sql=`
SELECT orders.*,order_items.item_name,order_items.qty
FROM orders
LEFT JOIN order_items
ON orders.id=order_items.order_id
ORDER BY orders.id DESC
`;

db.query(sql,(e,r)=>res.json(r));
});

// mark done
app.put("/admin/order-done/:id",checkAdmin,(req,res)=>{
    db.query(
        "UPDATE orders SET status='Completed' WHERE id=?",
        [req.params.id],
        ()=>res.json({success:true})
    );
});

app.listen(3000,()=>console.log("Server running"));
