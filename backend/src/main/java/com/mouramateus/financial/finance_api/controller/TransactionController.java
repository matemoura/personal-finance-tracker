package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.TransactionCreateRequest;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.service.TransactionService;
import com.mouramateus.financial.finance_api.entity.Transaction;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction create(@RequestBody @Valid TransactionCreateRequest request) {
        return transactionService.createTransaction(request);
    }

    @GetMapping
    public List<Transaction> listByMonth(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) CategoryType type,
            @RequestParam(required = false) Long categoryId
            ) {
        return transactionService.listByMonth(year, month, type, categoryId);
    }
}
