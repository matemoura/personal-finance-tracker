package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;

public record LoanSummaryResponse(
        BigDecimal totalLent,
        BigDecimal totalReturned,
        BigDecimal totalPending,
        long pendingCount
) {}
