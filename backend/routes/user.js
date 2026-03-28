const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// GET all users
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, full_name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, full_name } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, full_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, full_name || null, email, hashed, role || 'tester']
    );

    res.json({ id: result.insertId, message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update user role
router.put('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET projects assigned to a user
router.get('/:id/projects', async (req, res) => {
  try {
    const [assignments] = await db.query(
      'SELECT * FROM project_assignments WHERE user_id = ?',
      [req.params.id]
    );
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST assign project to user
router.post('/:id/projects', async (req, res) => {
  try {
    const { project_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO project_assignments (user_id, project_id) VALUES (?, ?)',
      [req.params.id, project_id]
    );
    res.json({ id: result.insertId, message: 'Project assigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE unassign project from user
router.delete('/:id/projects/:projectId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM project_assignments WHERE user_id = ? AND project_id = ?',
      [req.params.id, req.params.projectId]
    );
    res.json({ message: 'Project unassigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET detailed user profile with all activities
router.get('/:id/profile', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user basic info
    const [users] = await db.query(
      'SELECT id, name, full_name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Get projects assigned to user
    const [projects] = await db.query(`
      SELECT p.id, p.name, p.client, p.status, p.start_date, p.end_date,
             pa.assigned_at
      FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.user_id = ?
      ORDER BY pa.assigned_at DESC
    `, [userId]);
    
    // Get findings created by user - FIXED: Convert userId to string because created_by stores string
    const [findings] = await db.query(`
      SELECT f.id, f.title, f.severity, f.status, f.cvss_score, 
             f.created_at, f.updated_at, p.name as project_name
      FROM findings f
      JOIN projects p ON f.project_id = p.id
      WHERE f.created_by = ?
      ORDER BY f.created_at DESC
    `, [String(userId)]);
    
    // Get Wall of Fame findings by user
    const [hofFindings] = await db.query(`
      SELECT h.id, h.title, h.severity, h.status, h.cve_id, 
             h.reported_at, h.resolved_at, p.name as project_name,
             h.public_url, h.blog_url, h.rejection_reason
      FROM halloffamefindings h
      LEFT JOIN projects p ON h.project_id = p.id
      WHERE h.user_id = ?
      ORDER BY h.reported_at DESC
    `, [userId]);
    
    // Get retested findings - FIXED: Convert userId to string
    const [retestedFindings] = await db.query(`
      SELECT f.id, f.title, f.severity, f.status, f.retest_status,
             f.retest_date, f.retest_notes, p.name as project_name
      FROM findings f
      JOIN projects p ON f.project_id = p.id
      WHERE f.retested_by = ?
      ORDER BY f.retest_date DESC
    `, [String(userId)]);
    
    // Get user's activity timeline - FIXED: Convert userId to string for string fields
    const [timelineEvents] = await db.query(`
      SELECT 
        'finding_created' as event_type,
        f.title as title,
        f.created_at as event_date,
        p.name as context
      FROM findings f
      JOIN projects p ON f.project_id = p.id
      WHERE f.created_by = ?
      
      UNION ALL
      
      SELECT 
        'finding_retested' as event_type,
        f.title as title,
        f.retest_date as event_date,
        p.name as context
      FROM findings f
      JOIN projects p ON f.project_id = p.id
      WHERE f.retested_by = ? AND f.retest_date IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'hof_submitted' as event_type,
        h.title as title,
        h.reported_at as event_date,
        p.name as context
      FROM halloffamefindings h
      LEFT JOIN projects p ON h.project_id = p.id
      WHERE h.user_id = ?
      
      UNION ALL
      
      SELECT 
        'project_assigned' as event_type,
        p.name as title,
        pa.assigned_at as event_date,
        p.client as context
      FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.user_id = ?
      
      ORDER BY event_date DESC
      LIMIT 50
    `, [String(userId), String(userId), userId, userId]);
    
    // Calculate statistics
    const stats = {
      totalProjects: projects.length,
      totalFindings: findings.length,
      totalHoFFindings: hofFindings.length,
      totalRetests: retestedFindings.length,
      acceptedFindings: hofFindings.filter(f => f.status === 'accepted').length,
      rejectedFindings: hofFindings.filter(f => f.status === 'rejected').length,
      cvesCount: hofFindings.filter(f => f.cve_id).length,
      severityBreakdown: {
        critical: findings.filter(f => f.severity === 'critical').length + 
                   hofFindings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length + 
              hofFindings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length + 
                hofFindings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length + 
             hofFindings.filter(f => f.severity === 'low').length,
        info: findings.filter(f => f.severity === 'info').length + 
              hofFindings.filter(f => f.severity === 'informational').length
      },
      projectStatusBreakdown: projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json({
      user,
      projects,
      findings,
      hofFindings,
      retestedFindings,
      timelineEvents,
      stats
    });
    
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET download user profile report
router.get('/:id/profile/report', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Fetch all user data for report
    const [users] = await db.query(
      'SELECT id, name, full_name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Get projects
    const [projects] = await db.query(`
      SELECT p.name, p.client, p.status, p.start_date, p.end_date,
             pa.assigned_at
      FROM project_assignments pa
      JOIN projects p ON pa.project_id = p.id
      WHERE pa.user_id = ?
      ORDER BY pa.assigned_at DESC
    `, [userId]);
    
    // Get findings - FIXED: Convert userId to string
    const [findings] = await db.query(`
      SELECT f.title, f.severity, f.status, f.cvss_score, 
             f.created_at, p.name as project_name
      FROM findings f
      JOIN projects p ON f.project_id = p.id
      WHERE f.created_by = ?
      ORDER BY f.created_at DESC
    `, [String(userId)]);
    
    // Get Wall of Fame findings
    const [hofFindings] = await db.query(`
      SELECT h.title, h.severity, h.status, h.cve_id, 
             h.reported_at, h.resolved_at, p.name as project_name,
             h.rejection_reason
      FROM halloffamefindings h
      LEFT JOIN projects p ON h.project_id = p.id
      WHERE h.user_id = ?
      ORDER BY h.reported_at DESC
    `, [userId]);
    
    // Generate report data
    const report = {
      user: {
        name: user.full_name || user.name,
        username: user.name,
        email: user.email,
        role: user.role,
        memberSince: user.created_at
      },
      summary: {
        totalProjects: projects.length,
        totalFindings: findings.length,
        totalAcceptedFindings: hofFindings.filter(f => f.status === 'accepted').length,
        totalCVEs: hofFindings.filter(f => f.cve_id).length,
        reportGenerated: new Date().toISOString()
      },
      projects: projects.map(p => ({
        name: p.name,
        client: p.client,
        status: p.status,
        assignedDate: p.assigned_at,
        dateRange: p.start_date && p.end_date ? `${p.start_date} to ${p.end_date}` : 'Not specified'
      })),
      findings: findings.map(f => ({
        title: f.title,
        severity: f.severity,
        status: f.status,
        cvssScore: f.cvss_score,
        project: f.project_name,
        date: f.created_at
      })),
      hallOfFameFindings: hofFindings.map(f => ({
        title: f.title,
        severity: f.severity,
        status: f.status,
        cveId: f.cve_id || 'Not assigned',
        project: f.project_name || 'External Program',
        reportedDate: f.reported_at,
        resolvedDate: f.resolved_at || 'Pending',
        rejectionReason: f.rejection_reason
      }))
    };
    
    res.json(report);
    
  } catch (err) {
    console.error('Error generating user report:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;