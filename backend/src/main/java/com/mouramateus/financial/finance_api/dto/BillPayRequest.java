package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record BillPayRequest(
        @NotNull LocalDate paidDate
) {}
