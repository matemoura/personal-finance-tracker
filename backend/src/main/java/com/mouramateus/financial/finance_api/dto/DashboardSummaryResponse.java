package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;

public class DashboardSummaryResponse {

    private BigDecimal totalIncome;
    private BigDecimal totalExpenses;
    private BigDecimal balance;

    public DashboardSummaryResponse(BigDecimal totalIncome, BigDecimal totalExpenses) {
        this.totalIncome = totalIncome;
        this.totalExpenses = totalExpenses;
        this.balance = totalIncome.add(totalExpenses);
    }

    public BigDecimal getTotalIncome() {
        return totalIncome;
    }

    public BigDecimal getTotalExpenses() {
        return totalExpenses;
    }

    public BigDecimal getBalance() {
        return balance;
    }
}
