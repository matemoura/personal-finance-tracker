package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CardUpdateRequest(
        @NotBlank String name,
        String icon,
        @Min(1) @Max(31) Integer closingDay,
        @Min(1) @Max(31) Integer dueDay
) {}
