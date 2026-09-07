fetch('/api/student-data')
    .then(response => {
        if (!response.ok) throw new Error("Unauthorized");
        return response.json();
    })
    .then(data => {
        document.getElementById('student-name').innerText = data.name || "N/A";
        document.getElementById('student-id').innerText = data.studentId || "N/A";
        document.getElementById('credit-taken').innerText = data.creditTaken || "0";

        document.getElementById('total-payable').innerText = data.totalPayable || "0";
        document.getElementById('dues-upto').innerText = data.duesUpToDate || "0";

        // dues100Percent অথবা dues70Percent এর যে কোনো একটি থাকলে তা বসাবে
        const duesVal = data.dues100Percent !== undefined ? data.dues100Percent : (data.dues70Percent !== undefined ? data.dues70Percent : "0");
        
        const duesElement = document.getElementById('dues-100') || document.getElementById('dues-70');
        if (duesElement) {
            duesElement.innerText = duesVal;
        }

        document.getElementById('reg-fee').innerText = data.regFee || "0";
        document.getElementById('tuition-fee').innerText = data.tuitionFee || "0";
        document.getElementById('scholarship').innerText = data.scholarshipAmount || "0";
        document.getElementById('others').innerText = data.others || "0";
        document.getElementById('net-payable').innerText = data.netPayable || "0";
        document.getElementById('prev-dues').innerText = data.previousDues || "0";
        document.getElementById('received-amount').innerText = data.receivedAmount || "0";
    })
    .catch((err) => {
        console.error(err);
        window.location.href = '/';
    });