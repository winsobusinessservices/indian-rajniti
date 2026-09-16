const pool = require("../config/db");
const Wallet = require("../models/wallet.model");

const CONTENT_REWARD_CATEGORY = "CONTENT_REWARD";

async function creditContentReward({ userId, contributorRole, contentType, contentId, title, publishedAt, backfilled = false }) {
  let role = contributorRole;
  if (!role) {
    const [users] = await pool.query("SELECT role FROM users WHERE id = ?", [userId]);
    role = users[0]?.role;
  }
  const rewardPoints = await Wallet.getRewardPoints(role);
  const points = rewardPoints[contentType];
  if (!points) throw new Error(`Unsupported wallet content type: ${contentType}`);

  const result = await Wallet.credit({
    userId,
    points,
    category: CONTENT_REWARD_CATEGORY,
    description: `Approved ${contentType.toLowerCase()}: ${title}`,
    referenceType: contentType,
    referenceId: contentId,
    metadata: { backfilled },
    createdAt: publishedAt,
  });
  return { ...result, points };
}

// Repairs any approval that committed successfully but whose wallet credit
// did not (for example, a temporary database error after content approval).
// Wallet.credit is reference-idempotent, so this is safe on every wallet read.
async function syncApprovedContentRewards(userId) {
  const [items] = await pool.query(
    `SELECT a.id, a.author_id, a.title, 'ARTICLE' AS content_type,
            u.role AS contributor_role,
            COALESCE(a.published_at, a.created_at) AS published_at
     FROM articles a JOIN users u ON u.id = a.author_id
     WHERE a.author_id = ? AND a.status = 'APPROVED'
     UNION ALL
     SELECT b.id, b.author_id, b.title, 'BLOG', u.role, COALESCE(b.published_at, b.created_at)
     FROM blogs b JOIN users u ON u.id = b.author_id
     WHERE b.author_id = ? AND b.status = 'APPROVED'
     UNION ALL
     SELECT v.id, v.author_id, v.title, 'VIDEO', u.role, COALESCE(v.published_at, v.created_at)
     FROM videos v JOIN users u ON u.id = v.author_id
     WHERE v.author_id = ? AND v.status = 'APPROVED'`,
    [userId, userId, userId]
  );

  let credited = 0;
  for (const item of items) {
    const result = await creditContentReward({
      userId: item.author_id,
      contributorRole: item.contributor_role,
      contentType: item.content_type,
      contentId: item.id,
      title: item.title,
      publishedAt: item.published_at,
    });
    if (result.credited) credited += 1;
  }
  return credited;
}

module.exports = {
  CONTENT_REWARD_CATEGORY,
  creditContentReward,
  syncApprovedContentRewards,
};
