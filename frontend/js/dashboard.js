async function loadDashboard() {
  const token = getToken();

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const response = await fetch(
    `${API_URL}/api/dashboard/summary?year=${year}&month=${month}`,
    {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  document.getElementById("income").innerText = data.totalIncome;
  document.getElementById("expense").innerText = data.totalExpense;
  document.getElementById("balance").innerText = data.balance;
}

loadDashboard();
