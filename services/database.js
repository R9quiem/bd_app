const sqlite3 = require('sqlite3').verbose();
const dbpath = './data/touroperator.db';
// Функция для выполнения SQL-запроса в виде промиса

const db = new sqlite3.Database(dbpath, err => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});



module.exports = db;