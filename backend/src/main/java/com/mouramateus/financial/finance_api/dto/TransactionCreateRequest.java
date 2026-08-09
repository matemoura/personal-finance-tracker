package com.mouramateus.financial.finance_api.dto;

import com.mouramateus.financial.finance_api.entity.CategoryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionCreateRequest(
        @NotNull String description,
        @NotNull @Positive BigDecimal amount,
        @NotNull LocalDate date,
        @NotNull CategoryType type,
        @NotNull Long categoryId,
        Long cardId,
        // Índice (a partir de 0) da parcela dentro de uma compra parcelada —
        // desloca em quantos meses a fatura em que essa transação cai, sem
        // alterar a data real da compra. Nulo/0 para uma compra normal.
        Integer installmentIndex
) {}
