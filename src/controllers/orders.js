const config = require('../config/app-config.js');
const mysql = require('mysql2');

const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'];

const controller = class OrdersController {
    constructor() {
        this.con = mysql.createConnection(config.sqlCon);
    }

    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.con.query(sql, params, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async create(orderData) {
        try {
            const result = await this.runQuery('INSERT INTO orders SET ?', orderData);
            return result.insertId;
        } catch (err) {
            throw new Error('Database connection error');
        }
    }

    async saveOrderProducts(orderId, cartContent) {
        if (!Array.isArray(cartContent) || cartContent.length === 0) {
            return;
        }

        const payload = cartContent.map((item) => {
            const productId = parseInt(item.id || item.product_id, 10);
            const quantity = parseInt(item.quantity, 10);
            const size = item.size;
            const unitPrice = Number(item.unit_price || 0);
            const lineTotal = Number(item.line_total || unitPrice * quantity);

            return [orderId, productId, quantity, size, unitPrice, lineTotal];
        });

        return this.runQuery(
            'INSERT INTO orders_items (order_id, product_id, quantity, size, unit_price, line_total) VALUES ?',
            [payload]
        );
    }

    async getStatusTotals() {
        const rows = await this.runQuery('SELECT status, COUNT(*) AS total FROM orders GROUP BY status');
        const totalOrders = rows.reduce((acc, row) => acc + row.total, 0);
        return { totalOrders, breakdown: rows };
    }

    async getMonthlyTrend(months = 6) {
        const fromDate = new Date();
        fromDate.setMonth(fromDate.getMonth() - (months - 1));
        const formatted = fromDate.toISOString().slice(0, 10);

        return this.runQuery(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
             FROM orders
             WHERE created_at >= ?
             GROUP BY month
             ORDER BY month ASC`,
            [formatted]
        );
    }

    async getTopSellingProducts(limit = 8) {
        return this.runQuery(
            `SELECT p.id, p.title, SUM(oi.quantity) AS total_quantity, SUM(oi.line_total) AS revenue
             FROM orders_items oi
             JOIN products p ON p.id = oi.product_id
             GROUP BY p.id, p.title
             ORDER BY total_quantity DESC
             LIMIT ?`,
            [limit]
        );
    }

    async getAdminList({ page = 1, limit = 12, status, search } = {}) {
        const filters = [];
        const params = [];

        if (status && status !== 'all') {
            filters.push('o.status = ?');
            params.push(status);
        }

        if (search) {
            const likeTerm = `%${search}%`;
            const searchConditions = ['u.name LIKE ?', 'u.email LIKE ?'];
            const searchParams = [likeTerm, likeTerm];

            const numericId = parseInt(search, 10);
            if (!Number.isNaN(numericId)) {
                searchConditions.push('o.id = ?');
                searchParams.push(numericId);
            }

            filters.push(`(${searchConditions.join(' OR ')})`);
            params.push(...searchParams);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const offset = (page - 1) * limit;

        const countRows = await this.runQuery(
            `SELECT COUNT(*) AS total
             FROM orders o
             JOIN users u ON u.id = o.costumer_id
             ${whereClause}`,
            params
        );
        const total = countRows?.[0]?.total || 0;

        const listRows = await this.runQuery(
            `SELECT o.*, u.name AS customer_name, u.email AS customer_email, COUNT(oi.id) AS items_count
             FROM orders o
             JOIN users u ON u.id = o.costumer_id
             LEFT JOIN orders_items oi ON oi.order_id = o.id
             ${whereClause}
             GROUP BY o.id
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            orders: listRows,
            pagination: {
                page,
                total,
                pages: Math.max(1, Math.ceil(total / limit))
            }
        };
    }

    async getOrderDetail(orderId) {
        const orders = await this.runQuery(
            `SELECT o.*, u.name AS customer_name, u.email AS customer_email
             FROM orders o
             JOIN users u ON u.id = o.costumer_id
             WHERE o.id = ?
             LIMIT 1`,
            [orderId]
        );

        if (!orders.length) {
            throw new Error('Order not found');
        }

        const items = await this.runQuery(
            `SELECT oi.*, p.title
             FROM orders_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        return { order: orders[0], items };
    }

    async updateStatus(orderId, status) {
        if (!ORDER_STATUSES.includes(status)) {
            throw new Error('Invalid status');
        }
        await this.runQuery('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        return 'Status updated';
    }
};

controller.ORDER_STATUSES = ORDER_STATUSES;

module.exports = controller;