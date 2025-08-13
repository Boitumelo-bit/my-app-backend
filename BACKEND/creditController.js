const { query } = require('./db');

const calculateCreditScore = (input) => {
  // Normalize and calculate score (0-100)
  const { income, debts, employment_years, credit_history_score, requested_amount } = input;
  
  // Calculate debt-to-income ratio (lower is better)
  const debtToIncomeRatio = debts / (income || 1);
  const debtToIncomeScore = Math.max(0, 100 - (debtToIncomeRatio * 100));
  
  // Employment score (more years is better)
  const employmentScore = Math.min(100, employment_years * 5);
  
  // Credit history score (already normalized)
  const historyScore = credit_history_score;
  
  // Request amount score (smaller requests relative to income are better)
  const requestRatio = requested_amount / (income || 1);
  const requestScore = Math.max(0, 100 - (requestRatio * 50));
  
  // Weighted average
  const score = (
    (debtToIncomeScore * 0.3) +
    (employmentScore * 0.2) +
    (historyScore * 0.3) +
    (requestScore * 0.2)
  );
  
  return Math.round(Math.min(100, Math.max(0, score)));
};

const getRiskLevel = (score) => {
  if (score > 80) return 'Low';
  if (score > 50) return 'Medium';
  return 'High';
};

const getRecommendation = (riskLevel) => {
  switch (riskLevel) {
    case 'Low':
      return 'Credit application is highly likely to be approved with favorable terms.';
    case 'Medium':
      return 'Credit application may be approved with standard terms. Consider improving your debt-to-income ratio.';
    case 'High':
      return 'Credit application is unlikely to be approved. Consider reducing debts or increasing income before applying.';
    default:
      return 'Unable to provide recommendation.';
  }
};

const submitCreditData = async (req, res) => {
  try {
    const { income, debts, employment_years, credit_history_score, requested_amount } = req.body;
    const userId = req.user.id;

    // Calculate credit score
    const inputData = { income, debts, employment_years, credit_history_score, requested_amount };
    const creditScore = calculateCreditScore(inputData);
    const riskLevel = getRiskLevel(creditScore);
    const recommendation = getRecommendation(riskLevel);

    // Save input data
    const creditInput = await query(
      `INSERT INTO credit_inputs 
       (user_id, income, debts, employment_years, credit_history_score, requested_amount) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, income, debts, employment_years, credit_history_score, requested_amount]
    );

    // Save results
    const creditResult = await query(
      `INSERT INTO credit_results 
       (credit_input_id, credit_score, risk_level, recommendation) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [creditInput.rows[0].id, creditScore, riskLevel, recommendation]
    );

    res.status(201).json({
      input: creditInput.rows[0],
      result: creditResult.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCreditHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await query(
      `SELECT ci.*, cr.credit_score, cr.risk_level, cr.recommendation, cr.created_at as evaluated_at
       FROM credit_inputs ci
       JOIN credit_results cr ON ci.id = cr.credit_input_id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [userId]
    );

    res.json(history.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCreditResult = async (req, res) => {
  try {
    const { inputId } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT ci.*, cr.credit_score, cr.risk_level, cr.recommendation, cr.created_at as evaluated_at
       FROM credit_inputs ci
       JOIN credit_results cr ON ci.id = cr.credit_input_id
       WHERE ci.id = $1 AND ci.user_id = $2`,
      [inputId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { submitCreditData, getCreditHistory, getCreditResult };