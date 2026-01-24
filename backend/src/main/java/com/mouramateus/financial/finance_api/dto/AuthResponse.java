package com.mouramateus.financial.finance_api.dto;

public record AuthResponse(
        String token,
        String name,
        String photoUrl
) {}
