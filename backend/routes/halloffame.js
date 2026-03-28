const express = require('express');
const router = express.Router();
const db = require('../db');

// ─────────────────────────────────────────────
// AUTO-MIGRATE: ensure schema is up to date
// Runs once when the route module is loaded.
// Safe to run repeatedly — checks before altering.
// ─────────────────────────────────────────────

(async () => {
  try {
    const [[{ dbname }]] = await db.query('SELECT DATABASE() AS dbname');

    // Drop bounty_amount if it still exists
    const [[{ bountyExists }]] = await db.query(`
      SELECT COUNT(*) AS bountyExists
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'halloffamefindings' AND COLUMN_NAME = 'bounty_amount'
    `, [dbname]);
    if (bountyExists > 0) {
      await db.query('ALTER TABLE halloffamefindings DROP COLUMN bounty_amount');
      console.log('✅ HoF migration: dropped bounty_amount');
    }

    // Add blog_url if it doesn't exist yet
    const [[{ blogExists }]] = await db.query(`
      SELECT COUNT(*) AS blogExists
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'halloffamefindings' AND COLUMN_NAME = 'blog_url'
    `, [dbname]);
    if (blogExists === 0) {
      await db.query('ALTER TABLE halloffamefindings ADD COLUMN blog_url TEXT DEFAULT NULL AFTER public_url');
      console.log('✅ HoF migration: added blog_url');
    }

    console.log('✅ HoF schema verified');
  } catch (err) {
    console.error('⚠️  HoF auto-migration error (non-fatal):', err.message);
  }
})();

// ─────────────────────────────────────────────
// PROJECTS (for dropdowns)
// ─────────────────────────────────────────────

router.get('/projects', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, status,
        COALESCE(client, '') AS platform
       FROM projects
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// LEADERBOARD
// Points: Disclosure (accepted/fixed) = 10pts, CVE = 50pts
// ─────────────────────────────────────────────

router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         u.id          AS user_id,
         u.name        AS username,
         u.full_name,
         u.role,
         COUNT(f.id)                                                                         AS finding_count,
         COALESCE(SUM(CASE WHEN f.status IN ('accepted','fixed') THEN 1 ELSE 0 END), 0)     AS disclosure_count,
         COALESCE(SUM(CASE WHEN f.cve_id IS NOT NULL AND f.cve_id != '' THEN 1 ELSE 0 END), 0) AS cve_count,
         COALESCE(
           SUM(CASE WHEN f.status IN ('accepted','fixed') THEN 10 ELSE 0 END) +
           SUM(CASE WHEN f.cve_id IS NOT NULL AND f.cve_id != '' THEN 50 ELSE 0 END),
           0
         ) AS total_points
       FROM users u
       LEFT JOIN halloffamefindings f ON f.user_id = u.id
       WHERE u.role IN ('admin', 'tester', 'manager')
       GROUP BY u.id, u.name, u.full_name, u.role
       ORDER BY total_points DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// FINDINGS
// ─────────────────────────────────────────────

router.get('/findings', async (req, res) => {
  const { severity, status, project_id, user_id, search } = req.query;

  let sql = `
    SELECT
      f.id,
      f.user_id,
      f.project_id,
      f.title,
      f.description,
      f.steps_to_reproduce,
      f.impact,
      f.severity,
      f.category,
      f.status,
      f.cve_id,
      f.reported_at,
      f.resolved_at,
      f.public_url,
      COALESCE(f.blog_url, NULL) AS blog_url,
      f.rejection_reason,
      f.notes,
      f.created_at,
      u.name        AS researcher_name,
      u.full_name   AS researcher_full_name,
      u.role        AS researcher_role,
      p.name        AS program_name,
      COALESCE(p.client, '') AS platform,
      p.status      AS project_status
    FROM halloffamefindings f
    LEFT JOIN users    u ON u.id = f.user_id
    LEFT JOIN projects p ON p.id = f.project_id
    WHERE 1=1
  `;
  const params = [];

  if (severity)   { sql += ' AND f.severity = ?';    params.push(severity); }
  if (status)     { sql += ' AND f.status = ?';      params.push(status); }
  if (project_id) { sql += ' AND f.project_id = ?';  params.push(project_id); }
  if (user_id)    { sql += ' AND f.user_id = ?';     params.push(user_id); }
  if (search) {
    sql += ' AND (f.title LIKE ? OR f.category LIKE ? OR u.name LIKE ? OR u.full_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  sql += ' ORDER BY f.created_at DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching findings:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wof/findings/:id (with timeline)
router.get('/findings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[finding]] = await db.query(
      `SELECT
         f.*,
         u.name        AS researcher_name,
         u.full_name   AS researcher_full_name,
         p.name        AS program_name,
         COALESCE(p.client, '') AS platform
       FROM halloffamefindings f
       LEFT JOIN users    u ON u.id = f.user_id
       LEFT JOIN projects p ON p.id = f.project_id
       WHERE f.id = ?`,
      [id]
    );
    if (!finding) return res.status(404).json({ error: 'Not found' });

    const [timeline] = await db.query(
      'SELECT * FROM halloffamefinding_timeline WHERE finding_id = ? ORDER BY event_date ASC',
      [id]
    );
    res.json({ ...finding, timeline });
  } catch (err) {
    console.error('Error fetching finding details:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wof/findings
router.post('/findings', async (req, res) => {
  const {
    user_id, project_id, title, description,
    steps_to_reproduce, impact, severity, category,
    status = 'submitted', cve_id,
    reported_at, public_url, blog_url, rejection_reason, notes
  } = req.body;

  if (!user_id || !title) {
    return res.status(400).json({ error: 'user_id and title are required' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO halloffamefindings
        (user_id, project_id, title, description, steps_to_reproduce,
         impact, severity, category, status, cve_id,
         reported_at, public_url, blog_url, rejection_reason, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, project_id || null, title, description || null,
        steps_to_reproduce || null, impact || null, severity, category || null,
        status, cve_id || null,
        reported_at || null, public_url || null, blog_url || null,
        rejection_reason || null, notes || null
      ]
    );

    await db.query(
      'INSERT INTO halloffamefinding_timeline (finding_id, event, event_date, actor) VALUES (?, ?, NOW(), ?)',
      [result.insertId, 'Finding submitted', 'system']
    );

    res.status(201).json({ id: result.insertId, message: 'Finding added successfully' });
  } catch (err) {
    console.error('Error creating finding:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/wof/findings/:id
router.patch('/findings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    status, cve_id, rejection_reason,
    resolved_at, notes, severity, title, description,
    steps_to_reproduce, impact, category, public_url, blog_url
  } = req.body;

  try {
    const fields = [];
    const vals   = [];

    const add = (col, val) => {
      if (val !== undefined && val !== null) {
        fields.push(`${col}=?`);
        vals.push(val);
      }
    };

    if (status !== undefined)             add('status', status);
    if (cve_id !== undefined)             add('cve_id', cve_id);
    if (rejection_reason !== undefined)   add('rejection_reason', rejection_reason);
    if (resolved_at !== undefined)        add('resolved_at', resolved_at);
    if (notes !== undefined)              add('notes', notes);
    if (severity !== undefined)           add('severity', severity);
    if (title !== undefined)              add('title', title);
    if (description !== undefined)        add('description', description);
    if (steps_to_reproduce !== undefined) add('steps_to_reproduce', steps_to_reproduce);
    if (impact !== undefined)             add('impact', impact);
    if (category !== undefined)           add('category', category);
    if (public_url !== undefined)         add('public_url', public_url);
    if (blog_url !== undefined)           add('blog_url', blog_url);

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(id);
    await db.query(`UPDATE halloffamefindings SET ${fields.join(',')} WHERE id=?`, vals);

    res.json({ success: true, message: 'Finding updated successfully' });
  } catch (err) {
    console.error('Error updating finding:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/wof/findings/:id
router.delete('/findings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM halloffamefinding_timeline WHERE finding_id=?', [id]);
    await db.query('DELETE FROM halloffamefindings WHERE id=?', [id]);
    res.json({ success: true, message: 'Finding deleted successfully' });
  } catch (err) {
    console.error('Error deleting finding:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wof/findings/:id/timeline
router.post('/findings/:id/timeline', async (req, res) => {
  const { id } = req.params;
  const { event, actor } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'Event is required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO halloffamefinding_timeline (finding_id, event, event_date, actor) VALUES (?, ?, NOW(), ?)',
      [id, event, actor || 'system']
    );
    res.status(201).json({ id: result.insertId, message: 'Timeline event added' });
  } catch (err) {
    console.error('Error adding timeline event:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*)                                                                   AS total_findings,
        COALESCE(SUM(CASE WHEN status IN ('accepted','fixed') THEN 1 ELSE 0 END), 0) AS disclosure_count,
        COALESCE(SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END), 0)           AS rejected,
        COALESCE(SUM(CASE WHEN status='duplicate' THEN 1 ELSE 0 END), 0)          AS duplicate,
        COALESCE(SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END), 0)          AS submitted,
        COALESCE(SUM(CASE WHEN status='triaged'  THEN 1 ELSE 0 END), 0)           AS triaged,
        COALESCE(SUM(CASE WHEN cve_id IS NOT NULL AND cve_id != '' THEN 1 ELSE 0 END), 0) AS cve_count,
        COALESCE(SUM(CASE WHEN severity IN ('critical','high') THEN 1 ELSE 0 END), 0)     AS critical_high,
        COUNT(DISTINCT project_id)                                                 AS program_count,
        (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'tester', 'manager')) AS researcher_count
      FROM halloffamefindings
    `);

    const [bySeverity] = await db.query(`
      SELECT severity, COUNT(*) AS count
      FROM halloffamefindings
      WHERE severity IS NOT NULL
      GROUP BY severity
      ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low', 'informational')
    `);

    res.json({
      ...totals,
      by_severity: bySeverity
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM halloffamefindings');
    res.json({
      success: true,
      count: rows[0].count,
      message: 'Wall of Fame API is working'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;