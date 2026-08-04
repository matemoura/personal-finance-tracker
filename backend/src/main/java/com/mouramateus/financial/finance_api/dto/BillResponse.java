package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BillResponse(
        Long id,
        String description,
        BigDecimal amount,
        LocalDate dueDate,
        boolean paid,
        LocalDate paidDate,
        String status,
        Long categoryId,
        String categoryName,
        String categoryIcon,
        Long cardId,
        String cardName,
        String cardIcon,
        Long transactionId
) {}
