const mysql = require('mysql2');
const config = require('./config/app-config.js');

const con = mysql.createConnection(config.populateCon);

con.connect(err => {
  if (err) {
    console.error('Connection failed:', err.message);
    return;
  }
  console.log('Connected to MySQL!');
  con.end();
});
