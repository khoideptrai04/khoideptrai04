// ================================================
// SCRIPT SEED 300 SẢN PHẨM VỚI FAKER.JS
// ================================================

const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');

// Danh sách từ khóa burger
const burgerTypes = ['Classic', 'Deluxe', 'Premium', 'Gourmet', 'Supreme', 'Ultimate', 'Special', 'Signature'];
const ingredients = [
    'Bacon', 'Mushroom', 'Avocado', 'Jalapeño', 'Blue Cheese', 'Swiss Cheese', 
    'Cheddar', 'BBQ', 'Teriyaki', 'Truffle', 'Pesto', 'Chipotle', 'Buffalo',
    'Ranch', 'Garlic', 'Pepper Jack', 'Onion Ring', 'Egg', 'Pineapple', 'Feta'
];
const styles = ['American', 'Mexican', 'Italian', 'Asian', 'Mediterranean', 'Southern', 'Texan', 'Hawaiian', 'Greek'];

// Hàm tạo tên burger ngẫu nhiên
function generateBurgerName() {
    const type = burgerTypes[Math.floor(Math.random() * burgerTypes.length)];
    const ingredient = ingredients[Math.floor(Math.random() * ingredients.length)];
    return `${type} ${ingredient} Burger`;
}

// Hàm tạo mô tả burger
function generateBurgerDescription() {
    const ingredients1 = ingredients[Math.floor(Math.random() * ingredients.length)];
    const ingredients2 = ingredients[Math.floor(Math.random() * ingredients.length)];
    const ingredients3 = ingredients[Math.floor(Math.random() * ingredients.length)];
    const style = styles[Math.floor(Math.random() * styles.length)];
    
    const descriptions = [
        `${style} style burger with ${ingredients1}, ${ingredients2}, ${ingredients3}, fresh lettuce and tomato.`,
        `Juicy beef patty topped with ${ingredients1}, ${ingredients2}, special sauce and crispy ${ingredients3}.`,
        `Handcrafted ${style} burger featuring ${ingredients1}, ${ingredients2}, ${ingredients3} and our signature blend.`,
        `Premium ${style} creation with ${ingredients1}, ${ingredients2}, ${ingredients3} served on a toasted bun.`,
        `Mouth-watering combination of ${ingredients1}, ${ingredients2}, ${ingredients3} with house-made condiments.`
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// Hàm tạo giá ngẫu nhiên
function randomPrice(min, max) {
    return (Math.random() * (max - min) + min).toFixed(2);
}

// Hàm tạo stock ngẫu nhiên
function randomStock(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedWithFaker() {
    let connection;
    
    try {
        console.log('🔄 Đang kết nối MySQL...\n');
        
        // Kết nối MySQL với thông tin hardcode
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '30082004',
            database: 'ecommerce',
            charset: 'utf8mb4'
        });
        
        console.log('✅ Đã kết nối MySQL thành công!\n');
        console.log('🍔 Đang tạo 300 sản phẩm burger...\n');

        const startTime = Date.now();
        let productCount = 0;

        // Tạo 300 sản phẩm
        for (let i = 1; i <= 300; i++) {
            const title = generateBurgerName();
            const description = generateBurgerDescription();
            
            // Thêm sản phẩm
            const [result] = await connection.execute(
                'INSERT INTO products (title, description) VALUES (?, ?)',
                [title, description]
            );
            
            const productId = result.insertId;
            
            // Thêm 3 sizes cho mỗi sản phẩm
            await connection.execute(
                `INSERT INTO sizes (product_id, size, price, stock) VALUES 
                (?, 'LARGE', ?, ?),
                (?, 'MEDIUM', ?, ?),
                (?, 'SMALL', ?, ?)`,
                [
                    productId, randomPrice(10, 15), randomStock(5, 25),
                    productId, randomPrice(8, 12), randomStock(5, 30),
                    productId, randomPrice(6, 10), randomStock(5, 35)
                ]
            );
            
            productCount++;
            
            // Hiển thị tiến trình
            if (i % 50 === 0) {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`   ⏳ Đã thêm ${i}/300 sản phẩm (${elapsed}s)`);
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // Kiểm tra kết quả
        const [products] = await connection.execute('SELECT COUNT(*) as total FROM products');
        const [sizes] = await connection.execute('SELECT COUNT(*) as total FROM sizes');
        
        console.log('\n✨ HOÀN TẤT! ✨');
        console.log(`📊 Tổng số sản phẩm: ${products[0].total}`);
        console.log(`📊 Tổng số sizes: ${sizes[0].total}`);
        console.log(`⏱️  Thời gian: ${totalTime}s`);
        console.log(`⚡ Tốc độ: ${(productCount / totalTime).toFixed(2)} sản phẩm/giây`);

        // Hiển thị 5 sản phẩm mẫu
        console.log('\n📝 5 sản phẩm mẫu:');
        const [samples] = await connection.execute(
            'SELECT id, title, description FROM products ORDER BY id DESC LIMIT 5'
        );
        samples.forEach((product, index) => {
            console.log(`\n${index + 1}. ${product.title}`);
            console.log(`   ${product.description}`);
        });

    } catch (error) {
        console.error('\n❌ LỖI:', error.message);
        console.error('Code:', error.code);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Sai username hoặc password MySQL!');
            console.error('   Hãy sửa dòng 63-66 trong file này');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 MySQL chưa chạy! Hãy start MySQL trong XAMPP/WAMP');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('\n💡 Database "ecommerce" chưa tồn tại!');
            console.error('   Chạy: node ../database/populate.js');
        }
        
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n👋 Đã đóng kết nối MySQL!');
        }
    }
}

// Chạy script
console.log('🚀 Bắt đầu seed 300 sản phẩm burger...\n');
seedWithFaker().catch(error => {
    console.error('\n💥 Script thất bại!');
    process.exit(1);
});