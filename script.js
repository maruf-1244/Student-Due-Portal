fetch('/api/student-data')
    .then(response => {
        if (!response.ok) throw new Error("Unauthorized");
        return response.json();
    })
    .then(data => {
        document.getElementById('student-name').innerText = data.name;
        document.getElementById('student-id').innerText = data.studentId;
        document.getElementById('credit-taken').innerText = data.creditTaken;

        document.getElementById('total-payable').innerText = data.totalPayable;
        document.getElementById('dues-upto').innerText = data.duesUpToDate;
        document.getElementById('dues-70').innerText = data.dues70Percent;

        document.getElementById('reg-fee').innerText = data.regFee;
        document.getElementById('tuition-fee').innerText = data.tuitionFee;
        document.getElementById('scholarship').innerText = data.scholarshipAmount;
        document.getElementById('others').innerText = data.others;
        document.getElementById('net-payable').innerText = data.netPayable;
        document.getElementById('prev-dues').innerText = data.previousDues;
        document.getElementById('received-amount').innerText = data.receivedAmount;
    })
    .catch(() => {
        window.location.href = '/';
    });