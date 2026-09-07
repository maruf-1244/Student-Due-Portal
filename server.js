const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Fixed Admin Credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_SALT = '73d3a55e9a03aa7f435503523969adca';
const ADMIN_PASSWORD_HASH = '3e55081c11deef83e3d9771d5db31017b0a3c252b921a8abee4b75c6914e06d3bf8a5d24ba4ba61c0ea7846d2f283bcf7be5e2f6ceaa2b1cae6ad055ca74c2fa';

function verifyAdminPassword(inputPassword) {
    const inputHash = crypto.scryptSync(inputPassword, ADMIN_SALT, 64);
    const storedHash = Buffer.from(ADMIN_PASSWORD_HASH, 'hex');
    if (inputHash.length !== storedHash.length) return false;
    return crypto.timingSafeEqual(inputHash, storedHash);
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect('/');
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'student-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/views', (req, res, next) => {
    if (req.path.endsWith('.html')) {
        return res.status(403).send("Direct access to HTML files is forbidden.");
    }
    next();
}, express.static(path.join(__dirname, 'views')));

function getStudentFromExcel(studentId) {
    const filePath = path.join(__dirname, 'students.xlsx');
    if (!fs.existsSync(filePath)) return null;

    try {
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerRowIndex = rawData.findIndex(row => 
            row && row.some(cell => String(cell).toLowerCase().includes('student id'))
        );
        if (headerRowIndex === -1) return null;

        const sheetData = xlsx.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: "" });
        const student = sheetData.find(row => {
            const keys = Object.keys(row);
            const idKey = keys.find(k => k.toLowerCase().includes('student id'));
            return idKey && String(row[idKey]).trim() === String(studentId).trim();
        });
        if (!student) return null;

        const getVal = (pattern) => {
            const keys = Object.keys(student);
            const targetPattern = pattern.toLowerCase().replace(/\s+/g, '');
            const matchedKey = keys.find(k => k.toLowerCase().replace(/\s+/g, '').includes(targetPattern));
            return (matchedKey && student[matchedKey] !== "") ? student[matchedKey] : "0";
        };

        const netPayable = parseFloat(getVal('net payable') || 0);
        const totalPayable = parseFloat(getVal('total payable') || netPayable);
        const receivedAmt = parseFloat(getVal('received amount') || 0);
        let raw100Due = getVal('100%');
        let hundredPercentDue = (raw100Due !== "0" && raw100Due !== "") 
            ? parseFloat(raw100Due) 
            : Math.max(0, totalPayable - receivedAmt);

        return {
            slNo: getVal('sl no'),
            studentId: studentId,
            name: getVal('student full name'),
            totalReceived: getVal('total received'),
            scholarshipPct: getVal('scholar'),
            creditTaken: getVal('credit taken'),
            regFee: getVal('reg fee'),
            tuitionFee: getVal('tuition fee'),
            scholarshipAmount: getVal('scholarship'),
            others: getVal('others'),
            netPayable: netPayable,
            previousDues: getVal('previous dues'),
            totalPayable: totalPayable,
            receivedAmount: receivedAmt,
            duesUpToDate: 0,
            dues100Percent: hundredPercentDue,
            dues70Percent: hundredPercentDue
        };
    } catch (error) {
        console.error("Error reading Excel file:", error);
        return null;
    }
}

function getAllStudentsFromExcel() {
    const filePath = path.join(__dirname, 'students.xlsx');
    if (!fs.existsSync(filePath)) return [];

    try {
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        let headerRowIndex = rawData.findIndex(row => 
            row && row.some(cell => String(cell).toLowerCase().includes('student id'))
        );
        if (headerRowIndex === -1) return [];

        const sheetData = xlsx.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: "" });

        return sheetData
            .filter(row => {
                const keys = Object.keys(row);
                const idKey = keys.find(k => k.toLowerCase().includes('student id'));
                return idKey && String(row[idKey]).trim() !== "";
            })
            .map(row => {
                const getVal = (pattern) => {
                    const keys = Object.keys(row);
                    const targetPattern = pattern.toLowerCase().replace(/\s+/g, '');
                    const matchedKey = keys.find(k => k.toLowerCase().replace(/\s+/g, '').includes(targetPattern));
                    return (matchedKey && row[matchedKey] !== "") ? row[matchedKey] : "0";
                };

                const totalPayable = parseFloat(getVal('total payable') || 0);
                const receivedAmt = parseFloat(getVal('received amount') || 0);
                let raw100Due = getVal('100%');
                let hundredPercentDue = (raw100Due !== "0" && raw100Due !== "") 
                    ? parseFloat(raw100Due) 
                    : Math.max(0, totalPayable - receivedAmt);

                return {
                    studentId: getVal('student id'),
                    name: getVal('student full name'),
                    creditTaken: getVal('credit taken'),
                    totalPayable: totalPayable,
                    receivedAmount: receivedAmt,
                    dues100Percent: hundredPercentDue
                };
            });
    } catch (error) {
        console.error("Error reading Excel file:", error);
        return [];
    }
}

app.get('/', (req, res) => {
    const publicIndexPath = path.join(__dirname, 'public', 'index.html');
    const rootIndexPath = path.join(__dirname, 'index.html');

    if (fs.existsSync(publicIndexPath)) return res.sendFile(publicIndexPath);
    if (fs.existsSync(rootIndexPath)) return res.sendFile(rootIndexPath);
    res.status(404).send("index.html file not found!");
});

app.post('/login', (req, res) => {
    const studentId = req.body.studentId;
    const student = getStudentFromExcel(studentId);

    if (student) {
        req.session.role = 'student';
        req.session.studentId = studentId;
        req.session.save(() => res.redirect('/dashboard.html'));
    } else {
        res.send("<h2>Invalid Student ID! <a href='/'>Try again</a></h2>");
    }
});

app.get('/api/student-data', (req, res) => {
    if (req.session.studentId) {
        const student = getStudentFromExcel(req.session.studentId);
        if (student) return res.json(student);
        return res.status(404).json({ error: "Student not found" });
    }
    res.status(401).json({ error: "Unauthorized" });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && verifyAdminPassword(password || '')) {
        req.session.role = 'admin';
        return req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.status(500).send("Session creation failed");
            }
            res.redirect('/admin-dashboard.html');
        });
    }
    res.send("<h2>Invalid admin credentials! <a href='/'>Try again</a></h2>");
});

app.get('/admin-dashboard.html', requireAdmin, (req, res) => {
    const adminViewPath = path.join(__dirname, 'views', 'admin-dashboard.html');
    const adminRootPath = path.join(__dirname, 'admin-dashboard.html');

    if (fs.existsSync(adminViewPath)) return res.sendFile(adminViewPath);
    if (fs.existsSync(adminRootPath)) return res.sendFile(adminRootPath);
    res.status(404).send("Admin dashboard HTML file not found!");
});

app.get('/api/admin/students-data', requireAdmin, (req, res) => {
    res.json(getAllStudentsFromExcel());
});

app.get('/admin-logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});