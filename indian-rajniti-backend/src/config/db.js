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
    const [roleColumns] = await connection.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
    );
    if (roleColumns[0]?.COLUMN_TYPE?.toUpperCase().startsWith("ENUM(") && !roleColumns[0].COLUMN_TYPE.toUpperCase().includes("SUBADMIN")) {
      await connection.query(
        "ALTER TABLE users MODIFY COLUMN role ENUM('USER','ADMIN','SUBADMIN','EDITOR','AUTHOR','INVESTOR') NOT NULL DEFAULT 'USER'"
      );
    }

    const [stateColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'states'
       AND COLUMN_NAME IN ('image_url', 'current_cm_name', 'cm_image_url', 'opposition_leader_name', 'opposition_party', 'opposition_leader_image_url')`
    );
    const existingStateColumns = new Set(stateColumns.map((column) => column.COLUMN_NAME));
    if (!existingStateColumns.has("image_url")) {
      await connection.query("ALTER TABLE states ADD COLUMN image_url VARCHAR(2000) NULL AFTER capital");
    }
    if (!existingStateColumns.has("current_cm_name")) {
      await connection.query("ALTER TABLE states ADD COLUMN current_cm_name VARCHAR(200) NULL AFTER image_url");
    }
    if (!existingStateColumns.has("cm_image_url")) {
      await connection.query("ALTER TABLE states ADD COLUMN cm_image_url VARCHAR(2000) NULL AFTER current_cm_name");
    }
    if (!existingStateColumns.has("opposition_leader_name")) {
      await connection.query("ALTER TABLE states ADD COLUMN opposition_leader_name VARCHAR(200) NULL AFTER cm_image_url");
    }
    if (!existingStateColumns.has("opposition_party")) {
      await connection.query("ALTER TABLE states ADD COLUMN opposition_party VARCHAR(250) NULL AFTER opposition_leader_name");
    }
    if (!existingStateColumns.has("opposition_leader_image_url")) {
      await connection.query("ALTER TABLE states ADD COLUMN opposition_leader_image_url VARCHAR(2000) NULL AFTER opposition_party");
    }
  } finally {
    connection.release();
  }
};

module.exports = pool;
