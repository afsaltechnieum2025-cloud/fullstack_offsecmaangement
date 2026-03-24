const express = require('express');
const router = express.Router();
const db = require('../db'); // your existing mysql2 pool

// ─────────────────────────────────────────────
// PROGRAMS
// ─────────────────────────────────────────────

// GET /api/wof/programs
router.get('/programs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM programs ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wof/programs
router.post('/programs', async (req, res) => {
  const { name, type, platform, logo_url } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO programs (name, type, platform, logo_url) VALUES (?, ?, ?, ?)',
      [name, type || 'public', platform, logo_url || null]
    );
    res.status(201).json({ id: result.insertId, name, type, platform });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// RESEARCHERS
// ─────────────────────────────────────────────

// GET /api/wof/researchers  (leaderboard)
router.get('/researchers', async (req, res) => {
  const { sort = 'bounty' } = req.query;
  const orderCol = sort === 'cve' ? 'cve_count' : 'total_bounty';
  try {
    const [rows] = await db.query(
      `SELECT r.*,
        COUNT(f.id) AS finding_count,
        SUM(CASE WHEN f.status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count
       FROM researchers r
       LEFT JOIN halloffamefindings f ON f.researcher_id = r.id
       GROUP BY r.id
       ORDER BY r.${orderCol} DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wof/researchers
router.post('/researchers', async (req, res) => {
  const { username, avatar_url } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO researchers (username, avatar_url) VALUES (?, ?)',
      [username, avatar_url || null]
    );
    res.status(201).json({ id: result.insertId, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// FINDINGS
// ─────────────────────────────────────────────

// GET /api/wof/findings
router.get('/findings', async (req, res) => {
  const { severity, status, program_id, researcher_id, search } = req.query;

  let sql = `
    SELECT f.*,
      r.username AS researcher_name,
      p.name AS program_name, p.platform, p.type AS program_type
    FROM halloffamefindings f
    LEFT JOIN researchers r ON r.id = f.researcher_id
    LEFT JOIN programs p ON p.id = f.program_id
    WHERE 1=1
  `;
  const params = [];

  if (severity) { sql += ' AND f.severity = ?'; params.push(severity); }
  if (status) { sql += ' AND f.status = ?'; params.push(status); }
  if (program_id) { sql += ' AND f.program_id = ?'; params.push(program_id); }
  if (researcher_id) { sql += ' AND f.researcher_id = ?'; params.push(researcher_id); }
  if (search) {
    sql += ' AND (f.title LIKE ? OR f.category LIKE ? OR r.username LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += ' ORDER BY f.created_at DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wof/findings/:id  (with timeline)
router.get('/findings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[finding]] = await db.query(
      `SELECT f.*,
        r.username AS researcher_name,
        p.name AS program_name, p.platform
       FROM halloffamefindings f
       LEFT JOIN researchers r ON r.id = f.researcher_id
       LEFT JOIN programs p ON p.id = f.program_id
       WHERE f.id = ?`,
      [id]
    );
    if (!finding) return res.status(404).json({ error: 'Not found' });

    const [timeline] = await db.query(
      'SELECT * FROM halloffamefinding_timeline  WHERE finding_id = ? ORDER BY event_date ASC',
      [id]
    );
    res.json({ ...finding, timeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wof/findings
router.post('/findings', async (req, res) => {
  const {
    researcher_id, program_id, title, description,
    steps_to_reproduce, impact, severity, category,
    status = 'submitted', bounty_amount, cve_id,
    reported_at, public_url, rejection_reason, notes
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO halloffamefindings
        (researcher_id, program_id, title, description, steps_to_reproduce,
         impact, severity, category, status, bounty_amount, cve_id,
         reported_at, public_url, rejection_reason, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        researcher_id, program_id, title, description,
        steps_to_reproduce, impact, severity, category,
        status, bounty_amount || null, cve_id || null,
        reported_at || null, public_url || null,
        rejection_reason || null, notes || null
      ]
    );

    // Auto-insert first timeline event
    await db.query(
      'INSERT INTO halloffamefinding_timeline  (finding_id, event, event_date, actor) VALUES (?,?,NOW(),?)',
      [result.insertId, 'Finding submitted', 'system']
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
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
    const vals = [];

    if (status !== undefined) { fields.push('status=?'); vals.push(status); }
    if (bounty_amount !== undefined) { fields.push('bounty_amount=?'); vals.push(bounty_amount); }
    if (cve_id !== undefined) { fields.push('cve_id=?'); vals.push(cve_id); }
    if (rejection_reason !== undefined) { fields.push('rejection_reason=?'); vals.push(rejection_reason); }
    if (resolved_at !== undefined) { fields.push('resolved_at=?'); vals.push(resolved_at); }
    if (notes !== undefined) { fields.push('notes=?'); vals.push(notes); }
    if (severity !== undefined) { fields.push('severity=?'); vals.push(severity); }
    if (title !== undefined) { fields.push('title=?'); vals.push(title); }
    if (description !== undefined) { fields.push('description=?'); vals.push(description); }
    if (steps_to_reproduce !== undefined) { fields.push('steps_to_reproduce=?'); vals.push(steps_to_reproduce); }
    if (impact !== undefined) { fields.push('impact=?'); vals.push(impact); }
    if (category !== undefined) { fields.push('category=?'); vals.push(category); }
    if (public_url !== undefined) { fields.push('public_url=?'); vals.push(public_url); }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(id);
    await db.query(`UPDATE halloffamefindings SET ${fields.join(',')} WHERE id=?`, vals);

    // Auto-update researcher totals if bounty changed
    if (bounty_amount !== undefined || status === 'accepted') {
      await db.query(
        `UPDATE researchers r
         SET r.total_bounty = (
           SELECT COALESCE(SUM(f.bounty_amount),0)
           FROM halloffamefindings f
           WHERE f.researcher_id = r.id AND f.status = 'accepted'
         ),
         r.cve_count = (
           SELECT COUNT(*)
           FROM halloffamefindings f
           WHERE f.researcher_id = r.id AND f.cve_id IS NOT NULL
         )
         WHERE r.id = (SELECT researcher_id FROM halloffamefindings WHERE id = ?)`,
        [id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/wof/findings/:id
router.delete('/findings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM halloffamefinding_timeline  WHERE finding_id=?', [id]);
    await db.query('DELETE FROM halloffamefindings WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wof/findings/:id/timeline
router.post('/findings/:id/timeline', async (req, res) => {
  const { id } = req.params;
  const { event, actor } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO halloffamefinding_timeline  (finding_id, event, event_date, actor) VALUES (?,?,NOW(),?)',
      [id, event, actor || 'system']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
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
        COUNT(*) AS total_findings,
        SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status='duplicate' THEN 1 ELSE 0 END) AS duplicate,
        SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN status='triaged'  THEN 1 ELSE 0 END) AS triaged,
        SUM(CASE WHEN cve_id IS NOT NULL THEN 1 ELSE 0 END) AS cve_count,
        SUM(CASE WHEN severity IN ('critical','high') THEN 1 ELSE 0 END) AS critical_high,
        COALESCE(SUM(bounty_amount),0) AS total_bounty,
        COUNT(DISTINCT program_id) AS program_count,
        COUNT(DISTINCT researcher_id) AS researcher_count
      FROM halloffamefindings
    `);

    const [bySeverity] = await db.query(`
      SELECT severity, COUNT(*) AS count
      FROM halloffamefindings
      GROUP BY severity
    `);

    const acceptance_rate = totals.total_findings > 0
      ? Math.round((totals.accepted / totals.total_findings) * 100)
      : 0;

    res.json({ ...totals, acceptance_rate, by_severity: bySeverity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;