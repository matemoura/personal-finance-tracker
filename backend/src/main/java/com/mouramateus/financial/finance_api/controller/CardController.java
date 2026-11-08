package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.CardClosingOverrideRequest;
import com.mouramateus.financial.finance_api.dto.CardCreateRequest;
import com.mouramateus.financial.finance_api.dto.CardInvoicePayRequest;
import com.mouramateus.financial.finance_api.dto.CardInvoiceResponse;
import com.mouramateus.financial.finance_api.dto.CardResponse;
import com.mouramateus.financial.finance_api.dto.CardUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.service.CardService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
@Validated
public class CardController {

    private final CardService cardService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Card create(@RequestBody @Valid CardCreateRequest request) {
        return cardService.create(request);
    }

    @GetMapping
    public List<CardResponse> list() {
        return cardService.listMine();
    }

    @PutMapping("/{id}")
    public Card update(
            @PathVariable Long id,
            @RequestBody @Valid CardUpdateRequest request
    ) {
        return cardService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCard(@PathVariable Long id) {
        cardService.deleteCard(id);
    }

    @GetMapping("/{id}/invoices")
    public List<CardInvoiceResponse> pendingInvoices(@PathVariable Long id) {
        return cardService.listPendingInvoices(id);
    }

    @PatchMapping("/{id}/invoices/pay")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void payInvoice(@PathVariable Long id, @RequestBody @Valid CardInvoicePayRequest request) {
        cardService.markInvoicePaid(id, request);
    }

    @PutMapping("/{id}/closing-overrides")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setClosingOverride(@PathVariable Long id, @RequestBody @Valid CardClosingOverrideRequest request) {
        cardService.setClosingOverride(id, request);
    }

    @DeleteMapping("/{id}/closing-overrides")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeClosingOverride(
            @PathVariable Long id,
            @RequestParam @Min(2000) @Max(2200) int year,
            @RequestParam @Min(1) @Max(12) int month
    ) {
        cardService.removeClosingOverride(id, year, month);
    }
}
