// Import file cấu hình kết nối database từ thư mục config
const config = require('../config/app-config.js');

// Import module mysql2 - hỗ trợ kết nối MySQL nhanh, có Promise và bulk insert
const mysql = require('mysql2');

/**
 * Class OrdersController: Xử lý việc tạo đơn hàng và lưu chi tiết sản phẩm
 * Dùng để chuyển giỏ hàng (cart) thành đơn hàng (order + order_items)
 */
const controller = class OrdersController {
    constructor() {
        // Tạo một kết nối MySQL riêng cho controller này
        // Sử dụng cấu hình từ config.sqlCon (không dùng multipleStatements)
        this.con = mysql.createConnection(config.sqlCon);
    }

    /**
     * Tạo một đơn hàng mới trong bảng `orders`
     * @param {Object} user - Dữ liệu đơn hàng (thường là thông tin user + tổng tiền, trạng thái...)
     * @returns {Promise<number>} - Trả về ID của đơn hàng vừa tạo (insertId)
     */
    create(user) {
        return new Promise((resolve, reject) => {
            // INSERT dữ liệu vào bảng orders
            // user là object: { user_id: '123', total: 100000, status: 'pending', ... }
            // MySQL sẽ tự map key của object với tên cột trong bảng
            this.con.query('INSERT INTO orders SET ?', user, function (err, result) {
                if (err) {
                    // Nếu có lỗi (DB, constraint, duplicate...) → reject
                    reject(new Error('Database connection error'));
                }
                // result.insertId = ID của bản ghi vừa được tạo (auto_increment)
                resolve(result.insertId);
            });
        });
    }

    /**
     * Lưu danh sách sản phẩm của đơn hàng vào bảng `orders_items`
     * @param {number} orderId - ID của đơn hàng vừa tạo
     * @param {Array} cartContent - Mảng sản phẩm từ giỏ hàng: [{id, quantity, size}, ...]
     * @returns {Promise<Object>} - Kết quả insert (affectedRows, ...)
     */
    saveOrderProducts(orderId, cartContent) {

        // Bước 1: Biến đổi từng sản phẩm trong giỏ hàng thành mảng giá trị đúng thứ tự cột
        // Giả sử bảng orders_items có cấu trúc:
        // (order_id, product_id, quantity, size)
        for (let i = 0; i < cartContent.length; i++) {
            // Hàm format: nhận object {id, quantity, size} → trả về mảng [orderId, id, quantity, size]
            const format = ({ id, quantity, size }) => [orderId, parseInt(id), quantity, size];
            // Gán lại phần tử thứ i bằng kết quả format
            cartContent[i] = format(cartContent[i]);
        }
        // Sau vòng lặp: cartContent = [[1, 101, 2, 'M'], [1, 102, 1, 'L'], ...]

        // Bước 2: Thực hiện bulk insert (chèn nhiều bản ghi cùng lúc)
        return new Promise((resolve, reject) => {
            // Cú pháp đặc biệt của mysql2: INSERT INTO table VALUES ?, [array_of_arrays]
            // ? sẽ được thay bằng (?), (?), ... tương ứng số bản ghi
            // [cartContent] là mảng chứa 1 phần tử: mảng các mảng con
            this.con.query('INSERT INTO orders_items VALUES ?', [cartContent], function (err, result) {
                if (err) {
                    // Lỗi: trùng khóa, kiểu dữ liệu, DB...
                    reject(new Error(err));
                }
                // result: { affectedRows: 3, insertId: ..., ... }
                resolve(result);
            });
        });
    }
}

// Xuất class để sử dụng ở nơi khác
// Ví dụ: const OrdersController = require('./OrdersController');
// const orderCtrl = new OrdersController();
module.exports = controller;