
# Node.js E-commerce Application

## 🌐 Application URLs

### Frontend (Public Pages)
- **Main Website**: http://localhost:3000
- **Login Page**: http://localhost:3000/login
- **Register Page**: http://localhost:3000/register
- **Products Page**: http://localhost:3000/hamburguers
- **Cart Page**: http://localhost:3000/cart
- **Checkout Page**: http://localhost:3000/checkout

### Admin Dashboard
- **Admin Dashboard**: http://localhost:3000/dashboard
- **Products Management**: http://localhost:3000/dashboard/products
- **Add New Product**: http://localhost:3000/dashboard/products/add
- **Orders Management**: http://localhost:3000/dashboard/orders
- **Order Detail**: http://localhost:3000/dashboard/orders/:id
- **Accounts Management**: http://localhost:3000/dashboard/accounts
- **Add New Account**: http://localhost:3000/dashboard/accounts/add

## 📦 Order seeding

Need realistic analytics data? Run the Faker seeder to generate ~500 orders plus their line items:

```bash
npm install
node src/database/seed-orders-with-faker.js
```

The script pulls all existing users/products, creates random carts, stores shipping + payment metadata, and updates `orders` + `orders_items`. Re-run whenever you want a fresh dataset (it wraps everything in a single transaction).

## 📊 Admin dashboard highlights

- **Live KPIs & charts** for users, monthly orders (last 6 months) and the 8 best-selling products (bar chart) directly on `/dashboard`.
- **Orders module** with filters, inline status updates, pagination, and detailed drill-down pages.
- **Shipping + payment context** stored per order so you can act on customer issues from the back-office.

## 🔐 Login Credentials

The database script populates some **users** with different roles. Use the following examples:

### Regular User
```
email: user@user.com
password: 123456
```

### Employee
```
email: employee@employee.com
password: 123456
```

### Admin
```
email: admin@admin.com
password: 123456
````
## Run on:http://localhost:3000

