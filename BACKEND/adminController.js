const { query } = require('./db');

const getAllUsers = async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await query('SELECT COUNT(*) FROM users');
    
    // Total evaluations
    const totalEvaluations = await query('SELECT COUNT(*) FROM credit_inputs');
    
    // Average credit score
    const avgScore = await query('SELECT AVG(credit_score) FROM credit_results');
    
    // Risk level distribution
    const riskDistribution = await query(
      'SELECT risk_level, COUNT(*) as count FROM credit_results GROUP BY risk_level'
    );
    
    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalEvaluations: parseInt(totalEvaluations.rows[0].count),
      averageScore: parseFloat(avgScore.rows[0].avg || 0).toFixed(2),
      riskDistribution: riskDistribution.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updatedUser = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role',
      [role, userId]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllUsers, getUserStats, updateUserRole };