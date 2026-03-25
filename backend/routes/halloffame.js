const express = require('express');
const router = express.Router();
const db = require('../db');

// ─────────────────────────────────────────────
// PROJECTS (replaces programs)
// ─────────────────────────────────────────────

// GET /api/wof/projects — for dropdowns
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
// LEADERBOARD (built from users + halloffamefindings.user_id)
// ─────────────────────────────────────────────

// GET /api/wof/leaderboard
router.get('/leaderboard', async (req, res) => {
  const { sort = 'bounty' } = req.query;
  const orderCol = sort === 'cve' ? 'cve_count' : sort === 'findings' ? 'finding_count' : 'total_bounty';
  try {
    const [rows] = await db.query(
      `SELECT
         u.id          AS user_id,
         u.name        AS username,
         u.full_name,
         u.role,
         COALESCE(SUM(CASE WHEN f.status = 'accepted' THEN f.bounty_amount ELSE 0 END), 0) AS total_bounty,
         COUNT(f.id)                                                                         AS finding_count,
         SUM(CASE WHEN f.status IN ('accepted','fixed') THEN 1 ELSE 0 END)                  AS accepted_count,
         SUM(CASE WHEN f.cve_id IS NOT NULL AND f.cve_id != '' THEN 1 ELSE 0 END)           AS cve_count
       FROM users u
       LEFT JOIN halloffamefindings f ON f.user_id = u.id
       WHERE u.role IN ('admin', 'tester', 'manager')  -- Show all users who can submit findings
       GROUP BY u.id, u.name, u.full_name, u.role
       ORDER BY ${orderCol} DESC`
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

// GET /api/wof/findings
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
      f.bounty_amount,
      f.cve_id,
      f.reported_at,
      f.resolved_at,
      f.public_url,
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
    status = 'submitted', bounty_amount, cve_id,
    reported_at, public_url, rejection_reason, notes
  } = req.body;

  // Validate required fields
  if (!user_id || !title) {
    return res.status(400).json({ error: 'user_id and title are required' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO halloffamefindings
        (user_id, project_id, title, description, steps_to_reproduce,
         impact, severity, category, status, bounty_amount, cve_id,
         reported_at, public_url, rejection_reason, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, project_id || null, title, description || null,
        steps_to_reproduce || null, impact || null, severity, category || null,
        status, bounty_amount || null, cve_id || null,
        reported_at || null, public_url || null,
        rejection_reason || null, notes || null
      ]
    );

    // Auto timeline event
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
    status, bounty_amount, cve_id, rejection_reason,
    resolved_at, notes, severity, title, description,
    steps_to_reproduce, impact, category, public_url
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

    if (status !== undefined)            add('status', status);
    if (bounty_amount !== undefined)     add('bounty_amount', bounty_amount);
    if (cve_id !== undefined)            add('cve_id', cve_id);
    if (rejection_reason !== undefined)  add('rejection_reason', rejection_reason);
    if (resolved_at !== undefined)       add('resolved_at', resolved_at);
    if (notes !== undefined)             add('notes', notes);
    if (severity !== undefined)          add('severity', severity);
    if (title !== undefined)             add('title', title);
    if (description !== undefined)       add('description', description);
    if (steps_to_reproduce !== undefined) add('steps_to_reproduce', steps_to_reproduce);
    if (impact !== undefined)            add('impact', impact);
    if (category !== undefined)          add('category', category);
    if (public_url !== undefined)        add('public_url', public_url);

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

// GET /api/wof/stats
router.get('/stats', async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*)                                                                   AS total_findings,
        SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END)                        AS accepted,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END)                        AS rejected,
        SUM(CASE WHEN status='duplicate' THEN 1 ELSE 0 END)                       AS duplicate,
        SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END)                       AS submitted,
        SUM(CASE WHEN status='triaged'  THEN 1 ELSE 0 END)                        AS triaged,
        SUM(CASE WHEN cve_id IS NOT NULL AND cve_id != '' THEN 1 ELSE 0 END)      AS cve_count,
        SUM(CASE WHEN severity IN ('critical','high') THEN 1 ELSE 0 END)          AS critical_high,
        COALESCE(SUM(CASE WHEN status='accepted' THEN bounty_amount ELSE 0 END), 0) AS total_bounty,
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

    const acceptance_rate = totals.total_findings > 0
      ? Math.round((totals.accepted / totals.total_findings) * 100)
      : 0;

    res.json({ 
      ...totals, 
      acceptance_rate, 
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
      message: 'Hall of Fame API is working'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;