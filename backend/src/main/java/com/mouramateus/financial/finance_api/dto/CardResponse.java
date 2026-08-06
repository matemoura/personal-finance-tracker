package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;

public record CardResponse(
        Long id,
        String name,
        String icon,
        Integer closingDay,
        Integer dueDay,
        BigDecimal totalSpent,
        BigDecimal pendingTotal,
        BigDecimal pendingCurrentMonth
) {}
