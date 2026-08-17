const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'student-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Read Student Data from Excel Sheet
function getStudentFromExcel(studentId) {
    const filePath = path.join(__dirname, 'students.xlsx');
    
    if (!fs.existsSync(filePath)) {
        console.error("Excel file not found at path:", filePath);
        return null;
    }

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to array of arrays to dynamic header scan
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find which row contains 'Student ID'
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            if (rawData[i] && rawData[i].some(cell => String(cell).toLowerCase().includes('student id'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.error("Could not find 'Student ID' column header in Excel.");
            return null;
        }

        // Convert data starting from the correct header row
        const sheetData = xlsx.utils.sheet_to_json(worksheet, { 
            range: headerRowIndex, 
            defval: "" 
        });

        // Match Student ID (case-insensitive & trimmed)
        const student = sheetData.find(row => {
            const keys = Object.keys(row);
            const idKey = keys.find(k => k.toLowerCase().includes('student id'));
            return idKey && String(row[idKey]).trim() === String(studentId).trim();
        });
        
        if (!student) return null;

        // Keys helper function for exact column extraction
    const getVal = (pattern) => {
    const keys = Object.keys(student);
    const matchedKey = keys.find(k => k.toLowerCase().replace(/\s+/g, '').includes(pattern.toLowerCase().replace(/\s+/g, '')));
    return matchedKey && student[matchedKey] !== "" ? student[matchedKey] : "0";
};

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
    netPayable: getVal('net payable'),
    previousDues: getVal('previous dues'),
    totalPayable: getVal('total payable'),
    receivedAmount: getVal('received amount'),
    duesUpToDate: getVal('dues up to'),
    dues70Percent: getVal('70% dues')
};
    } catch (error) {
        console.error("Error reading Excel file:", error);
        return null;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/login', (req, res) => {
    const studentId = req.body.studentId;
    const student = getStudentFromExcel(studentId);

    if (student) {
        req.session.student = student;
        res.redirect('/dashboard.html');
    } else {
        res.send("<h2>Invalid Student ID! <a href='/'>Try again</a></h2>");
    }
});

app.get('/api/student-data', (req, res) => {
    if (req.session.student) {
        res.json(req.session.student);
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});