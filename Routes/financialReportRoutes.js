const express = require('express');
const { generateFinancialReport,
        getAllReports, 
        getUserReport, 
        deleteUserReport,
        selfGenerateFinancialReport,
        selfGenerateFilteredFinancialReport,
     } = require('../Controllers/financialReportController');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Generate All financial report (authenticated user)
router.get('/generate', authenticateUser, authorizeRole(['admin']), generateFinancialReport);

// Admin can see all reports
router.get('/', authenticateUser, authorizeRole(['admin']), getAllReports);

// User can see their own report
router.get('/me', authenticateUser, authorizeRole(['user']), getUserReport);

// User can delete their own report
router.delete('/me', authenticateUser, authorizeRole(['user']),deleteUserReport);

// **Users can only generate their own reports**
router.get('/generateme', authenticateUser, authorizeRole(['user']), selfGenerateFinancialReport);

// Route to generate filtered report for a user
router.get('/filtered', authenticateUser, authorizeRole(['user']), selfGenerateFilteredFinancialReport);

module.exports = router;
