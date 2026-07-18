package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RepaymentResponse(
        Long id,
        BigDecimal amount,
        LocalDate date
) {}
