package com.mouramateus.financial.finance_api.dto;

import jakarta.validation.constraints.NotBlank;

public record CardCreateRequest(
        @NotBlank String name,
        String icon
) {}
