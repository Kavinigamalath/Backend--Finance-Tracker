const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sendEmailNotification } = require('../utils/emailNotification');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const User = require('../models/User');
const Report = require('../models/Report');


exports.generateFinancialReport = async (req = null, res = null, isCron = false) => {
    try {
        console.log("Starting report generation...");

        let users;
        if (isCron) {
            users = await User.find(); // Fetch all users for cron job
        } else {
            users = [await User.findById(req.user.id)]; // Fetch single user from API request
        }

        for (const user of users) {
            if (!user) continue;
            console.log(`Generating report for: ${user.username}`);

            // Set default dates if missing
            const defaultStartDate = new Date();
            defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
            const defaultEndDate = new Date();

            const reportStartDate = req?.query?.startDate ? new Date(req.query.startDate) : defaultStartDate;
            const reportEndDate = req?.query?.endDate ? new Date(req.query.endDate) : defaultEndDate;
            const selectedCategories = req?.query?.categories ? req.query.categories.split(',') : null;
            const selectedTags = req?.query?.tags ? req.query.tags.split(',') : null;

            console.log(`Report period: ${reportStartDate} - ${reportEndDate}`);

            // **Apply Filters**
            const transactionQuery = { userId: user._id, date: { $gte: reportStartDate, $lt: reportEndDate } };
            if (selectedCategories) transactionQuery.category = { $in: selectedCategories };
            if (selectedTags) transactionQuery.tags = { $in: selectedTags };

            const transactions = await Transaction.find(transactionQuery);
            const goals = await Goal.find({ userId: user._id });
            const budgets = await Budget.find({ userId: user._id });

            console.log("Transactions fetched:", transactions.length);
            console.log("Goals and Budgets fetched.");

            // **Ensure Report Directory Exists**
            const reportDir = path.join(__dirname, '../uploads/reports');
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }

            // **Generate PDF**
            const reportFilePath = path.join(reportDir, `financial_report_${user.username}_${Date.now()}.pdf`);
            console.log("Saving report to:", reportFilePath);

            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            doc.pipe(fs.createWriteStream(reportFilePath));

            // **Professional Header**
            doc
                .fillColor('#333')
                .fontSize(24)
                .text('Personal Finance Tracker', { align: 'center' })
                .moveDown()
                .fontSize(16)
                .text('Monthly Financial Report', { align: 'center' })
                .moveDown()
                .fontSize(12)
                .fillColor('gray')
                .text(`User: ${user.username}`, { align: 'left' })
                .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
                .moveDown(2);

            // **Business Description**
            doc
                .fillColor('#555')
                .fontSize(12)
                .text(
                    "Our Personal Finance Tracker provides insightful financial management tools, empowering professionals and individuals to manage expenses, set budgets, and achieve financial goals efficiently. The following report presents a structured financial overview, including transactions, budget status, and goal progress.",
                    { align: 'justify' }
                )
                .moveDown(2);

            // **Table Styling**
            const tableHeader = (title) => {
                doc
                    .fillColor('#fff')
                    .rect(doc.x, doc.y, 500, 20)
                    .fill('#333')
                    .stroke()
                    .fillColor('#fff')
                    .fontSize(12)
                    .text(title, doc.x + 5, doc.y + 5)
                    .moveDown();
            };

            // **Transactions Table**
            tableHeader('Transactions Overview');
            transactions.forEach((t) => {
                const sign = t.type === 'income' ? '+' : '-';
                const color = t.type === 'income' ? 'green' : 'red';

                // **Ensure `amount` is valid**
                const amount = typeof t.convertedAmount === 'number' && !isNaN(t.convertedAmount) ? t.convertedAmount.toFixed(2) : "0.00";
                const dateFormatted = t.date ? t.date.toDateString() : 'Unknown Date';  // Safely handle date

                doc.fillColor('#000').fontSize(10)
                   .text(`${dateFormatted} - ${t.category || 'Unknown Category'}: `, { continued: true })
                   .fillColor(color)
                   .text(`${sign}$${amount}`, { align: 'right' })
                   .moveDown(0.5);
            });
            doc.moveDown(2);

            // **Budget Overview Table**
            tableHeader('Budget Overview');
            budgets.forEach((b) => {
                // Ensure valid amount for budget
                const amount = typeof b.amount === 'number' && !isNaN(b.amount) ? b.amount.toFixed(2) : "0.00";  // Fallback if invalid
                doc
                    .fillColor('#000')
                    .fontSize(10)
                    .text(`${b.type} - ${b.category || 'N/A'}`, { continued: true })
                    .text(` Budget: $${amount} `, { align: 'right' })
                    .moveDown(0.5);
            });
            doc.moveDown(2);

            // **Goal Overview Table**
            tableHeader('Goals Overview');
            goals.forEach((g) => {
                const progress = ((g.currentAmount / g.targetAmount) * 100).toFixed(2);
                const color = progress >= 100 ? 'green' : 'blue';
                const deadlineFormatted = g.deadline ? g.deadline.toDateString() : 'Unknown Deadline';  // Safely handle date

                doc
                    .fillColor('#000')
                    .fontSize(10)
                    .text(`${g.name} (Deadline: ${deadlineFormatted})`, { continued: true })
                    .fillColor(color)
                    .text(` ${progress}% achieved`, { align: 'right' })
                    .moveDown(0.5);
            });

            // **Financial Summary Section**
            const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
            const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
            const netBalance = totalIncome - totalExpense;

            doc
                .moveDown(2)
                .fontSize(14)
                .fillColor('#333')
                .text('Financial Summary:', { underline: true })
                .moveDown()
                .fontSize(12)
                .fillColor('green')
                .text(`Total Income: $${totalIncome.toFixed(2)}`)
                .fillColor('red')
                .text(`Total Expenses: $${totalExpense.toFixed(2)}`)
                .fillColor(netBalance >= 0 ? 'green' : 'red')
                .text(`Net Balance: $${netBalance.toFixed(2)}`, { align: 'right' });

            doc.end();
            console.log("PDF generated at:", reportFilePath);

            // **Save Report**
            const newReport = new Report({ userId: user._id, filePath: reportFilePath });
            await newReport.save();
            console.log("Report saved to database.");

            // **Send Email**
            await sendEmailNotification(user.email, 'Your Monthly Financial Report', 'Please find your financial report attached.', reportFilePath);
            console.log(`Email sent to: ${user.email}`);
        }

        if (!isCron && res) {
            return res.status(200).json({ message: 'Reports generated and sent successfully!' });
        }
    } catch (err) {
        console.error("Error generating financial reports:", err);
        return res?.status(500).json({ error: err.message });
    }
};
// Get all reports (Admin only)
exports.getAllReports = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    const reports = await Report.find().populate('userId', 'username email');
    res.status(200).json(reports);
};

// Get a user's latest report
exports.getUserReport = async (req, res) => {
    const report = await Report.findOne({ userId: req.user.id }).sort({ generatedAt: -1 }).limit(1);
    if (!report) return res.status(404).json({ error: 'No report found.' });
    res.status(200).json(report);
};

// Delete a user's report
exports.deleteUserReport = async (req, res) => {
    const report = await Report.findOneAndDelete({ userId: req.user.id });
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    // Remove the physical file from the server
    fs.unlinkSync(report.filePath);
    res.status(200).json({ message: 'Report deleted successfully.' });
};

exports.selfGenerateFinancialReport = async (req, res) => {
    try {
        console.log("Starting report generation...");

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized: Please log in." });
        }

        // Fetch the authenticated user
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        console.log(`Generating report for user: ${user.username}`);

        // Set default dates if missing
        const defaultStartDate = new Date();
        defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
        const defaultEndDate = new Date();

        const reportStartDate = req.query?.startDate ? new Date(req.query.startDate) : defaultStartDate;
        const reportEndDate = req.query?.endDate ? new Date(req.query.endDate) : defaultEndDate;
        const selectedCategories = req.query?.categories ? req.query.categories.split(',') : null;
        const selectedTags = req.query?.tags ? req.query.tags.split(',') : null;

        console.log(`Report period: ${reportStartDate} - ${reportEndDate}`);

        // **Apply Filters**
        const transactionQuery = { userId, date: { $gte: reportStartDate, $lt: reportEndDate } };
        if (selectedCategories) transactionQuery.category = { $in: selectedCategories };
        if (selectedTags) transactionQuery.tags = { $in: selectedTags };

        const transactions = await Transaction.find(transactionQuery);
        const goals = await Goal.find({ userId: user._id });
        const budgets = await Budget.find({ userId: user._id });

        console.log("Transactions fetched:", transactions.length);
        console.log("Goals and Budgets fetched.");

        // **Ensure Report Directory Exists**
        const reportDir = path.join(__dirname, '../uploads/reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // **Generate PDF**
        const reportFilePath = path.join(reportDir, `financial_report_${user.username}_${Date.now()}.pdf`);
        console.log("Saving report to:", reportFilePath);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(fs.createWriteStream(reportFilePath));

        // **Professional Header**
        doc
            .fillColor('#333')
            .fontSize(24)
            .text('Personal Finance Tracker', { align: 'center' })
            .moveDown()
            .fontSize(16)
            .text('Monthly Financial Report', { align: 'center' })
            .moveDown()
            .fontSize(12)
            .fillColor('gray')
            .text(`User: ${user.username}`, { align: 'left' })
            .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
            .moveDown(2);

        // **Business Description**
        doc
            .fillColor('#555')
            .fontSize(12)
            .text(
                "Our Personal Finance Tracker provides insightful financial management tools, empowering professionals and individuals to manage expenses, set budgets, and achieve financial goals efficiently. The following report presents a structured financial overview, including transactions, budget status, and goal progress.",
                { align: 'justify' }
            )
            .moveDown(2);

        // **Transactions Table Header**
        const tableHeader = (title) => {
            doc
                .fillColor('#fff')
                .rect(doc.x, doc.y, 500, 20)
                .fill('#333')
                .stroke()
                .fillColor('#fff')
                .fontSize(12)
                .text(title, doc.x + 5, doc.y + 5)
                .moveDown();
        };

        // **Transactions Table**
        tableHeader('Transactions Overview');
        transactions.forEach((t) => {
            const sign = t.type === 'income' ? '+' : '-';
            const color = t.type === 'income' ? 'green' : 'red';

            // **Ensure `amount` is valid**
            const amount = typeof t.convertedAmount === 'number' && !isNaN(t.convertedAmount) ? t.convertedAmount.toFixed(2) : "0.00";
            const dateFormatted = t.date ? t.date.toDateString() : 'Unknown Date';  // Safely handle date

            doc.fillColor('#000').fontSize(10)
               .text(`${dateFormatted} - ${t.category || 'Unknown Category'}: `, { continued: true })
               .fillColor(color)
               .text(`${sign}$${amount}`, { align: 'right' })
               .moveDown(0.5);
        });
        doc.moveDown(2);

        // **Budget Overview Table**
        tableHeader('Budget Overview');
        budgets.forEach((b) => {
            // Ensure valid amount for budget
            const amount = typeof b.amount === 'number' && !isNaN(b.amount) ? b.amount.toFixed(2) : "0.00";  // Fallback if invalid
            doc
                .fillColor('#000')
                .fontSize(10)
                .text(`${b.type} - ${b.category || 'N/A'}`, { continued: true })
                .text(` Budget: $${amount} `, { align: 'right' })
                .moveDown(0.5);
        });
        doc.moveDown(2);

        // **Goal Overview Table**
        tableHeader('Goals Overview');
        goals.forEach((g) => {
            const progress = ((g.currentAmount / g.targetAmount) * 100).toFixed(2);
            const color = progress >= 100 ? 'green' : 'blue';
            const deadlineFormatted = g.deadline ? g.deadline.toDateString() : 'Unknown Deadline';  // Safely handle date

            doc
                .fillColor('#000')
                .fontSize(10)
                .text(`${g.name} (Deadline: ${deadlineFormatted})`, { continued: true })
                .fillColor(color)
                .text(` ${progress}% achieved`, { align: 'right' })
                .moveDown(0.5);
        });

        // **Financial Summary Section**
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
        const netBalance = totalIncome - totalExpense;

        doc
            .moveDown(2)
            .fontSize(14)
            .fillColor('#333')
            .text('Financial Summary:', { underline: true })
            .moveDown()
            .fontSize(12)
            .fillColor('green')
            .text(`Total Income: $${totalIncome.toFixed(2)}`)
            .fillColor('red')
            .text(`Total Expenses: $${totalExpense.toFixed(2)}`)
            .fillColor(netBalance >= 0 ? 'green' : 'red')
            .text(`Net Balance: $${netBalance.toFixed(2)}`, { align: 'right' });

        doc.end();
        console.log("PDF generated at:", reportFilePath);

        // **Save Report in Database**
        const newReport = new Report({ userId: user._id, filePath: reportFilePath });
        await newReport.save();
        console.log("Report saved to database.");

        // **Send Email**
        await sendEmailNotification(user.email, 'Your Monthly Financial Report', 'Please find your financial report attached.', reportFilePath);
        console.log(`Email sent to: ${user.email}`);

        return res.status(200).json({ message: 'Report generated and sent successfully!' });

    } catch (err) {
        console.error("Error generating financial reports:", err);
        return res.status(500).json({ error: err.message });
    }
};

// Filtered Report Generation function
exports.selfGenerateFilteredFinancialReport = async (req, res) => {
    try {
        console.log("Starting filtered report generation...");

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized: Please log in." });
        }

        // Fetch the authenticated user
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        console.log(`Generating filtered report for user: ${user.username}`);

        // Set default dates if missing
        const defaultStartDate = new Date();
        defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);  // Default start date is 1 month ago
        const defaultEndDate = new Date();  // Default end date is today

        // Fetch the filter options from query parameters
        const reportStartDate = req.query.startDate ? new Date(req.query.startDate) : defaultStartDate;
        const reportEndDate = req.query.endDate ? new Date(req.query.endDate) : defaultEndDate;
        const selectedCategories = req.query.categories ? req.query.categories.split(',') : null;
        const selectedTags = req.query.tags ? req.query.tags.split(',') : null;

        console.log(`Report period: ${reportStartDate} - ${reportEndDate}`);
        console.log(`Categories: ${selectedCategories}`);
        console.log(`Tags: ${selectedTags}`);

        // **Apply Filters to Transactions, Budgets, and Goals for the authenticated user**
        const transactionQuery = {
            userId: userId,  // Filter transactions based on the logged-in user
            date: { $gte: reportStartDate, $lt: reportEndDate }  // Apply date range filter
        };

        if (selectedCategories && selectedCategories.length > 0) {
            transactionQuery.category = { $in: selectedCategories };  // Apply category filter
        }

        if (selectedTags && selectedTags.length > 0) {
            transactionQuery.tags = { $in: selectedTags };  // Apply tags filter
        }

        // Fetch filtered transactions for the authenticated user
        const transactions = await Transaction.find(transactionQuery);

        // Fetch filtered goals and budgets for the authenticated user
        const goals = await Goal.find({ userId });
        const budgets = await Budget.find({ userId });

        console.log("Transactions fetched:", transactions.length);
        console.log("Goals and Budgets fetched.");

        // **Ensure Report Directory Exists**
        const reportDir = path.join(__dirname, '../uploads/reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // **Generate PDF**
        const reportFilePath = path.join(reportDir, `filtered_financial_report_${user.username}_${Date.now()}.pdf`);
        console.log("Saving report to:", reportFilePath);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(fs.createWriteStream(reportFilePath));

        // **Professional Header**
        doc
            .fillColor('#333')
            .fontSize(24)
            .text('Personal Finance Tracker', { align: 'center' })
            .moveDown()
            .fontSize(16)
            .text('Filtered Financial Report', { align: 'center' })
            .moveDown()
            .fontSize(12)
            .fillColor('gray')
            .text(`User: ${user.username}`, { align: 'left' })
            .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
            .moveDown(2);

        // **Business Description**
        doc
            .fillColor('#555')
            .fontSize(12)
            .text(
                "Our Personal Finance Tracker provides insightful financial management tools, empowering professionals and individuals to manage expenses, set budgets, and achieve financial goals efficiently. The following report presents a structured financial overview, including filtered transactions, budget status, and goal progress.",
                { align: 'justify' }
            )
            .moveDown(2);

        // **Transactions Table Header**
        const tableHeader = (title) => {
            doc
                .fillColor('#fff')
                .rect(doc.x, doc.y, 500, 20)
                .fill('#333')
                .stroke()
                .fillColor('#fff')
                .fontSize(12)
                .text(title, doc.x + 5, doc.y + 5)
                .moveDown();
        };

        // **Transactions Table**
        tableHeader('Filtered Transactions Overview');
        if (transactions.length === 0) {
            doc.fillColor('#000').fontSize(10).text('No transactions found for the selected filters.', { continued: true }).moveDown(2);
        } else {
            transactions.forEach((t) => {
                const sign = t.type === 'income' ? '+' : '-';
                const color = t.type === 'income' ? 'green' : 'red';

                // **Ensure `amount` is valid**
                const amount = typeof t.amount === 'number' && !isNaN(t.convertedAmount) ? t.convertedAmount.toFixed(2) : "0.00";
                const dateFormatted = t.date ? t.date.toDateString() : 'Unknown Date';  // Safely handle date

                doc.fillColor('#000').fontSize(10)
                   .text(`${dateFormatted} - ${t.category || 'Unknown Category'}: `, { continued: true })
                   .fillColor(color)
                   .text(`${sign}$${amount}`, { align: 'right' })
                   .moveDown(0.5);
            });
        }
        doc.moveDown(2);

        // **Budget Overview Table**
        tableHeader('Filtered Budget Overview');
        if (budgets.length === 0) {
            doc.fillColor('#000').fontSize(10).text('No budgets found for the user.', { continued: true }).moveDown(2);
        } else {
            budgets.forEach((b) => {
                const amount = typeof b.amount === 'number' && !isNaN(b.amount) ? b.amount.toFixed(2) : "0.00";  // Fallback if invalid
                doc
                    .fillColor('#000')
                    .fontSize(10)
                    .text(`${b.type} - ${b.category || 'N/A'}`, { continued: true })
                    .text(` Budget: $${amount} `, { align: 'right' })
                    .moveDown(0.5);
            });
        }
        doc.moveDown(2);

        // **Goal Overview Table**
        tableHeader('Goals Overview');
        if (goals.length === 0) {
            doc.fillColor('#000').fontSize(10).text('No goals found for the user.', { continued: true }).moveDown(2);
        } else {
            goals.forEach((g) => {
                const progress = ((g.currentAmount / g.targetAmount) * 100).toFixed(2);
                const color = progress >= 100 ? 'green' : 'blue';
                const deadlineFormatted = g.deadline ? g.deadline.toDateString() : 'Unknown Deadline';  // Safely handle date

                doc
                    .fillColor('#000')
                    .fontSize(10)
                    .text(`${g.name} (Deadline: ${deadlineFormatted})`, { continued: true })
                    .fillColor(color)
                    .text(` ${progress}% achieved`, { align: 'right' })
                    .moveDown(0.5);
            });
        }

        // **Financial Summary Section**
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
        const netBalance = totalIncome - totalExpense;

        doc
            .moveDown(2)
            .fontSize(14)
            .fillColor('#333')
            .text('Financial Summary:', { underline: true })
            .moveDown()
            .fontSize(12)
            .fillColor('green')
            .text(`Total Income: $${totalIncome.toFixed(2)}`)
            .fillColor('red')
            .text(`Total Expenses: $${totalExpense.toFixed(2)}`)
            .fillColor(netBalance >= 0 ? 'green' : 'red')
            .text(`Net Balance: $${netBalance.toFixed(2)}`, { align: 'right' });

        doc.end();
        console.log("PDF generated at:", reportFilePath);

        // **Save Report in Database**
        const newReport = new Report({ userId: user._id, filePath: reportFilePath });
        await newReport.save();
        console.log("Report saved to database.");

        // **Send Email**
        await sendEmailNotification(user.email, 'Your Filtered Financial Report', 'Please find your filtered financial report attached.', reportFilePath);
        console.log(`Email sent to: ${user.email}`);

        return res.status(200).json({ message: 'Filtered report generated and sent successfully!' });

    } catch (err) {
        console.error("Error generating filtered financial reports:", err);
        return res.status(500).json({ error: err.message });
    }
};
exports.selfGenerateFilteredFinancialReport = async (req, res) => {
    try {
        console.log("Starting filtered report generation...");

        // Ensure user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized: Please log in." });
        }

        // Fetch the authenticated user
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        console.log(`Generating filtered report for user: ${user.username}`);

        // Set default dates if missing
        const defaultStartDate = new Date();
        defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);  // Default start date is 1 month ago
        const defaultEndDate = new Date();  // Default end date is today

        // Fetch the filter options from query parameters
        const reportStartDate = req.query.startDate ? new Date(req.query.startDate) : defaultStartDate;
        const reportEndDate = req.query.endDate ? new Date(req.query.endDate) : defaultEndDate;
        const selectedCategories = req.query.categories ? req.query.categories.split(',') : null;
        const selectedTags = req.query.tags ? req.query.tags.split(',') : null;

        console.log(`Report period: ${reportStartDate} - ${reportEndDate}`);
        console.log(`Categories: ${selectedCategories}`);
        console.log(`Tags: ${selectedTags}`);

        // **Apply Filters to Transactions, Budgets, and Goals for the authenticated user**
        const transactionQuery = {
            userId: userId,  // Filter transactions based on the logged-in user
            date: { $gte: reportStartDate, $lt: reportEndDate }  // Apply date range filter
        };

        if (selectedCategories && selectedCategories.length > 0) {
            transactionQuery.category = { $in: selectedCategories };  // Apply category filter
        }

        if (selectedTags && selectedTags.length > 0) {
            transactionQuery.tags = { $in: selectedTags };  // Apply tags filter
        }

        // Fetch filtered transactions for the authenticated user
        const transactions = await Transaction.find(transactionQuery);

        // Fetch filtered goals and budgets for the authenticated user
        const goals = await Goal.find({ userId });
        const budgets = await Budget.find({ userId });

        console.log("Transactions fetched:", transactions.length);
        console.log("Goals and Budgets fetched.");

        // **Ensure Report Directory Exists**
        const reportDir = path.join(__dirname, '../uploads/reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        // **Generate PDF**
        const reportFilePath = path.join(reportDir, `filtered_financial_report_${user.username}_${Date.now()}.pdf`);
        console.log("Saving report to:", reportFilePath);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(fs.createWriteStream(reportFilePath));

        // **Professional Header**
        doc
            .fillColor('#333')
            .fontSize(24)
            .text('Personal Finance Tracker', { align: 'center' })
            .moveDown()
            .fontSize(16)
            .text('Filtered Financial Report', { align: 'center' })
            .moveDown()
            .fontSize(12)
            .fillColor('gray')
            .text(`User: ${user.username}`, { align: 'left' })
            .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
            .moveDown(2);

        // **Business Description**
        doc
            .fillColor('#555')
            .fontSize(12)
            .text(
                "Our Personal Finance Tracker provides insightful financial management tools, empowering professionals and individuals to manage expenses, set budgets, and achieve financial goals efficiently. The following report presents a structured financial overview, including filtered transactions, budget status, and goal progress.",
                { align: 'justify' }
            )
            .moveDown(2);

        // **Transactions Table Header**
        const tableHeader = (title) => {
            doc
                .fillColor('#fff')
                .rect(doc.x, doc.y, 500, 20)
                .fill('#333')
                .stroke()
                .fillColor('#fff')
                .fontSize(12)
                .text(title, doc.x + 5, doc.y + 5)
                .moveDown();
        };

        // **Transactions Table**
        tableHeader('Filtered Transactions Overview');
        if (transactions.length === 0) {
            doc.fillColor('#000').fontSize(10).text('No transactions found for the selected filters.', { continued: true }).moveDown(2);
        } else {
            transactions.forEach((t) => {
                const sign = t.type === 'income' ? '+' : '-';
                const color = t.type === 'income' ? 'green' : 'red';

                // **Ensure `amount` is valid**
                const amount = typeof t.amount === 'number' && !isNaN(t.convertedAmount) ? t.convertedAmount.toFixed(2) : "0.00";
                const dateFormatted = t.date ? t.date.toDateString() : 'Unknown Date';  // Safely handle date

                doc.fillColor('#000').fontSize(10)
                   .text(`${dateFormatted} - ${t.category || 'Unknown Category'}: `, { continued: true })
                   .fillColor(color)
                   .text(`${sign}$${amount}`, { align: 'right' })
                   .moveDown(0.5);
            });
        }
        doc.moveDown(2);

        // **Budget Overview Table**
        tableHeader('Filtered Budget Overview');
        if (budgets.length === 0) {
            doc.fillColor('#000').fontSize(10).text('No budgets found for the user.', { continued: true }).moveDown(2);
        } else {
            budgets.forEach((b) => {
                const amount = typeof b.amount === 'number' && !isNaN(b.amount) ? b.amount.toFixed(2) : "0.00";  // Fallback if invalid
                doc
                    .fillColor('#000')
                    .fontSize(10)
                    .text(`${b.type} - ${b.category || 'N/A'}`, { continued: true })
                    .text(` Budget: $${amount} `, { align: 'right' })
                    .moveDown(0.5);
            });
        }
        doc.moveDown(2);

        // **Goal Overview Table**
        tableHeader('Goals Overview');
        if (goals.length === 0) {
            doc.fillColor('#000').fontSize(10).text('No goals found for the user.', { continued: true }).moveDown(2);
        } else {
            goals.forEach((g) => {
                const progress = ((g.currentAmount / g.targetAmount) * 100).toFixed(2);
                const color = progress >= 100 ? 'green' : 'blue';
                const deadlineFormatted = g.deadline ? g.deadline.toDateString() : 'Unknown Deadline';  // Safely handle date

                doc
                    .fillColor('#000')
                    .fontSize(10)
                    .text(`${g.name} (Deadline: ${deadlineFormatted})`, { continued: true })
                    .fillColor(color)
                    .text(` ${progress}% achieved`, { align: 'right' })
                    .moveDown(0.5);
            });
        }

        // **Financial Summary Section**
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.convertedAmount || 0), 0);
        const netBalance = totalIncome - totalExpense;

        doc
            .moveDown(2)
            .fontSize(14)
            .fillColor('#333')
            .text('Financial Summary:', { underline: true })
            .moveDown()
            .fontSize(12)
            .fillColor('green')
            .text(`Total Income: $${totalIncome.toFixed(2)}`)
            .fillColor('red')
            .text(`Total Expenses: $${totalExpense.toFixed(2)}`)
            .fillColor(netBalance >= 0 ? 'green' : 'red')
            .text(`Net Balance: $${netBalance.toFixed(2)}`, { align: 'right' });

        doc.end();
        console.log("PDF generated at:", reportFilePath);

        // **Save Report in Database**
        const newReport = new Report({ userId: user._id, filePath: reportFilePath });
        await newReport.save();
        console.log("Report saved to database.");

        // **Send Email**
        await sendEmailNotification(user.email, 'Your Filtered Financial Report', 'Please find your filtered financial report attached.', reportFilePath);
        console.log(`Email sent to: ${user.email}`);

        return res.status(200).json({ message: 'Filtered report generated and sent successfully!' });

    } catch (err) {
        console.error("Error generating filtered financial reports:", err);
        return res.status(500).json({ error: err.message });
    }
};
