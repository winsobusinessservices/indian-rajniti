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
    const [googleSubColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'google_sub'`
    );
    if (!googleSubColumns.length) {
      await connection.query("ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE AFTER password_hash");
    }
    const [acceptedPolicyColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'accepted_policy_ids'`
    );
    if (!acceptedPolicyColumns.length) {
      await connection.query("ALTER TABLE users ADD COLUMN accepted_policy_ids JSON NULL AFTER terms_accepted_at");
    }
    await connection.query(
      `CREATE TABLE IF NOT EXISTS editor_author_assignments (
        author_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        editor_id BIGINT UNSIGNED NOT NULL,
        assigned_by BIGINT UNSIGNED NULL,
        assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_editor_author_editor (editor_id)
      ) ENGINE=InnoDB`
    );
    for (const tableName of ["articles", "blogs"]) {
      const [scheduleColumns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'scheduled_publish_at'`,
        [tableName]
      );
      if (!scheduleColumns.length) {
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN scheduled_publish_at DATETIME NULL AFTER published_at`);
      }
    }
    for (const tableName of ["articles", "blogs", "videos"]) {
      const [commentSettingColumns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'comments_enabled'`,
        [tableName]
      );
      if (!commentSettingColumns.length) {
        await connection.query(
          `ALTER TABLE \`${tableName}\` ADD COLUMN comments_enabled TINYINT(1) NOT NULL DEFAULT 1`
        );
      }
    }
    await connection.query(
      `CREATE TABLE IF NOT EXISTS comments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        author_id BIGINT UNSIGNED NOT NULL,
        post_type ENUM('ARTICLE', 'BLOG', 'WORDPRESS') NOT NULL,
        post_id VARCHAR(100) NOT NULL,
        post_slug VARCHAR(255) NOT NULL,
        post_title VARCHAR(500) NOT NULL,
        content VARCHAR(1000) NOT NULL,
        status ENUM('VISIBLE', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
        hidden_by BIGINT UNSIGNED NULL,
        hidden_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_comments_post_status_created (post_slug, status, created_at),
        INDEX idx_comments_author (author_id, created_at)
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS content_daily_limits (
        role ENUM('AUTHOR', 'EDITOR') NOT NULL,
        content_type ENUM('ARTICLE', 'BLOG', 'VIDEO') NOT NULL,
        daily_limit INT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (role, content_type)
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `INSERT IGNORE INTO content_daily_limits (role, content_type, daily_limit)
       VALUES
         ('AUTHOR', 'ARTICLE', 5), ('AUTHOR', 'BLOG', 5), ('AUTHOR', 'VIDEO', 2),
         ('EDITOR', 'ARTICLE', 10), ('EDITOR', 'BLOG', 10), ('EDITOR', 'VIDEO', 5)`
    );
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

    await connection.query(
      `CREATE TABLE IF NOT EXISTS categories (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(140) NOT NULL UNIQUE,
        is_visible TINYINT(1) NOT NULL DEFAULT 1,
        content LONGTEXT NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_categories_name (name)
      ) ENGINE=InnoDB`
    );
    const [categoryVisibilityColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'is_visible'`
    );
    if (!categoryVisibilityColumns.length) {
      await connection.query("ALTER TABLE categories ADD COLUMN is_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER slug");
    }
    const [categoryContentColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'content'`
    );
    if (!categoryContentColumns.length) {
      await connection.query("ALTER TABLE categories ADD COLUMN content LONGTEXT NULL AFTER is_visible");
    }

    await connection.query(
      `CREATE TABLE IF NOT EXISTS policies (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(220) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        policy_type VARCHAR(100) NOT NULL,
        summary VARCHAR(600) NOT NULL,
        content LONGTEXT NOT NULL,
        status ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
        show_on_registration TINYINT(1) NOT NULL DEFAULT 0,
        created_by BIGINT UNSIGNED NOT NULL,
        published_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_policies_status_published (status, published_at),
        INDEX idx_policies_type (policy_type)
      ) ENGINE=InnoDB`
    );
    const [policyRegistrationColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'policies' AND COLUMN_NAME = 'show_on_registration'`
    );
    if (!policyRegistrationColumns.length) {
      await connection.query("ALTER TABLE policies ADD COLUMN show_on_registration TINYINT(1) NOT NULL DEFAULT 0 AFTER status");
    }

    await connection.query(
      `CREATE TABLE IF NOT EXISTS ui_sections (
        section_key VARCHAR(80) NOT NULL PRIMARY KEY,
        label VARCHAR(120) NOT NULL,
        is_visible TINYINT(1) NOT NULL DEFAULT 1,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    );
    const defaultSections = [
      ["breaking_news", "Breaking News"], ["hero_news", "Hero News"],
      ["top_stories", "Top Stories"], ["editorial_opinion", "Editorial Opinion"],
      ["latest_blogs", "Latest Blogs"], ["regional_focus", "Regional Focus"],
      ["in_depth_analysis", "In-Depth Analysis"], ["multimedia_hub", "Multimedia Hub"],
      ["key_figures", "Key Political Figures"], ["former_prime_ministers", "Former Prime Ministers"],
      ["voices_of_nation", "Voices of the Nation"], ["state_leadership", "State Leadership"],
      ["political_parties", "Indian Political Parties"], ["parliament", "Parliament"],
      ["digital_dispatches", "Digital Dispatches"], ["pm_corner", "Prime Minister's Corner"],
      ["press_conferences", "Press Conference Archive"], ["home_sidebar", "Homepage Sidebar"],
      ["popular_tags", "Popular Tags"],
    ];
    await connection.query(
      `INSERT IGNORE INTO ui_sections (section_key, label) VALUES ${defaultSections.map(() => "(?, ?)").join(", ")}`,
      defaultSections.flat()
    );

    // Wallet totals are kept separately from the immutable transaction
    // ledger. Point-awarding and withdrawal flows can update both in one
    // database transaction when those features are introduced.
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallets (
        user_id INT NOT NULL PRIMARY KEY,
        available_points BIGINT UNSIGNED NOT NULL DEFAULT 0,
        pending_withdrawal_points BIGINT UNSIGNED NOT NULL DEFAULT 0,
        lifetime_earned_points BIGINT UNSIGNED NOT NULL DEFAULT 0,
        lifetime_withdrawn_points BIGINT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallet_transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        direction ENUM('CREDIT', 'DEBIT') NOT NULL,
        category VARCHAR(40) NOT NULL,
        points BIGINT UNSIGNED NOT NULL,
        balance_after BIGINT UNSIGNED NOT NULL,
        status ENUM('PENDING', 'COMPLETED', 'REVERSED') NOT NULL DEFAULT 'COMPLETED',
        description VARCHAR(255) NOT NULL,
        reference_type VARCHAR(40) NULL,
        reference_id BIGINT NULL,
        metadata JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wallet_transactions_user_created (user_id, created_at, id),
        UNIQUE KEY uq_wallet_transaction_reference (user_id, category, reference_type, reference_id)
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallet_withdrawal_access (
        user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        is_enabled TINYINT(1) NOT NULL DEFAULT 0,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallet_withdrawal_settings (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        withdrawal_day TINYINT UNSIGNED NOT NULL DEFAULT 7,
        minimum_withdrawal_inr DECIMAL(14,2) UNSIGNED NOT NULL DEFAULT 1000.00,
        author_minimum_remaining_inr DECIMAL(14,2) UNSIGNED NOT NULL DEFAULT 200.00,
        editor_minimum_remaining_inr DECIMAL(14,2) UNSIGNED NOT NULL DEFAULT 500.00,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    );
    await connection.query(
      "INSERT IGNORE INTO wallet_withdrawal_settings (id, withdrawal_day) VALUES (1, 7)"
    );
    const [minimumWithdrawalColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_withdrawal_settings'
       AND COLUMN_NAME = 'minimum_withdrawal_inr'`
    );
    if (!minimumWithdrawalColumns.length) {
      await connection.query(
        "ALTER TABLE wallet_withdrawal_settings ADD COLUMN minimum_withdrawal_inr DECIMAL(14,2) UNSIGNED NOT NULL DEFAULT 1000.00 AFTER withdrawal_day"
      );
    }
    const [remainingBalanceColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_withdrawal_settings'
       AND COLUMN_NAME IN ('author_minimum_remaining_inr', 'editor_minimum_remaining_inr')`
    );
    const existingRemainingBalanceColumns = new Set(remainingBalanceColumns.map((column) => column.COLUMN_NAME));
    if (!existingRemainingBalanceColumns.has("author_minimum_remaining_inr")) {
      await connection.query(
        "ALTER TABLE wallet_withdrawal_settings ADD COLUMN author_minimum_remaining_inr DECIMAL(14,2) UNSIGNED NOT NULL DEFAULT 200.00 AFTER minimum_withdrawal_inr"
      );
    }
    if (!existingRemainingBalanceColumns.has("editor_minimum_remaining_inr")) {
      await connection.query(
        "ALTER TABLE wallet_withdrawal_settings ADD COLUMN editor_minimum_remaining_inr DECIMAL(14,2) UNSIGNED NOT NULL DEFAULT 500.00 AFTER author_minimum_remaining_inr"
      );
    }
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallet_point_rates (
        role ENUM('AUTHOR', 'EDITOR') NOT NULL PRIMARY KEY,
        rupees_per_point DECIMAL(10,4) UNSIGNED NOT NULL DEFAULT 1.0000,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `INSERT IGNORE INTO wallet_point_rates (role, rupees_per_point)
       VALUES ('AUTHOR', 1.0000), ('EDITOR', 1.0000)`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallet_reward_settings (
        role ENUM('AUTHOR', 'EDITOR') NOT NULL,
        content_type ENUM('ARTICLE', 'BLOG', 'VIDEO') NOT NULL,
        points INT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (role, content_type)
      ) ENGINE=InnoDB`
    );
    const [rewardRoleColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_reward_settings'
       AND COLUMN_NAME = 'role'`
    );
    if (!rewardRoleColumns.length) {
      await connection.query("ALTER TABLE wallet_reward_settings DROP PRIMARY KEY");
      await connection.query(
        "ALTER TABLE wallet_reward_settings ADD COLUMN role ENUM('AUTHOR', 'EDITOR') NOT NULL DEFAULT 'AUTHOR' FIRST"
      );
      await connection.query("ALTER TABLE wallet_reward_settings ADD PRIMARY KEY (role, content_type)");
      await connection.query(
        `INSERT IGNORE INTO wallet_reward_settings (role, content_type, points, updated_by)
         SELECT 'EDITOR', content_type, points, updated_by
         FROM wallet_reward_settings WHERE role = 'AUTHOR'`
      );
    }
    await connection.query(
      `INSERT IGNORE INTO wallet_reward_settings (role, content_type, points)
       VALUES
         ('AUTHOR', 'ARTICLE', 10), ('AUTHOR', 'BLOG', 10), ('AUTHOR', 'VIDEO', 5),
         ('EDITOR', 'ARTICLE', 10), ('EDITOR', 'BLOG', 10), ('EDITOR', 'VIDEO', 5)`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS editor_review_reward_settings (
        content_type ENUM('ARTICLE', 'BLOG', 'VIDEO') NOT NULL PRIMARY KEY,
        points INT UNSIGNED NOT NULL,
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`
    );
    await connection.query(
      `INSERT IGNORE INTO editor_review_reward_settings (content_type, points)
       VALUES ('ARTICLE', 1), ('BLOG', 1), ('VIDEO', 1)`
    );
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallet_bonus_awards (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        points INT UNSIGNED NOT NULL,
        reason VARCHAR(500) NOT NULL,
        content_type ENUM('ARTICLE', 'BLOG', 'VIDEO') NOT NULL,
        content_id BIGINT UNSIGNED NOT NULL,
        content_title VARCHAR(500) NOT NULL,
        content_slug VARCHAR(255) NULL,
        recipient_relationship ENUM('CREATOR', 'REVIEWER') NOT NULL,
        awarded_by BIGINT UNSIGNED NOT NULL,
        wallet_transaction_id BIGINT UNSIGNED NULL,
        acknowledged_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bonus_user_created (user_id, created_at),
        INDEX idx_bonus_content (content_type, content_id),
        UNIQUE KEY uq_bonus_transaction (wallet_transaction_id)
      ) ENGINE=InnoDB`
    );
    const [bonusAcknowledgementColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_bonus_awards'
         AND COLUMN_NAME = 'acknowledged_at'`
    );
    if (!bonusAcknowledgementColumns.length) {
      await connection.query(
        "ALTER TABLE wallet_bonus_awards ADD COLUMN acknowledged_at TIMESTAMP NULL AFTER wallet_transaction_id"
      );
    }
    await connection.query(
      `CREATE TABLE IF NOT EXISTS wallet_withdrawals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        points BIGINT UNSIGNED NOT NULL,
        rupees_per_point DECIMAL(10,4) UNSIGNED NULL,
        amount_inr DECIMAL(14,2) UNSIGNED NULL,
        status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
        withdrawal_month DATE NULL,
        payout_provider VARCHAR(30) NULL,
        provider_payout_link_id VARCHAR(100) NULL,
        provider_payout_id VARCHAR(100) NULL,
        payout_link_url VARCHAR(2000) NULL,
        provider_status VARCHAR(50) NULL,
        provider_updated_at TIMESTAMP NULL,
        provider_failure_reason VARCHAR(500) NULL,
        requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_by BIGINT UNSIGNED NULL,
        processed_at TIMESTAMP NULL,
        admin_notes VARCHAR(500) NULL,
        UNIQUE KEY uq_wallet_withdrawal_month (user_id, withdrawal_month),
        INDEX idx_wallet_withdrawals_status_date (status, requested_at)
      ) ENGINE=InnoDB`
    );
    const [withdrawalValueColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_withdrawals'
       AND COLUMN_NAME IN ('rupees_per_point', 'amount_inr')`
    );
    const existingWithdrawalValueColumns = new Set(withdrawalValueColumns.map((column) => column.COLUMN_NAME));
    if (!existingWithdrawalValueColumns.has("rupees_per_point")) {
      await connection.query(
        "ALTER TABLE wallet_withdrawals ADD COLUMN rupees_per_point DECIMAL(10,4) UNSIGNED NULL AFTER points"
      );
    }
    if (!existingWithdrawalValueColumns.has("amount_inr")) {
      await connection.query(
        "ALTER TABLE wallet_withdrawals ADD COLUMN amount_inr DECIMAL(14,2) UNSIGNED NULL AFTER rupees_per_point"
      );
    }
    const [withdrawalProviderColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_withdrawals'
       AND COLUMN_NAME IN ('payout_provider', 'provider_payout_link_id', 'provider_payout_id',
                           'payout_link_url', 'provider_status', 'provider_updated_at', 'provider_failure_reason')`
    );
    const existingWithdrawalProviderColumns = new Set(withdrawalProviderColumns.map((column) => column.COLUMN_NAME));
    const providerColumns = [
      ["payout_provider", "VARCHAR(30) NULL AFTER withdrawal_month"],
      ["provider_payout_link_id", "VARCHAR(100) NULL AFTER payout_provider"],
      ["provider_payout_id", "VARCHAR(100) NULL AFTER provider_payout_link_id"],
      ["payout_link_url", "VARCHAR(2000) NULL AFTER provider_payout_id"],
      ["provider_status", "VARCHAR(50) NULL AFTER payout_link_url"],
      ["provider_updated_at", "TIMESTAMP NULL AFTER provider_status"],
      ["provider_failure_reason", "VARCHAR(500) NULL AFTER provider_updated_at"],
    ];
    for (const [column, definition] of providerColumns) {
      if (!existingWithdrawalProviderColumns.has(column)) {
        await connection.query(`ALTER TABLE wallet_withdrawals ADD COLUMN ${column} ${definition}`);
      }
    }
    await connection.query(
      `ALTER TABLE wallet_withdrawals
       MODIFY COLUMN status ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
       MODIFY COLUMN withdrawal_month DATE NULL`
    );
    const [providerLinkIndexes] = await connection.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_withdrawals'
         AND INDEX_NAME = 'uq_wallet_provider_payout_link'`
    );
    if (!providerLinkIndexes.length) {
      await connection.query(
        "CREATE UNIQUE INDEX uq_wallet_provider_payout_link ON wallet_withdrawals (provider_payout_link_id)"
      );
    }

    await connection.query(
      `CREATE TABLE IF NOT EXISTS deletion_audit (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(40) NOT NULL,
        entity_table VARCHAR(64) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        entity_label VARCHAR(500) NOT NULL,
        owner_id BIGINT UNSIGNED NULL,
        owner_name VARCHAR(200) NULL,
        deleted_by BIGINT UNSIGNED NOT NULL,
        deleted_by_name VARCHAR(200) NOT NULL,
        deleted_by_email VARCHAR(255) NULL,
        deleted_by_role VARCHAR(30) NOT NULL,
        reason VARCHAR(500) NULL,
        snapshot JSON NULL,
        deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        restored_by BIGINT UNSIGNED NULL,
        restored_at TIMESTAMP NULL,
        permanently_deleted_by BIGINT UNSIGNED NULL,
        permanently_deleted_at TIMESTAMP NULL,
        INDEX idx_deletion_audit_active (restored_at, permanently_deleted_at, deleted_at),
        INDEX idx_deletion_audit_entity (entity_table, entity_id)
      ) ENGINE=InnoDB`
    );

    const softDeleteTables = [
      "users", "articles", "blogs", "videos", "comments", "categories", "policies",
      "career_jobs", "role_applications", "politicians", "parties", "states",
    ];
    for (const tableName of softDeleteTables) {
      const [tables] = await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );
      if (!tables.length) continue;
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
           AND COLUMN_NAME IN ('deleted_at', 'deleted_by', 'delete_reason')`,
        [tableName]
      );
      const existing = new Set(columns.map((column) => column.COLUMN_NAME));
      if (!existing.has("deleted_at")) {
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN deleted_at DATETIME NULL`);
      }
      if (!existing.has("deleted_by")) {
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN deleted_by BIGINT UNSIGNED NULL`);
      }
      if (!existing.has("delete_reason")) {
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN delete_reason VARCHAR(500) NULL`);
      }
    }
  } finally {
    connection.release();
  }
};

module.exports = pool;
