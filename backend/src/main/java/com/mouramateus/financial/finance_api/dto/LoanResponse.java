package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record LoanResponse(
        Long id,
        String personName,
        String description,
        BigDecimal amount,
        BigDecimal amountReturned,
        BigDecimal remaining,
        String status,
        LocalDate dateLent,
        LocalDate expectedReturnDate,
        List<RepaymentResponse> repayments
) {}
