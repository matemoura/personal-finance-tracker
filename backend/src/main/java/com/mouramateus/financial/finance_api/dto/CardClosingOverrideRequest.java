package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

// "year/month" é o mês em que as compras foram feitas — não o mês da fatura.
public record CardClosingOverrideRequest(
        @NotNull @Min(2000) @Max(2200) Integer year,
        @NotNull @Min(1) @Max(12) Integer month,
        @NotNull @Min(1) @Max(31) Integer closingDay
) {}
