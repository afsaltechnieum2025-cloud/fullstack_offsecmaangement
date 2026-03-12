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

module.exports = router;