// ================================================
// FILE: check-env.js (Đặt ở thư mục gốc)
// Mục đích: Kiểm tra cấu hình .env và MySQL
// ================================================

require('dotenv').config();

console.log('\n=== 1️⃣ KIỂM TRA FILE .ENV ===\n');

const hasHost = process.env.DATABASE_HOST;
const hasUser = process.env.DATABASE_USER;
const hasPass = process.env.DATABASE_PASS;
const hasName = process.env.DATABASE_NAME;

console.log('DATABASE_HOST:', hasHost || '❌ RỖNG hoặc không tồn tại');
console.log('DATABASE_USER:', hasUser || '❌ RỖNG hoặc không tồn tại');
console.log('DATABASE_PASS:', hasPass ? `✅ Có (${hasPass.length} ký tự)` : '❌ RỖNG hoặc không tồn tại');
console.log('DATABASE_NAME:', hasName || '❌ RỖNG hoặc không tồn tại');

if (!hasHost || !hasUser || !hasName) {
    console.log('\n❌ LỖI: File .env thiếu thông tin!');
    console.log('💡 Hãy tạo file .env ở thư mục gốc với nội dung:');
    console.log(`
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASS=your_password
DATABASE_NAME=ecommerce
    `);
    process.exit(1);
}

console.log('\n=== 2️⃣ KIỂM TRA CONFIG ===\n');

const config = require('./src/config/app-config.js');
console.log('Config sqlCon:', {
    host: config.sqlCon.host,
    user: config.sqlCon.user,
    password: config.sqlCon.password ? '***' : 'RỖNG',
    database: config.sqlCon.database
});

console.log('\n=== 3️⃣ TEST KẾT NỐI MYSQL ===\n');

const mysql = require('mysql2/promise');

async function testConnection() {
    let connection;
    try {
        console.log('🔄 Đang kết nối MySQL...');
        connection = await mysql.createConnection(config.sqlCon);
        console.log('✅ Kết nối MySQL THÀNH CÔNG!\n');
        
        const [rows] = await connection.execute('SELECT COUNT(*) as total FROM products');
        console.log(`📊 Số sản phẩm hiện có: ${rows[0].total}`);
        
        const [sizes] = await connection.execute('SELECT COUNT(*) as total FROM sizes');
        console.log(`📊 Số sizes hiện có: ${sizes[0].total}`);
        
        console.log('\n✅ SẴN SÀNG CHẠY SCRIPT SEED!');
        
    } catch (error) {
        console.error('❌ KẾT NỐI THẤT BẠI!\n');
        console.error('Lỗi:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('\n💡 NGUYÊN NHÂN: Sai username hoặc password');
            console.log('📝 CÁCH SỬA:');
            console.log('   1. Kiểm tra file .env có đúng username/password không');
            console.log('   2. Test login MySQL: mysql -u root -p');
            console.log('   3. Nếu login thành công, copy username/password vào .env');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 NGUYÊN NHÂN: MySQL chưa chạy');
            console.log('📝 CÁCH SỬA:');
            console.log('   1. Mở XAMPP/WAMP/MAMP');
            console.log('   2. Start MySQL');
            console.log('   3. Chạy lại script này');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n💡 NGUYÊN NHÂN: Database "ecommerce" chưa tồn tại');
            console.log('📝 CÁCH SỬA:');
            console.log('   1. Login MySQL: mysql -u root -p');
            console.log('   2. Tạo database: CREATE DATABASE ecommerce;');
            console.log('   3. Chạy populate: node src/database/populate.js');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testConnection();