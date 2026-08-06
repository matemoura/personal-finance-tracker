package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CardInvoicePayRequest(
        @NotNull @Min(2000) @Max(2200) Integer year,
        @NotNull @Min(1) @Max(12) Integer month,
        @NotNull LocalDate paidDate
) {}
