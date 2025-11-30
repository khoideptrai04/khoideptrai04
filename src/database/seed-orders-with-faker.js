// ================================================
// SCRIPT SEED 500 ĐƠN HÀNG VỚI FAKER.JS
// Cập nhật: Phù hợp 100% với cấu trúc bảng
// ================================================

const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');

// Cấu hình kết nối
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '30082004',
    database: 'ecommerce',
    charset: 'utf8mb4'
};

// Danh sách trạng thái đơn hàng (khớp với ENUM trong bảng)
const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

// Danh sách phương thức thanh toán
const PAYMENT_METHODS = ['card', 'apple-pay', 'google-pay', 'paypal', 'cash'];

// Hàm chọn ngẫu nhiên từ mảng
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Lấy dữ liệu tham chiếu (users, products, sizes)
async function buildReferenceData(connection) {
    // Lấy danh sách users
    const [users] = await connection.query('SELECT id, name, email FROM users');
    if (!users.length) {
        throw new Error('❌ Không tìm thấy user nào! Cần có ít nhất 1 user.');
    }

    // Lấy danh sách sản phẩm và sizes có stock > 0
    const [sizes] = await connection.query(`
        SELECT 
            products.id AS product_id,
            products.title,
            sizes.size,
            sizes.price,
            sizes.stock
        FROM sizes
        JOIN products ON products.id = sizes.product_id
        WHERE sizes.stock > 0
    `);

    if (!sizes.length) {
        throw new Error('❌ Không có sản phẩm nào có stock > 0!');
    }

    return { users, sizes };
}

// Tạo danh sách items cho 1 đơn hàng
function buildOrderItems(sizePool) {
    const items = [];
    const itemCount = faker.number.int({ min: 1, max: 5 }); // 1-5 sản phẩm mỗi đơn
    
    for (let i = 0; i < itemCount; i++) {
        const sizeItem = pickRandom(sizePool);
        const quantity = faker.number.int({ min: 1, max: 3 }); // 1-3 số lượng
        const unitPrice = parseFloat(sizeItem.price);
        const lineTotal = parseFloat((unitPrice * quantity).toFixed(2));
        
        items.push({
            product_id: sizeItem.product_id,
            size: sizeItem.size,
            quantity: quantity,
            unit_price: unitPrice,
            line_total: lineTotal
        });
    }
    
    return items;
}

// Tạo payload cho bảng orders
function buildOrderPayload(userId, items) {
    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);
    const paymentMethod = pickRandom(PAYMENT_METHODS);
    
    // Tạo số thẻ giả (4 số cuối)
    const cardLast4 = faker.finance.creditCardNumber('####').slice(-4);
    
    // Tạo địa chỉ
    const address = faker.location.streetAddress();
    const city = faker.location.city();
    const state = faker.location.state();
    const zip = faker.location.zipCode();
    
    // Tạo thời gian trong 180 ngày gần đây
    const createdAt = faker.date.recent({ days: 180 });
    
    return {
        costumer_id: userId,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        status: pickRandom(ORDER_STATUSES),
        payment_method: paymentMethod,
        payment_last4: cardLast4,
        address: address,
        city: city,
        state: state,
        zip: zip,
        created_at: createdAt
    };
}

// Hàm seed orders
async function seedOrders(amount = 500) {
    let connection;
    
    try {
        console.log('\n🚀 Bắt đầu tạo ' + amount + ' đơn hàng...\n');
        
        // Kết nối database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Đã kết nối MySQL!\n');

        // Lấy dữ liệu tham chiếu
        const { users, sizes } = await buildReferenceData(connection);
        console.log(`📊 Tìm thấy ${users.length} users`);
        console.log(`📊 Tìm thấy ${sizes.length} product variations\n`);

        const startTime = Date.now();
        let successCount = 0;
        let itemsCount = 0;

        // Bắt đầu transaction
        await connection.beginTransaction();

        for (let i = 0; i < amount; i++) {
            try {
                // Chọn user ngẫu nhiên
                const user = pickRandom(users);
                
                // Tạo items cho đơn hàng
                const items = buildOrderItems(sizes);

                // Tạo payload order
                const orderPayload = buildOrderPayload(user.id, items);

                // 1. INSERT vào bảng orders
                const [orderResult] = await connection.query(
                    'INSERT INTO orders SET ?',
                    orderPayload
                );
                
                const orderId = orderResult.insertId;

                // 2. INSERT vào bảng orders_items (bảng có id AUTO_INCREMENT)
                for (const item of items) {
                    await connection.query(
                        `INSERT INTO orders_items (order_id, product_id, quantity, size, unit_price, line_total) 
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            orderId,
                            item.product_id,
                            item.quantity,
                            item.size,
                            item.unit_price,
                            item.line_total
                        ]
                    );
                }

                successCount++;
                itemsCount += items.length;

                // Hiển thị tiến trình mỗi 50 đơn
                if ((i + 1) % 50 === 0) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
                    console.log(`   ⏳ Đã tạo ${i + 1}/${amount} đơn (${elapsed}s)`);
                }

            } catch (error) {
                console.error(`   ❌ Lỗi tạo đơn ${i + 1}: ${error.message}`);
            }
        }

        // Commit transaction
        await connection.commit();

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // Thống kê chi tiết
        const [totalOrders] = await connection.query('SELECT COUNT(*) as total FROM orders');
        const [totalItems] = await connection.query('SELECT COUNT(*) as total FROM orders_items');
        const [totalRevenue] = await connection.query(
            'SELECT SUM(total_amount) as revenue FROM orders WHERE status IN ("paid", "shipped", "delivered")'
        );
        const [avgOrderValue] = await connection.query('SELECT AVG(total_amount) as avg FROM orders');

        // Chuyển Decimal thành số
        const revenue = totalRevenue[0].revenue ? parseFloat(totalRevenue[0].revenue) : 0;
        const avgValue = avgOrderValue[0].avg ? parseFloat(avgOrderValue[0].avg) : 0;

        console.log('\n✨ HOÀN TẤT! ✨');
        console.log(`📊 Đơn tạo thành công: ${successCount}`);
        console.log(`📊 Tổng items đã thêm: ${itemsCount}`);
        console.log(`📊 Tổng đơn hàng trong DB: ${totalOrders[0].total}`);
        console.log(`📊 Tổng order items trong DB: ${totalItems[0].total}`);
        console.log(`💰 Tổng doanh thu (paid/shipped/delivered): ${revenue.toFixed(2)}`);
        console.log(`💵 Giá trị trung bình mỗi đơn: ${avgValue.toFixed(2)}`);
        console.log(`⏱️  Thời gian: ${totalTime}s`);
        console.log(`⚡ Tốc độ: ${(successCount / totalTime).toFixed(2)} đơn/giây\n`);

        // Thống kê theo trạng thái
        console.log('📈 Thống kê theo trạng thái:');
        const [statusStats] = await connection.query(`
            SELECT 
                status, 
                COUNT(*) as count, 
                SUM(total_amount) as total,
                AVG(total_amount) as avg
            FROM orders
            GROUP BY status
            ORDER BY count DESC
        `);
        
        statusStats.forEach(stat => {
            const total = stat.total ? parseFloat(stat.total) : 0;
            const avg = stat.avg ? parseFloat(stat.avg) : 0;
            console.log(`   ${stat.status.padEnd(12)}: ${String(stat.count).padStart(4)} đơn - ${total.toFixed(2)} (avg: ${avg.toFixed(2)})`);
        });

        // Thống kê theo phương thức thanh toán
        console.log('\n💳 Thống kê theo phương thức thanh toán:');
        const [paymentStats] = await connection.query(`
            SELECT 
                payment_method, 
                COUNT(*) as count,
                SUM(total_amount) as total
            FROM orders
            WHERE payment_method IS NOT NULL
            GROUP BY payment_method
            ORDER BY count DESC
        `);
        
        paymentStats.forEach(stat => {
            const total = stat.total ? parseFloat(stat.total) : 0;
            console.log(`   ${(stat.payment_method || 'N/A').padEnd(12)}: ${String(stat.count).padStart(4)} đơn - ${total.toFixed(2)}`);
        });

        // 5 đơn hàng mới nhất
        console.log('\n📝 5 đơn hàng mới nhất:');
        const [samples] = await connection.query(`
            SELECT 
                o.id,
                o.costumer_id,
                u.name,
                o.total_amount,
                o.status,
                o.payment_method,
                o.city,
                o.state,
                COUNT(oi.id) as items_count
            FROM orders o
            LEFT JOIN users u ON o.costumer_id = u.id
            LEFT JOIN orders_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.id DESC
            LIMIT 5
        `);
        
        samples.forEach((order, index) => {
            console.log(`\n${index + 1}. Order #${order.id} - [${order.status.toUpperCase()}]`);
            console.log(`   Khách hàng: ${order.name} (ID: ${order.costumer_id})`);
            console.log(`   Tổng tiền: $${order.total_amount}`);
            console.log(`   Số items: ${order.items_count}`);
            console.log(`   Thanh toán: ${order.payment_method || 'N/A'}`);
            console.log(`   Địa chỉ: ${order.city}, ${order.state}`);
        });

        // Chi tiết items của đơn đầu tiên
        if (samples.length > 0) {
            const firstOrderId = samples[0].id;
            console.log(`\n📦 Chi tiết items của Order #${firstOrderId}:`);
            
            const [itemDetails] = await connection.query(`
                SELECT 
                    oi.id,
                    p.title,
                    oi.size,
                    oi.quantity,
                    oi.unit_price,
                    oi.line_total
                FROM orders_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `, [firstOrderId]);
            
            itemDetails.forEach((item, idx) => {
                console.log(`   ${idx + 1}. ${item.title} (${item.size}) x${item.quantity} = $${item.line_total} (@$${item.unit_price})`);
            });
        }

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('\n❌ LỖI:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n👋 Đã đóng kết nối MySQL!');
        }
    }
}

// Chạy script
console.log('════════════════════════════════════════════════════');
console.log('   🛒 ORDER SEEDER WITH FAKER.JS');
console.log('   Database: ecommerce');
console.log('════════════════════════════════════════════════════');

// Có thể thay đổi số lượng đơn hàng ở đây
seedOrders(500).catch(error => {
    console.error('\n💥 Script thất bại!');
    process.exit(1);
});