document.addEventListener('DOMContentLoaded', function () {
    const dataHolder = document.getElementById('dashboard-data');
    if (!dataHolder) return;

    let dashboardData = {};
    try {
        dashboardData = JSON.parse(dataHolder.getAttribute('data-dashboard') || '{}');
    } catch (err) {
        console.warn('Invalid dashboard data payload', err);
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    const buildUserChart = () => {
        const canvas = document.getElementById('userChart');
        if (!canvas || !Array.isArray(dashboardData.users) || dashboardData.users.length === 0) return;

        const labels = dashboardData.users.map(item => item.type);
        const values = dashboardData.users.map(item => item.total);

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#007bff', '#6610f2', '#6f42c1', '#17a2b8', '#ffc107']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    };

    const buildOrderChart = () => {
        const canvas = document.getElementById('orderChart');
        const monthly = dashboardData.orders?.monthly;
        if (!canvas || !Array.isArray(monthly) || monthly.length === 0) return;

        const labels = monthly.map(item => item.month);
        const values = monthly.map(item => item.total);

        new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Orders',
                    data: values,
                    borderColor: '#dc3545',
                    tension: 0.3,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    };

    const buildProductChart = () => {
        const canvas = document.getElementById('productChart');
        if (!canvas || !Array.isArray(dashboardData.products) || dashboardData.products.length === 0) return;

        const labels = dashboardData.products.map(item => item.title);
        const values = dashboardData.products.map(item => item.total_quantity);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Units sold',
                    data: values,
                    backgroundColor: '#28a745'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    };

    buildUserChart();
    buildOrderChart();
    buildProductChart();
});





