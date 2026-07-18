package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RepaymentCreateRequest(
        @NotNull @Positive BigDecimal amount,
        @NotNull LocalDate date
) {}
