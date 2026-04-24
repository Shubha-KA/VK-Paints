// Initialize the app
const transactionForm = document.getElementById('transaction-form');
const transactionList = document.getElementById('transaction-list');
const totalIncome = document.getElementById('total-income');
const totalExpenses = document.getElementById('total-expenses');
const balance = document.getElementById('balance');
const expenseChart = document.getElementById('expense-chart').getContext('2d');
const errorMessage = document.querySelector('.error-message');
const successMessage = document.querySelector('.success-message');
const budgetInput = document.getElementById('monthly-budget-input');
const budgetButton = document.getElementById('set-budget-button');
const budgetStatus = document.getElementById('budget-status');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let monthlyBudget = localStorage.getItem('monthlyBudget') || 0;
let chartData = {};

function renderTransactions() {
    transactionList.innerHTML = '';
    transactions.forEach((transaction, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${transaction.description} - $${transaction.amount} (${transaction.category}) 
                        <button onclick="removeTransaction(${index})">Remove</button>`;
        transactionList.appendChild(li);
    });

    updateSummary();
    updateChart();
}

function removeTransaction(index) {
    transactions.splice(index, 1);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    renderTransactions();
}

function updateSummary() {
    let income = 0;
    let expenses = 0;

    transactions.forEach(transaction => {
        if (transaction.category === 'Income') {
            income += parseFloat(transaction.amount);
        } else {
            expenses += parseFloat(transaction.amount);
        }
    });

    totalIncome.textContent = `$${income.toFixed(2)}`;
    totalExpenses.textContent = `$${expenses.toFixed(2)}`;
    balance.textContent = `$${(income - expenses).toFixed(2)}`;
    
    if (monthlyBudget > 0) {
        const budgetStatusText = (income - expenses) - monthlyBudget;
        if (budgetStatusText >= 0) {
            budgetStatus.textContent = `You’re under budget by $${budgetStatusText.toFixed(2)}!`;
            budgetStatus.style.color = '#4CAF50';
        } else {
            budgetStatus.textContent = `You’ve exceeded your budget by $${Math.abs(budgetStatusText).toFixed(2)}`;
            budgetStatus.style.color = '#FF5722';
        }
    }
}

function updateChart() {
    chartData = {
        labels: ['Income', 'Food', 'Entertainment', 'Rent', 'Utilities'],
        datasets: [{
            data: [0, 0, 0, 0, 0],
            backgroundColor: ['#4CAF50', '#FF9800', '#FF5722', '#2196F3', '#9C27B0']
        }]
    };

    transactions.forEach(transaction => {
        if (transaction.category === 'Income') chartData.datasets[0].data[0] += parseFloat(transaction.amount);
        else if (transaction.category === 'Food') chartData.datasets[0].data[1] += parseFloat(transaction.amount);
        else if (transaction.category === 'Entertainment') chartData.datasets[0].data[2] += parseFloat(transaction.amount);
        else if (transaction.category === 'Rent') chartData.datasets[0].data[3] += parseFloat(transaction.amount);
        else if (transaction.category === 'Utilities') chartData.datasets[0].data[4] += parseFloat(transaction.amount);
    });

    new Chart(expenseChart, {
        type: 'pie',
        data: chartData,
    });
}

// Adding validation to the form
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const description = document.getElementById('description').value.trim();
    const amount = document.getElementById('amount').value.trim();
    const category = document.getElementById('category').value;
    const recurring = document.getElementById('recurring').checked;

    if (!description || !amount || !category) {
        errorMessage.textContent = "All fields are required.";
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        return;
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
        errorMessage.textContent = "Amount must be a positive number.";
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        return;
    }

    const newTransaction = { description, amount, category, recurring };
    transactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    transactionForm.reset();
    renderTransactions();

    successMessage.textContent = "Transaction added successfully!";
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
});

// Monthly budget functionality
budgetButton.addEventListener('click', () => {
    const budget = parseFloat(budgetInput.value.trim());

    if (isNaN(budget) || budget <= 0) {
        errorMessage.textContent = "Please enter a valid positive number for the budget.";
        errorMessage.style.display = 'block';
        return;
    }

    monthlyBudget = budget;
    localStorage.setItem('monthlyBudget', monthlyBudget);
    updateSummary();

    budgetInput.value = '';
});

// Export transactions to CSV
function exportToCSV() {
    const headers = ['Description', 'Amount', 'Category', 'Recurring'];
    const rows = transactions.map(transaction => [transaction.description, transaction.amount, transaction.category, transaction.recurring]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'transactions.csv';
    link.click();
}

// Initial render
renderTransactions();
