// Khởi tạo express
const express = require("express");
const router = express.Router();
const config = require('../config/app-config.js');

// Các thư viện cần thiết
const session = require('express-session');
const passport = require('passport');
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore(config.sqlCon);
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/products')
    },
    filename: function (req, file, cb) {
        req.session.multer++;
        cb(null, req.body.id + '-' + req.session.multer);
    }
});
const upload = multer({ storage: storage });

// Middleware toàn cục
router.use(session({
    name: process.env.SESSION_NAME,
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));

router.use(passport.initialize());
router.use(passport.session());

router.use(bodyParser.json()); // Hỗ trợ dữ liệu JSON
router.use(bodyParser.urlencoded({ extended: false })); // Hỗ trợ dữ liệu form
//Phân quyền
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

// Trang tổng quan (dashboard)
router.get("/", authenticateEmployee(), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();
    let products;

    try {
        products = await Products.outOfStock();
    } catch (e) {
        products = e;
    }

    res.render(`${config.views}/dashboard/index.pug`, {products: products});
});

// Trang danh sách sản phẩm trong dashboard
router.get("/products", authenticateEmployee(), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();
    let products;

    try {
        products = await Products.getAll();
    } catch (e) {
        products = false;
    }

    let msg = req.session.msg ? req.session.msg : false;
    req.session.msg = false;

    res.render(`${config.views}/dashboard/products.pug`, {products: products, msg: msg});
});

// Trang chỉnh sửa sản phẩm
router.get("/products/edit", authenticateEmployee(), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();
    let productSizes;

    try {
        productSizes = await Products.getProduct(req.query.id);
    } catch (e) {
        productSizes = false;
    }

    req.session.multer = 0;

    res.render(`${config.views}/dashboard/editProduct.pug`, {productSizes: productSizes});
});

// Lưu thông tin chỉnh sửa sản phẩm
router.post("/product/save", authenticateEmployee(), upload.array('img',3), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();

    let id = req.body.id;

    // Thông tin sản phẩm
    let product = { title: req.body.title, description: req.body.description};

    // Kích thước và giá
    let large = {product_id: id, price: req.body.price_LARGE, stock: req.body.stock_LARGE, size: 'LARGE'}
    let medium = {product_id: id, price: req.body.price_MEDIUM, stock: req.body.stock_MEDIUM, size: 'MEDIUM'}
    let small = {product_id: id, price: req.body.price_SMALL, stock: req.body.stock_SMALL, size: 'SMALL'}

    // Đổi tên ảnh đã upload
    try {
        let path = `public/images/products/${id}`;
        if (req.body.img1) fs.renameSync(`${path}-1`,`${path}-1.jpg`);
        if (req.body.img2) {
            if (fs.existsSync(`${path}-1`)) {
                fs.renameSync(`${path}-1`,`${path}-2.jpg`);
            } else {
                fs.renameSync(`${path}-2`,`${path}-2.jpg`);
            }
        }
        if(req.body.img3) {
            if (fs.existsSync(`${path}-1`)) {
                fs.renameSync(`${path}-1`,`${path}-3.jpg`);
            } else if (fs.existsSync(`${path}-2`)) {
                fs.renameSync(`${path}-2`,`${path}-3.jpg`);
            } else {
                fs.renameSync(`${path}-3`,`${path}-3.jpg`);
            }
        }
    } catch(e) {
        req.session.msg = e;
    }

    try {
        req.session.msg = await Products.updateAllDetails(product, [large,medium,small], id);
    } catch (e) {
        req.session.msg = e;
    }

    res.redirect('/dashboard/products');
});

// Trang thêm sản phẩm mới
router.get("/products/add", authenticateEmployee(), async (req, res) => {
    req.session.multer = 0;
    res.render(`${config.views}/dashboard/addProduct.pug`);
});

// Lưu sản phẩm mới
router.post("/product/create", authenticateEmployee(), upload.array('img',3), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();

    // Thông tin sản phẩm
    let product = { title: req.body.title, description: req.body.description};

    // Kích thước và giá
    let sizes = [
        {size: 'LARGE', price: req.body.price_LARGE, stock: req.body.stock_LARGE},
        {size: 'MEDIUM', price: req.body.price_MEDIUM, stock: req.body.stock_MEDIUM},
        {size: 'SMALL', price: req.body.price_SMALL, stock: req.body.stock_SMALL}
    ];

    try {
        const productId = await Products.create(product, sizes);
        
        // Đổi tên ảnh đã upload
        try {
            let path = `public/images/products/${productId}`;
            if (req.body.img1) fs.renameSync(`${path}-1`,`${path}-1.jpg`);
            if (req.body.img2) {
                if (fs.existsSync(`${path}-1`)) {
                    fs.renameSync(`${path}-1`,`${path}-2.jpg`);
                } else {
                    fs.renameSync(`${path}-2`,`${path}-2.jpg`);
                }
            }
            if(req.body.img3) {
                if (fs.existsSync(`${path}-1`)) {
                    fs.renameSync(`${path}-1`,`${path}-3.jpg`);
                } else if (fs.existsSync(`${path}-2`)) {
                    fs.renameSync(`${path}-2`,`${path}-3.jpg`);
                } else {
                    fs.renameSync(`${path}-3`,`${path}-3.jpg`);
                }
            }
        } catch(e) {
            req.session.msg = e;
        }
        
        req.session.msg = 'Product created successfully!';
    } catch (e) {
        req.session.msg = e;
    }

    res.redirect('/dashboard/products');
});

// Xóa sản phẩm
router.delete("/products/delete", authenticateEmployee(), async (req, res) => {
    const ProductsController = require('../controllers/products.js');
    const Products = new ProductsController();

    try {
        req.session.msg = await Products.delete(req.body.id);
    } catch (e) {
        req.session.msg = e;
    }

    res.json({success: true, message: req.session.msg});
});

// Trang quản lý tài khoản (nhân viên & admin)
router.get("/accounts", authenticateAdmin(), async (req, res) => {
    const UsersController = require('../controllers/users.js');
    const Users = new UsersController();

    let msg = req.session.msg ? req.session.msg : false;
    req.session.msg = false;

    let users;

    try {
        users = await Users.getEmployees();
    } catch (e) {
        users = false;
    }

    res.render(`${config.views}/dashboard/accounts.pug`, {users: users, msg: msg});
});

// Trang chỉnh sửa tài khoản
router.get("/accounts/edit", authenticateAdmin(), async (req, res) => {
    const UsersController = require('../controllers/users.js');
    const Users = new UsersController();
    let user;

    try {
        user = await Users.getUserById(req.query.id);
    } catch (e) {
        user = false;
    }

    res.render(`${config.views}/dashboard/editAccount.pug`, {user: user});
});

// Lưu thông tin chỉnh sửa tài khoản
router.post("/account/save", authenticateAdmin(), async (req, res) => {
    const UsersController = require('../controllers/users.js');
    const Users = new UsersController();

    let id = req.body.id;
    let user = {name: req.body.name, email: req.body.email, user_type: req.body.type};
    if (req.body.password != "") user.password = await bcrypt.hash(req.body.password, 10);

    try {
        req.session.msg = await Users.updateEmployee(user, id);
    } catch (e) {
        req.session.msg = e;
    }

    res.redirect('/dashboard/accounts');
});

// Trang thêm tài khoản mới
router.get("/accounts/add", authenticateAdmin(), async (req, res) => {
    res.render(`${config.views}/dashboard/addAccount.pug`);
});

// Lưu tài khoản mới
router.post("/account/create", authenticateAdmin(), async (req, res) => {
    const UsersController = require('../controllers/users.js');
    const Users = new UsersController();

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let user = {
            name: req.body.name, 
            email: req.body.email, 
            password: hashedPassword,
            user_type: req.body.type
        };
        
        await Users.createEmployee(user);
        req.session.msg = 'Account created successfully!';
    } catch (e) {
        req.session.msg = e;
    }

    res.redirect('/dashboard/accounts');
});

// Xóa tài khoản
router.delete("/accounts/delete", authenticateAdmin(), async (req, res) => {
    const UsersController = require('../controllers/users.js');
    const Users = new UsersController();

    try {
        req.session.msg = await Users.deleteEmployee(req.body.id);
    } catch (e) {
        req.session.msg = e;
    }

    res.json({success: true, message: req.session.msg});
});

// Trang truy cập bị từ chối
router.get("/forbidden", authenticateEmployee(), async (req, res) => {
    res.render(`${config.views}/dashboard/forbidden.pug`);
});

// Middleware kiểm tra quyền nhân viên (employee trở lên)
function authenticateEmployee() {
	return (req, res, next) => {
        if (res.locals.isAdmin) return next();
	    res.redirect('/login')
	}
}

// Middleware kiểm tra quyền admin
function authenticateAdmin() {
	return (req, res, next) => {
        if (res.locals.isAdmin == "admin") return next();
	    res.redirect('/dashboard/forbidden')
	}
}

module.exports = router;