const pool = require('./db');

pool.query('SELECT NOW()')
  .then(res => {
    console.log('Connected! Database time is:', res.rows[0].now);
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });