// Import file cấu hình kết nối database
const config = require('../config/app-config.js');

// Import module mysql2 - hỗ trợ kết nối MySQL nhanh và nhiều tính năng
const mysql = require('mysql2');

/**
 * Class ProductsController: Xử lý toàn bộ nghiệp vụ liên quan đến sản phẩm
 * Bao gồm: lấy danh sách, chi tiết, phân trang, kiểm tra tồn kho, cập nhật...
 */
const controller = class ProductsController {
    constructor() {
        // Tạo một kết nối MySQL riêng cho controller này
        // Dùng cấu hình từ config.sqlCon (không dùng multipleStatements)
        this.con = mysql.createConnection(config.sqlCon);
    }

    /**
     * Lấy toàn bộ sản phẩm từ bảng products (không có size)
     * @returns {Promise<Array>} - Mảng các sản phẩm
     */
    getAll() {
        return new Promise((resolve, reject) => {
            // Truy vấn đơn giản: lấy tất cả bản ghi từ bảng products
            this.con.query('SELECT * FROM `products`', function (err, result) {
                // Kiểm tra nếu không có sản phẩm nào
                if (result.length < 1) {
                    reject(new Error("No registered products"));
                } else {
                    // Trả về mảng kết quả: [{id, title, description, ...}, ...]
                    resolve(result);
                }
            });
        });
    }

    /**
     * Lấy tất cả sản phẩm kèm thông tin kích thước (size) từ bảng sizes
     * Dùng JOIN để ghép products và sizes theo product_id
     * @returns {Promise<Array>}
     */
    getAllWithSizes() {
        return new Promise((resolve, reject) => {
            // INNER JOIN: chỉ lấy sản phẩm nào có ít nhất 1 size
            this.con.query('SELECT * FROM `sizes` JOIN products ON sizes.product_id = products.id', function (err, result) {
                if (err) reject(new Error(err));
                // result là mảng, không bao giờ < 1 (vì là number), nên kiểm tra result.length
                if (result < 1) {
                    reject(new Error("No registered products"));
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Lấy thông tin chi tiết 1 sản phẩm theo ID, kèm tất cả size của nó
     * @param {number|string} id - ID sản phẩm
     * @returns {Promise<Array>} - Mảng các size của sản phẩm đó
     */
    getProduct(id) {
        return new Promise((resolve, reject) => {
            // JOIN products và sizes, lọc theo id
            // CẢNH BÁO: SQL Injection do nối chuỗi id
            this.con.query('SELECT * FROM products JOIN sizes ON products.id = sizes.product_id WHERE id =' + id, function (err, result) {
                if (err) reject(err);
                if (result.length < 1) {
                    reject(new Error("Product not registered"));
                } else {
                    // Trả về tất cả các size của sản phẩm (1 sản phẩm -> nhiều size)
                    resolve(result);
                }
            });
        });
    }

    /**
     * Lấy nhiều sản phẩm theo danh sách ID (dùng IN)
     * @param {string} idList - Chuỗi ID cách nhau bởi dấu phẩy: "1,2,3"
     * @returns {Promise<Array>}
     */
    getByIdArray(idList) {
        return new Promise((resolve, reject) => {
            // Truy vấn lấy id, title, size, price từ 2 bảng
            // CẢNH BÁO: SQL Injection do nối chuỗi idList
            this.con.query('SELECT id, title, sizes.size, sizes.price FROM products JOIN sizes ON products.id = sizes.product_id WHERE `id` IN (' + idList + ')', function (err, result) {
                if (err) reject(err)
                // result không bao giờ là undefined → kiểm tra result.length
                if (result == undefined) {
                    reject(new Error("Products not registered"));
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Kiểm tra số lượng tồn kho của 1 size cụ thể
     * @param {number} id - ID sản phẩm
     * @param {string} size - Kích thước (M, L, XL...)
     * @returns {Promise<Object>} - { stock: 10 }
     */
    checkStock(id, size) {
        return new Promise((resolve, reject) => {
            // CẢNH BÁO: SQL Injection do nối chuỗi
            this.con.query('SELECT stock FROM sizes WHERE product_id = ' + id + ' AND size = "' + size + '"', function (err, result) {
                if (err) reject(err)
                if (result.length < 1) {
                    reject(new Error("Product not registered"));
                } else {
                    // Trả về bản ghi đầu tiên: { stock: 5 }
                    resolve(result[0]);
                }
            });
        });
    }

    /**
     * Cập nhật toàn bộ thông tin sản phẩm + tất cả size
     * @param {Object} product - Dữ liệu sản phẩm: {title, description, ...}
     * @param {Array} sizes - Mảng size: [{size: 'M', price: 100, stock: 10}, ...]
     * @param {number} id - ID sản phẩm
     * @returns {Promise<string>}
     */
    async updateAllDetails(product, sizes, id) {
        return new Promise(async (resolve, reject) => {
            try {
                // B1: Cập nhật thông tin chung của sản phẩm
                await this.updateProduct(product, id);
                // B2: Duyệt từng size và cập nhật
                for (let size of sizes) {
                    await this.updateSizes(size, id);
                }
                // Thành công
                resolve('Product updated successfully!');
            } catch (e) {
                // Nếu có lỗi ở bất kỳ bước nào → reject
                reject(e);
            }
        });
    }

    /**
     * Cập nhật thông tin chung của sản phẩm (bảng products)
     * @param {Object} product - Object chứa các cột cần cập nhật
     * @param {number} id - ID sản phẩm
     */
    updateProduct(product, id) {
        return new Promise((resolve, reject) => {
            // Dùng SET ? → MySQL tự map key với tên cột
            this.con.query('UPDATE `products` SET ? WHERE `id` = ?', [product, id], function (err, result) {
                if (err) reject(err);
                resolve(); // Không trả về gì cụ thể
            });
        });
    }

    /**
     * Cập nhật 1 size cụ thể của sản phẩm
     * @param {Object} size - {size: 'M', price: 100, stock: 5}
     * @param {number} id - ID sản phẩm
     */
    updateSizes(size, id) {
        return new Promise((resolve, reject) => {
            // Cập nhật theo product_id và size (đảm bảo đúng bản ghi)
            this.con.query('UPDATE `sizes` SET ? WHERE `product_id` = ? AND `size` = ?', [size, id, size.size], function (err, result) {
                if (err) reject(err);
                resolve();
            });
        });
    }

    /**
     * Lấy danh sách sản phẩm phân trang (3 sản phẩm/trang)
     * @param {number} page - Số trang (bắt đầu từ 0)
     * @returns {Promise<Array>}
     */
    getPaginated(page) {
        return new Promise((resolve, reject) => {
            // LIMIT 3: 3 sản phẩm
            // OFFSET = page * 3: bỏ qua bao nhiêu dòng
            this.con.query('SELECT * FROM `products` ORDER BY ID ASC LIMIT 3 OFFSET ?', [page * 3], function (err, result) {
                if (err) reject(err);
                // result?.length là optional chaining → an toàn nếu result undefined
                if (result?.length < 1) {
                    reject(new Error("No more products"));
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Lấy danh sách sản phẩm có ít nhất 1 size hết hàng (stock = 0)
     * Dùng RIGHT JOIN để lấy cả sản phẩm không có size
     * @returns {Promise<Array>}
     */
    outOfStock() {
        return new Promise((resolve, reject) => {
            // RIGHT JOIN: lấy tất cả từ products, ghép sizes nếu có
            // WHERE sizes.stock = 0 → chỉ lấy size hết hàng
            this.con.query('SELECT * FROM `sizes` RIGHT JOIN `products` ON sizes.product_id = products.id WHERE sizes.stock = 0', function (err, result) {
                if (err) reject(err);
                if (result.length < 1) {
                    reject(new Error("All products in stock!"));
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Tạo sản phẩm mới với các size
     * @param {Object} product - Dữ liệu sản phẩm: {title, description}
     * @param {Array} sizes - Mảng size: [{size: 'LARGE', price: 100, stock: 10}, ...]
     * @returns {Promise<string>} - ID của sản phẩm vừa tạo
     */
    create(product, sizes) {
        return new Promise((resolve, reject) => {
            // B1: Tạo sản phẩm mới
            this.con.query('INSERT INTO `products` SET ?', product, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const productId = result.insertId;
                
                // B2: Tạo các size cho sản phẩm
                let completed = 0;
                let hasError = false;
                
                if (sizes.length === 0) {
                    resolve(productId);
                    return;
                }
                
                sizes.forEach(size => {
                    const sizeData = {
                        product_id: productId,
                        size: size.size,
                        price: size.price,
                        stock: size.stock
                    };
                    
                    this.con.query('INSERT INTO `sizes` SET ?', sizeData, (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            reject(err);
                            return;
                        }
                        
                        completed++;
                        if (completed === sizes.length && !hasError) {
                            resolve(productId);
                        }
                    });
                });
            });
        });
    }

    /**
     * Xóa sản phẩm và tất cả size của nó
     * @param {number} id - ID sản phẩm
     * @returns {Promise<string>}
     */
    delete(id) {
        return new Promise((resolve, reject) => {
            // B1: Xóa tất cả size của sản phẩm
            this.con.query('DELETE FROM `sizes` WHERE `product_id` = ?', [id], (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // B2: Xóa sản phẩm
                this.con.query('DELETE FROM `products` WHERE `id` = ?', [id], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve('Product deleted successfully');
                    }
                });
            });
        });
    }
}

// Xuất class để sử dụng ở nơi khác
// Ví dụ: const ProductsController = require('./ProductsController');
// const prod = new ProductsController();
module.exports = controller;