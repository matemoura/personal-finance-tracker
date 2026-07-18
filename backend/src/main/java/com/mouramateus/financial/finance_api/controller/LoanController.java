package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.LoanCreateRequest;
import com.mouramateus.financial.finance_api.dto.LoanResponse;
import com.mouramateus.financial.finance_api.dto.LoanSummaryResponse;
import com.mouramateus.financial.finance_api.dto.RepaymentCreateRequest;
import com.mouramateus.financial.finance_api.service.LoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanResponse create(@RequestBody @Valid LoanCreateRequest request) {
        return loanService.create(request);
    }

    @GetMapping
    public List<LoanResponse> list() {
        return loanService.listMine();
    }

    @GetMapping("/summary")
    public LoanSummaryResponse summary() {
        return loanService.getSummary();
    }

    @PostMapping("/{id}/repayments")
    public LoanResponse registerRepayment(@PathVariable Long id, @RequestBody @Valid RepaymentCreateRequest request) {
        return loanService.registerRepayment(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        loanService.delete(id);
    }
}
