package com.mouramateus.financial.finance_api.dto;

import com.mouramateus.financial.finance_api.entity.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoryCreateRequest(
        @NotBlank String name,
        @NotNull CategoryType type,
        String icon
) {}
