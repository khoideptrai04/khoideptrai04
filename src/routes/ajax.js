// Khởi tạo express
const express = require("express");
const router = express.Router();
const config = require('../config/app-config.js');

// Các thư viện cần thiết
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore(config.sqlCon);

// Middleware toàn cục
router.use(session({
    name: process.env.SESSION_NAME,
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));

router.use(bodyParser.json()); // Hỗ trợ dữ liệu JSON
router.use(bodyParser.urlencoded({ extended: false })); // Hỗ trợ dữ liệu form

router.use(passport.initialize());
router.use(passport.session());

// Kiểm tra tồn kho trước khi thêm sản phẩm vào giỏ hàng
router.get("/checkStock", async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();

    try {
        stock = await Products.checkStock(req.query.id, req.query.size);
    } catch (e) {
        throw e;
    }
    res.send(stock);
});

// Thêm sản phẩm vào giỏ hàng
router.post("/addToCart", async (req, res) => {
    const CartController = require('../controllers/cart.js');
    const Cart = new CartController();
    let response;

    try {
        response = await Cart.addToCart(req.body.addToCart, req.session.passport.user);
    } catch (e) {
        response = e;
    }

    res.send(response)
});

// Tải danh sách sản phẩm theo trang
router.get("/loadPage", async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();
    let products;

    try {
        products = await Products.getPaginated(req.query.page);
    } catch (e) {
        products = false;
    }

    res.render(`${config.views}/templates/productsList.ejs`, {products: products});
});

// Cập nhật sản phẩm trong giỏ hàng
router.post("/updateCart", async (req, res) => {
    const CartController = require('../controllers/cart.js');
    const Cart = new CartController();

    let response = await Cart.update(req.body.updateProduct, req.session.passport.user);
    res.send(response)
});

module.exports = router;