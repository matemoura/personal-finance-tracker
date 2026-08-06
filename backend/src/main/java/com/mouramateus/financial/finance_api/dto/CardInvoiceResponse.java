package com.mouramateus.financial.finance_api.dto;

import java.math.BigDecimal;

public record CardInvoiceResponse(
        int year,
        int month,
        BigDecimal total
) {}
