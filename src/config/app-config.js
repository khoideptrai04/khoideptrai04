// Import module 'path' để xử lý đường dẫn file/folder một cách an toàn trên mọi hệ điều hành
const path = require('path');

// Load các biến môi trường từ file .env vào process.env
// Ví dụ: DATABASE_HOST=localhost sẽ có thể truy cập qua process.env.DATABASE_HOST
require('dotenv').config();

/**
 * Đối tượng config chứa toàn bộ cấu hình của ứng dụng
 * Sử dụng module.exports để có thể import ở các file khác bằng require()
 */
const config = {
    // Đường dẫn tuyệt đối đến thư mục gốc của dự án (lên 2 cấp từ file hiện tại)
    // __dirname là thư mục chứa file config này
    // '/../../' nghĩa là: từ file config.js -> lên thư mục cha -> lên thư mục gốc
    'root': path.join(__dirname, '/../../'),

    // Đường dẫn đến thư mục views (chứa file template: ejs, pug, html,...)
    'views': path.join(__dirname, '/../views'),

    // Đường dẫn đến thư mục controllers (chứa các file xử lý logic nghiệp vụ)
    'controllers': path.join(__dirname, '/../controllers'),

    // Cấu hình kết nối cơ sở dữ liệu MySQL (dùng cho các truy vấn thông thường)
    'sqlCon': {
        host: process.env.DATABASE_HOST,      // Ví dụ: 'localhost' hoặc '127.0.0.1'
        user: process.env.DATABASE_USER,      // Tên đăng nhập DB, ví dụ: 'root'
        password: process.env.DATABASE_PASS,  // Mật khẩu DB (bảo mật qua .env)
        database: process.env.DATABASE_NAME,  // Tên database, ví dụ: 'myapp_db'
        charset: 'utf8mb4'                    // Hỗ trợ đầy đủ Unicode (emoji, tiếng Việt có dấu)
    },

    // Cấu hình kết nối DB riêng cho việc populate (nhập dữ liệu lớn, script seed)
    // Thêm multipleStatements: true để cho phép chạy nhiều câu SQL cùng lúc (INSERT nhiều bản ghi)
    'populateCon': {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASS,
        database: process.env.DATABASE_NAME,
        charset: 'utf8mb4',
        multipleStatements: true  // Quan trọng: cho phép thực thi nhiều câu lệnh SQL trong 1 lần query
    }
};

// Xuất đối tượng config để các file khác có thể sử dụng
// Ví dụ: const config = require('./config'); ở file khác
module.exports = config;