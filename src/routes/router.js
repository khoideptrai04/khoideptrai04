// Biến cấu hình
const config = require('../config/app-config.js');

// Khởi tạo express
const express = require("express");
const app = express();

// Thiết lập engine view là ejs
app.set('view engine', 'ejs');

// Các thư viện cần thiết
require('dotenv').config();
const helmet = require('helmet')
app.use(helmet())

// Thư mục tĩnh (static)
app.use(express.static(config.root));

// Các tuyến đường (routes)
app.use('/', require('./main.js'))
app.use('/login', require('./login.js'))
app.use('/dashboard', require('./dashboard.js'))
app.use('/ajax', require('./ajax.js'))

// Khởi động server
app.listen(process.env.APP_PORT, () => console.log('Server đang chạy'));