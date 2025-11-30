// Import file cấu hình kết nối database từ thư mục config
const config = require('../config/app-config.js');

// Import module mysql2 - thư viện kết nối MySQL nhanh hơn và hỗ trợ Promise
const mysql = require('mysql2');

/**
 * Class ProductsController: Xử lý toàn bộ logic liên quan đến giỏ hàng (cart)
 * Mỗi lần khởi tạo sẽ tạo một kết nối MySQL riêng (dùng config.sqlCon)
 */
const controller = class ProductsController {
    constructor() {
        // Tạo kết nối MySQL sử dụng cấu hình từ file config (sqlCon)
        // Lưu kết nối vào thuộc tính this.con để dùng lại trong các phương thức
        this.con = mysql.createConnection(config.sqlCon);
    }

    /**
     * Lấy nội dung giỏ hàng của người dùng
     * @param {string|number} user - ID của người dùng (user_id)
     * @returns {Promise<Object>} - Trả về { content: "..." } nếu có, reject nếu lỗi hoặc không tìm thấy
     */
    getContent(user) {
        return new Promise((resolve, reject) => {
            // Truy vấn lấy cột 'content' từ bảng cart theo user_id
            // CẢNH BÁO: Dễ bị SQL Injection do nối chuỗi trực tiếp
            // Nên dùng: `WHERE user_id = ?` + [user]
            this.con.query('SELECT content FROM `cart` WHERE `user_id` ="'+user+'"', function (err, result) {
                if (err) {
                    // Nếu có lỗi kết nối hoặc truy vấn → reject với lỗi
                    reject(new Error('Database connection error'));
                }
                if (result == undefined || result.length === 0) {
                    // Nếu không tìm thấy bản ghi → reject (không có giỏ hàng)
                    // Lưu ý: result không bao giờ là undefined, nên kiểm tra result.length === 0 là đủ
                    reject();
                } else {
                    // Trả về bản ghi đầu tiên (vì user_id là unique)
                    // result[0] = { content: '{"id":1,"quantity":2}' }
                    resolve(result[0]);
                }
            });
        });
    }

    /**
     * Thêm sản phẩm vào giỏ hàng
     * @param {Array} newProducts - Mảng sản phẩm mới: [{id, size, quantity}, ...]
     * @param {string|number} user - ID người dùng
     * @returns {Promise<string>} - "Added to the cart!"
     */
    addToCart(newProducts, user) {
        return new Promise(async (resolve, reject) => {
            try {
                // B1: Lấy giỏ hàng hiện tại từ DB
                let cartContent = await this.getContent(user);
                // cartContent.content là chuỗi JSON → cần parse thành mảng
                // Lưu ý: Code gốc quên JSON.parse → sẽ lỗi vì cartProducts là string!
                let cartProducts = cartContent.content;

                // B2: Duyệt từng sản phẩm trong giỏ và sản phẩm mới
                for (let cartProduct of cartProducts) {
                    for (let newProduct of newProducts) {
                        // Nếu cùng id và size → cộng dồn số lượng
                        if (cartProduct.id == newProduct.id && cartProduct.size == newProduct.size) {
                            cartProduct.quantity = newProduct.quantity + cartProduct.quantity;
                            // Xóa sản phẩm mới khỏi danh sách (vì đã gộp)
                            let index = newProducts.indexOf(newProduct);
                            newProducts.splice(index, 1);
                            // Không giảm i vì dùng for...of → vẫn ổn
                        }
                    }
                }

                // B3: Gộp sản phẩm cũ + sản phẩm mới còn lại → chuyển thành JSON string
                cartProducts = JSON.stringify(cartProducts.concat(newProducts));

                // B4: Cập nhật lại vào DB (dùng parameterized query → an toàn)
                this.con.query('UPDATE `cart` SET `content` = ? WHERE `user_id` = ?', [cartProducts, user], function (err, result) {
                    if (err) reject(new Error('Database connection error'));
                    resolve('Added to the cart!');
                });

            } catch {
                // Nếu giỏ hàng chưa tồn tại (getContent reject) → tạo mới
                let cartRow = {
                    user_id: user,
                    content: JSON.stringify(newProducts) // Chuyển mảng thành chuỗi JSON
                };
                // INSERT bản ghi mới vào bảng cart
                this.con.query('INSERT INTO `cart` SET ?', cartRow, function (err, result) {
                    if (err) reject(new Error('Database connection error'));
                    resolve('Added to the cart!');
                });
            }
        });
    }

    /**
     * Cập nhật số lượng sản phẩm trong giỏ
     * @param {Object} updateProduct - {id, size, quantity}
     * @param {string|number} user - ID người dùng
     * @returns {Promise<string>} - "Added to the cart!" (thực ra là updated)
     */
    update(updateProduct, user) {
        return new Promise(async (resolve, reject) => {
            try {
                // Lấy giỏ hàng hiện tại
                let cartContent = await this.getContent(user);
                let cartProducts = cartContent.content; // Lưu ý: vẫn là chuỗi JSON
                let found = false;

                // Duyệt từng sản phẩm trong giỏ
                for (let cartProduct of cartProducts) {
                    if (cartProduct.id == updateProduct.id && cartProduct.size == updateProduct.size) {
                        found = true;
                        if (updateProduct.quantity > 0) {
                            // Cập nhật số lượng mới
                            cartProduct.quantity = updateProduct.quantity;
                        } else {
                            // Nếu quantity <= 0 → xóa sản phẩm
                            let index = cartProducts.indexOf(cartProduct);
                            cartProducts.splice(index, 1);
                        }
                        // Thoát vòng lặp sau khi xử lý xong (tùy chọn)
                    }
                }

                // Nếu không tìm thấy → thêm mới (hành vi như add)
                if (!found && updateProduct.quantity > 0) {
                    cartProducts.push(updateProduct);
                }

                // Chuyển mảng thành JSON string để lưu DB
                cartProducts = JSON.stringify(cartProducts);

                // Cập nhật DB
                this.con.query('UPDATE `cart` SET `content` = ? WHERE `user_id` = ?', [cartProducts, user], function (err, result) {
                    if (err) reject(new Error('Database connection error'));
                    resolve('Added to the cart!'); // Nên đổi thành "Updated!"
                });

            } catch (err) {
                // In lỗi ra console để debug
                console.log(err);
                reject(new Error('Could not access cart'));
            }
        });
    }

    /**
     * Xóa toàn bộ giỏ hàng của người dùng
     * @param {string|number} user - ID người dùng
     * @returns {Promise<string>} - "Cart emptied"
     */
    empty(user) {
        return new Promise((resolve, reject) => {
            // Xóa bản ghi trong bảng cart theo user_id
            // CẢNH BÁO: Dễ bị SQL Injection
            this.con.query('DELETE FROM `cart` WHERE `user_id` ="'+user+'"', function (err, result) {
                if (err) {
                    reject(new Error('Database connection error'));
                } else {
                    resolve('Cart emptied');
                }
            });
        });
    }
}

// Xuất class để các file khác có thể sử dụng
// Ví dụ: const ProductsController = require('./controllers/ProductsController');
// const cart = new ProductsController();
module.exports = controller;