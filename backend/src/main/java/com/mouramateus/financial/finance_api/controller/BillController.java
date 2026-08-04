package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.BillCreateRequest;
import com.mouramateus.financial.finance_api.dto.BillPayRequest;
import com.mouramateus.financial.finance_api.dto.BillResponse;
import com.mouramateus.financial.finance_api.service.BillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BillResponse create(@RequestBody @Valid BillCreateRequest request) {
        return billService.create(request);
    }

    @GetMapping
    public List<BillResponse> list() {
        return billService.listMine();
    }

    @PatchMapping("/{id}/pay")
    public BillResponse markAsPaid(@PathVariable Long id, @RequestBody @Valid BillPayRequest request) {
        return billService.markAsPaid(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        billService.delete(id);
    }
}
