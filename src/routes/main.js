// Khởi tạo express
const express = require("express");
const router = express.Router();
const config = require('../config/app-config.js');

// Các thư viện cần thiết
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator');

// Middleware toàn cục
router.use(session({
    name: process.env.SESSION_NAME,
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

router.use(bodyParser.json()); // Hỗ trợ dữ liệu JSON
router.use(bodyParser.urlencoded({ extended: false })); // Hỗ trợ dữ liệu form

router.use(passport.initialize());
router.use(passport.session());

router.use(async function(req,res,next) {
    const UsersController = require('../controllers/users.js');
    const User = new UsersController();

    res.locals.isAuthenticated = req.isAuthenticated();

    try {
        res.locals.isAdmin = await User.isAdmin(req.session.passport.user);
    } catch {
        res.locals.isAdmin = false;
    }

    next();
});

// Trang chủ
router.get("/", (req, res) => {
    res.render(`${config.views}/public/index.ejs`);
});

// Trang danh sách sản phẩm (hamburgers)
router.get("/hamburguers", async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();

    try {
        products = await Products.getPaginated(page = 0);
    } catch (e) {
        throw e;
    }

    res.render(`${config.views}/public/hamburguers.ejs`, {products: products});
});

// Trang đặt hàng sản phẩm
router.get("/order", authenticate(), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();

    try {
        product = await Products.getProduct(req.query.p);
    } catch (e) {
        throw e;
    }

    res.render(`${config.views}/public/order.ejs`, {product: product});
});

// Trang giỏ hàng
router.get("/cart", authenticate(), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();
    const CartController = require('../controllers/cart.js');
    const Cart = new CartController();
    let cartContent;
    let products;

    try {
        cartContent = await Cart.getContent(req.session.passport.user);
        let idList = cartContent.content.map(({ id }) => id)
        idList = Array.from(new Set(idList)).toString();
        products = await Products.getByIdArray(idList);
    } catch (err) {
        console.log(err);
        cartContent = false;
    }

    if (cartContent) products = JSON.parse(JSON.stringify(products))
    res.render(`${config.views}/public/cart.ejs`, {cart: cartContent.content, products: products});
});

// Trang thanh toán (biểu mẫu)
router.get("/checkout", authenticate(), async (req, res) => {
    let formErrors = req.session.formErrors ? req.session.formErrors : false;
    req.session.formErrors = false;
    res.render(`${config.views}/public/checkoutProcess.ejs`, {errors: formErrors});
});

// Xử lý thanh toán
router.post("/checkout", authenticate(),
    [check('city').isLength({ min: 3 }),
    check('address').isLength({ min: 3 }),
    check('city').isLength({ min: 3 }),
    check('zip').isNumeric(),
    check('card').isNumeric(),
    check('expMonth').isLength({min: 2, max: 2}),
    check('expYear').isLength({min: 2, max: 2}),
    check('cvCode').isLength({min: 3, max: 3})],
async (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        req.session.formErrors = errors.array();
        res.redirect('/checkout');

    } else {

        const CartController = require('../controllers/cart.js');
        const Cart = new CartController();

        const OrdersController = require('../controllers/orders.js');
        const Orders = new OrdersController();

        const ProductsController = require('../controllers/products.js');
        const Products = new ProductsController();

        let cartContent;
        let orderId;
        let userId = req.session.passport.user;

        try {
            cartContent = await Cart.getContent(userId);
            cartContent = cartContent.content;
            if (typeof cartContent === 'string') {
                cartContent = JSON.parse(cartContent);
            }

            if (!Array.isArray(cartContent) || cartContent.length === 0) {
                throw new Error('Cart is empty');
            }

            const productIds = Array.from(new Set(cartContent.map(item => parseInt(item.id, 10))));
            const sizes = await Products.getSizesForProducts(productIds);
            const priceMap = {};
            sizes.forEach((size) => {
                priceMap[`${size.product_id}_${size.size}`] = Number(size.price);
            });

            const itemsWithPrice = cartContent.map((item) => {
                const key = `${item.id}_${item.size}`;
                const unitPrice = priceMap[key];
                if (typeof unitPrice === 'undefined') {
                    throw new Error('Missing price for product in cart');
                }
                const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
                return {
                    ...item,
                    unit_price: unitPrice,
                    line_total: lineTotal
                };
            });

            const totalAmount = itemsWithPrice.reduce((sum, item) => sum + item.line_total, 0);
            const orderPayload = {
                costumer_id: userId,
                total_amount: Number(totalAmount.toFixed(2)),
                status: 'pending',
                payment_method: 'card',
                payment_last4: req.body.card ? req.body.card.toString().slice(-4) : null,
                address: req.body.address,
                city: req.body.city,
                state: req.body.state,
                zip: req.body.zip
            };

            orderId = await Orders.create(orderPayload);
            await Orders.saveOrderProducts(orderId, itemsWithPrice);
            await Cart.empty(userId);
        } catch(e) {
            throw e;
        }

        res.render(`${config.views}/public/checkout.ejs`);
    }

});

// Trang liên hệ
router.get("/contact", (req, res) => {
    res.render(`${config.views}/public/contact.ejs`);
});

// Middleware kiểm tra đã đăng nhập
function authenticate () {
	return (req, res, next) => {
	    if (req.isAuthenticated()) return next();
	    res.redirect('/login')
	}
}

module.exports = router;