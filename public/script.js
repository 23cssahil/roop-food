const ADMIN_WHATSAPP="9120322488";
let cart=[];

fetch("/items")
.then(res=>res.json())
.then(data=>{
const menu=document.getElementById("menu");

data.forEach(item=>{
menu.innerHTML+=`
<div class="card">
<img src="${item.image_url}" width="150">
<h3>${item.name}</h3>
<p>₹${item.price}</p>
<button onclick="addToCart('${item.name}',${item.price})">Add</button>
</div>`;
});
});

function addToCart(name,price){
const f=cart.find(i=>i.name===name);
if(f) f.qty++;
else cart.push({name,price,qty:1});
alert("Added");
}

function placeOrder(){

const customer_name=document.getElementById("name").value;
const phone=document.getElementById("phone").value;

if(!customer_name||!phone||cart.length===0){
alert("Fill details"); return;
}

let total=0;
let message=`New Order\n${customer_name}\n${phone}\n`;

cart.forEach(i=>{
total+=i.price*i.qty;
message+=`${i.name} x ${i.qty}\n`;
});

message+=`Total ₹${total}`;

fetch("/order",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({customer_name,phone,items:cart,total})
})
.then(()=>{
window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`);
cart=[];
});
}
