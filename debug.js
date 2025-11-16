console.log('=== TEST .ENV ===\n');

// Test 1: Load .env
require('dotenv').config();

console.log('1. Biến môi trường:');
console.log('   DATABASE_HOST:', process.env.DATABASE_HOST || '❌ UNDEFINED');
console.log('   DATABASE_USER:', process.env.DATABASE_USER || '❌ UNDEFINED');
console.log('   DATABASE_PASS:', process.env.DATABASE_PASS ? '✅ Có' : '❌ UNDEFINED');
console.log('   DATABASE_NAME:', process.env.DATABASE_NAME || '❌ UNDEFINED');

// Test 2: Load config
console.log('\n2. Config object:');
const config = require('./src/config/app-config.js');
console.log('   config.sqlCon:', config.sqlCon);

// Test 3: Kiểm tra file .env
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');

console.log('\n3. File .env:');
console.log('   Path:', envPath);
console.log('   Exists:', fs.existsSync(envPath) ? '✅ Có' : '❌ Không');

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('   Lines:', content.split('\n').length);
    console.log('   First line:', content.split('\n')[0]);
}

// Test 4: Kết nối MySQL
const mysql = require('mysql2/promise');

async function testDB() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '30082004',  // ← SỬA PASSWORD
            database: 'ecommerce'
        });
        console.log('\n4. MySQL: ✅ Kết nối thành công!');
        await connection.end();
    } catch (error) {
        console.log('\n4. MySQL: ❌', error.message);
    }
}

testDB();