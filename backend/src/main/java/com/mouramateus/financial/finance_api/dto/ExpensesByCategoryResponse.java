package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;

public class ExpensesByCategoryResponse {

    private String category;
    private BigDecimal total;

    public ExpensesByCategoryResponse(String category, BigDecimal total) {
        this.category = category;
        this.total = total;
    }

    public String getCategory() {
        return category;
    }

    public BigDecimal getTotal() {
        return total;
    }
}
