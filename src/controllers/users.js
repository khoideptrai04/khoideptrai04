// Import file cấu hình kết nối database
const config = require('../config/app-config.js');

// Import module mysql2 - hỗ trợ kết nối MySQL nhanh, Promise, parameterized query
const mysql = require('mysql2');

/**
 * Class UsersController: Xử lý toàn bộ nghiệp vụ liên quan đến người dùng
 * Bao gồm: đăng ký, đăng nhập, kiểm tra quyền, cập nhật thông tin, quản lý nhân viên...
 */
const controller = class UsersController {
    constructor() {
        // Tạo một kết nối MySQL riêng cho controller này
        // Dùng cấu hình từ config.sqlCon
        this.con = mysql.createConnection(config.sqlCon);
    }

    /**
     * Lưu người dùng mới vào bảng users (dùng trong đăng ký)
     * @param {Object} user - Object chứa thông tin user: {name, email, password, ...}
     * @returns {void} - Không trả về Promise, lỗi sẽ throw ra ngoài
     */
    save(user) {
        // INSERT dữ liệu vào bảng users
        // MySQL tự map key của object với tên cột trong bảng
        // CẢNH BÁO: Không có xử lý lỗi → nếu lỗi sẽ throw và crash ứng dụng
        this.con.query('INSERT INTO users SET ?', user, function (err, result) {
            if (err) throw err; // Lỗi sẽ làm crash server nếu không bắt try-catch ở ngoài
        });
    }

    /**
     * Lấy thông tin người dùng theo email (dùng trong đăng nhập)
     * @param {string} email - Email người dùng
     * @returns {Promise<Object>} - Thông tin user: {id, name, email, password, ...}
     */
    getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            // CẢNH BÁO: SQL Injection do nối chuỗi email
            this.con.query('SELECT * FROM `users` WHERE `email` = "' + email + '"', function (err, result) {
                // Kết quả là mảng → kiểm tra độ dài
                if (result.length < 1) {
                    reject(new Error("User not found"));
                } else {
                    // Trả về bản ghi đầu tiên (email là unique)
                    resolve(result[0]);
                }
            });
        });
    }

    /**
     * Kiểm tra loại người dùng (admin/employee/user) theo ID
     * @param {string|number} id - ID người dùng
     * @returns {Promise<string>} - Giá trị user_type hoặc reject
     *///Định nghĩa Admin
    isAdmin(id) {
        return new Promise((resolve, reject) => {
            // CẢNH BÁO: SQL Injection do nối chuỗi id
            this.con.query('SELECT * FROM `users` WHERE `id` = "' + id + '"', function (err, result) {
                // result không bao giờ là undefined → kiểm tra result.length
                if (result == undefined) {
                    reject(new Error("User not found"));
                } else {
                    // Nếu có user_type → resolve giá trị đó
                    if (result[0].user_type) resolve(result[0].user_type);
                    // Nếu không có → reject (không có thông báo)
                    reject();
                }
            });
        });
    }

    /**
     * Lấy thông tin người dùng theo ID
     * @param {string|number} id - ID người dùng
     * @returns {Promise<Object>}
     */
    getUserById(id) {
        return new Promise((resolve, reject) => {
            // CẢNH BÁO: SQL Injection
            this.con.query('SELECT * FROM `users` WHERE `id` = "' + id + '"', function (err, result) {
                if (result.length < 1) {
                    reject(new Error("User not found"));
                } else {
                    resolve(result[0]);
                }
            });
        });
    }

    /**
     * Cập nhật tên và email của người dùng
     * @param {string} name - Tên mới
     * @param {string} email - Email mới
     * @param {string|number} user - ID người dùng
     * @returns {Promise<string>} - "Success"
     */
    update(name, email, user) {
        return new Promise((resolve, reject) => {
            // Dùng parameterized query → an toàn, không bị SQL Injection
            this.con.query('UPDATE `users` SET `name` = ? , `email` = ? WHERE `id` = ?', [name, email, user], function (err, result) {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve('Success');
                }
            });
        });
    }

    /**
     * Cập nhật mật khẩu (đã được hash)
     * @param {string} hashed - Mật khẩu đã hash (bcrypt, ...)
     * @param {string|number} user - ID người dùng
     * @returns {Promise<string>} - "Success"
     */
    updatePassword(hashed, user) {
        return new Promise((resolve, reject) => {
            // An toàn nhờ dùng ?
            this.con.query('UPDATE `users` SET `password` = ? WHERE `id` = ?', [hashed, user], function (err, result) {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve('Success');
                }
            });
        });
    }

    /**
     * Lấy danh sách tất cả nhân viên và admin
     * @returns {Promise<Array>}
     */
    getEmployees() {
        return new Promise((resolve, reject) => {
            // Dùng IN để lọc user_type = 'employee' hoặc 'admin'
            // Chuỗi trong IN phải có dấu nháy đơn
            this.con.query('SELECT * FROM `users` WHERE `user_type` in ("employee","admin")', function (err, result) {
                if (err) {
                    reject(new Error(err));
                } else {
                    // Trả về mảng nhân viên
                    resolve(result);
                }
            });
        });
    }

    /**
     * Cập nhật thông tin nhân viên (admin dùng)
     * @param {Object} user - Object chứa các trường cần cập nhật: {name, email, user_type, ...}
     * @param {string|number} id - ID người dùng
     * @returns {Promise<string>}
     */
    updateEmployee(user, id) {
        return new Promise((resolve, reject) => {
            // Dùng SET ? → tự map key với cột
            this.con.query('UPDATE `users` SET ? WHERE `id` = ?', [user, id], function (err, result) {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve('Account changes saved successfully');
                }
            });
        });
    }

    /**
     * Tạo nhân viên/admin mới
     * @param {Object} user - Object chứa thông tin user: {name, email, password, user_type}
     * @returns {Promise<string>} - ID của user vừa tạo
     */
    createEmployee(user) {
        return new Promise((resolve, reject) => {
            this.con.query('INSERT INTO `users` SET ?', user, function (err, result) {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve(result.insertId);
                }
            });
        });
    }

    /**
     * Xóa nhân viên/admin
     * @param {string|number} id - ID người dùng
     * @returns {Promise<string>}
     */
    deleteEmployee(id) {
        return new Promise((resolve, reject) => {
            this.con.query('DELETE FROM `users` WHERE `id` = ?', [id], function (err, result) {
                if (err) {
                    reject(new Error(err));
                } else {
                    resolve('Account deleted successfully');
                }
            });
        });
    }
}

// Xuất class để sử dụng ở nơi khác
// Ví dụ: const UsersController = require('./UsersController');
// const userCtrl = new UsersController();
module.exports = controller;