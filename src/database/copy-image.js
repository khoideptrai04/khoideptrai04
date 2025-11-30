// ================================================
// SCRIPT TẠO ẢNH MẶC ĐỊNH CHO 300 SẢN PHẨM
// Đường dẫn: src/database/copy-default-images.js
// ================================================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Đường dẫn ảnh
const imagesDir = path.join(__dirname, '../../public/images/products');
const defaultImage = path.join(imagesDir, 'default.jpg');

// Kết nối DB (hardcode)npm
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '30082004',
    database: 'ecommerce'
};

async function copyDefaultImages() {
    let connection;
    
    try {
        console.log('🚀 Bắt đầu tạo ảnh mặc định cho sản phẩm...\n');
        
        // Kiểm tra thư mục và file default
        if (!fs.existsSync(imagesDir)) {
            console.error('❌ Thư mục không tồn tại:', imagesDir);
            console.log('💡 Tạo thư mục...');
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        if (!fs.existsSync(defaultImage)) {
            console.error('❌ File default.jpg không tồn tại!');
            console.log('💡 Bạn cần có file default.jpg trong thư mục public/images/products/');
            return;
        }
        
        console.log('✅ Thư mục ảnh:', imagesDir);
        console.log('✅ File default.jpg tồn tại\n');
        
        // Kết nối DB
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Đã kết nối MySQL!\n');
        
        // Lấy danh sách tất cả product ID
        const [products] = await connection.execute('SELECT id FROM products ORDER BY id');
        console.log(`📊 Tìm thấy ${products.length} sản phẩm\n`);
        
        let copiedCount = 0;
        let skippedCount = 0;
        
        // Copy ảnh cho từng sản phẩm (3 ảnh mỗi sản phẩm)
        for (const product of products) {
            const productId = product.id;
            
            for (let i = 1; i <= 3; i++) {
                const targetImage = path.join(imagesDir, `${productId}-${i}.jpg`);
                
                // Nếu ảnh chưa tồn tại → copy từ default
                if (!fs.existsSync(targetImage)) {
                    fs.copyFileSync(defaultImage, targetImage);
                    copiedCount++;
                } else {
                    skippedCount++;
                }
            }
            
            // Hiển thị tiến trình mỗi 50 sản phẩm
            if (productId % 50 === 0) {
                console.log(`   ⏳ Đã xử lý ${productId} sản phẩm...`);
            }
        }
        
        console.log('\n✨ HOÀN TẤT! ✨');
        console.log(`📊 Tổng số ảnh đã copy: ${copiedCount}`);
        console.log(`📊 Ảnh đã tồn tại (bỏ qua): ${skippedCount}`);
        console.log(`📂 Vị trí: ${imagesDir}\n`);
        
    } catch (error) {
        console.error('\n❌ LỖI:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('👋 Đã đóng kết nối MySQL!');
        }
    }
}

// Chạy script
copyDefaultImages().catch(error => {
    console.error('\n💥 Script thất bại!');
    process.exit(1);
});