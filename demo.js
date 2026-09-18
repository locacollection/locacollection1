/*
 LOCA COLLECTION online-demo adapter
 ------------------------------------
 This file provides a browser-only demo API using localStorage.
 It is intentionally separate from the production Node/SQLite server.
*/
(function () {
  const KEY = "loca_demo_db_v1";
  const seedProducts = [
    ["LC-P01","Oversized Wool Coat","Outerwear",31000,0,12],
    ["LC-P02","Tailored Linen Blazer","Outerwear",24500,0,15],
    ["LC-P03","Silk Slip Dress","Dresses",18000,21000,9],
    ["LC-P04","Column Midi Dress","Dresses",21000,0,10],
    ["LC-P05","Ribbed Knit Turtleneck","Knitwear",12500,0,20],
    ["LC-P06","Cashmere Crew Sweater","Knitwear",26000,0,8],
    ["LC-P07","Wide-Leg Trousers","Trousers",19500,0,14],
    ["LC-P08","Tapered Wool Trousers","Trousers",17500,19500,11],
    ["LC-P09","Structured Leather Tote","Accessories",34000,0,7],
    ["LC-P10","Minimal Gold Hoops","Accessories",8500,0,30],
    ["LC-P11","Silk Twill Scarf","Accessories",9500,0,18],
    ["LC-P12","Square Sunglasses","Accessories",15000,0,13]
  ];
  function get() {
    let db = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!db) {
      db = {
        products: seedProducts.map((p,i)=>({id:i+1,sku:p[0],name:p[1],category:p[2],price_pkr:p[3],compare_at_pkr:p[4],stock:p[5],sizes:"XS,S,M,L,XL",image_url:"",active:true})),
        orders: [], customers: [], messages: []
      };
      localStorage.setItem(KEY, JSON.stringify(db));
    }
    return db;
  }
  function put(db){localStorage.setItem(KEY,JSON.stringify(db));return db}
  window.LOCA_DEMO = {
    reset(){localStorage.removeItem(KEY);location.reload()},
    data(){return get()},
    addOrder(order){const db=get();order.id=db.orders.length+1;order.order_no="LOC-"+String(order.id).padStart(5,"0");db.orders.unshift(order);put(db);return order}
  };
})();
