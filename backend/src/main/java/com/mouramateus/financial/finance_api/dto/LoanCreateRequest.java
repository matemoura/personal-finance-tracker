package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LoanCreateRequest(
        @NotBlank String personName,
        String description,
        @NotNull @Positive BigDecimal amount,
        @NotNull LocalDate dateLent,
        LocalDate expectedReturnDate
) {}
