const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const session = require("express-session");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const addressRoutes = require('./routes/addressRoutes'); 
const orderRoutes = require('./routes/orderRoutes'); 

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, 
}));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_fallback_secret_key", 
    resave: false, 
    saveUninitialized: false, 
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, 
      httpOnly: true, 
      secure: false, 
      sameSite: "lax", 
    },
    
  })
);

app.use((req, res, next) => {

  if (req.session && !req.session.initialized) {
    req.session.initialized = true; 
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24; 
  }
  next();
})

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(5000, () => {
      console.log("Sever running on port 5000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
