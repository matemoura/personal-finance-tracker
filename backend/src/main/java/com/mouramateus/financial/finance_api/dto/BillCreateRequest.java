package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BillCreateRequest(
        @NotBlank String description,
        @NotNull @Positive BigDecimal amount,
        @NotNull LocalDate dueDate,
        @NotNull Long categoryId,
        Long cardId
) {}
