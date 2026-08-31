const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.verifyConnection = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.query("SELECT 1");
    const [permissionColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'permissions'`
    );
    if (!permissionColumns.length) {
      await connection.query("ALTER TABLE users ADD COLUMN permissions JSON NULL AFTER role");
    }
  } finally {
    connection.release();
  }
};

module.exports = pool;
