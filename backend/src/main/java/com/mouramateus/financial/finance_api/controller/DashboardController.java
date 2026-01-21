package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.DashboardSummaryResponse;
import com.mouramateus.financial.finance_api.dto.ExpensesByCategoryResponse;
import com.mouramateus.financial.finance_api.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public DashboardSummaryResponse getSummary(
            @RequestParam int year,
            @RequestParam int month
    ) {
        return dashboardService.getSummary(year, month);

    }

    @GetMapping("/expenses-by-category")
    public List<ExpensesByCategoryResponse> getExpensesByCategory(
            @RequestParam int year,
            @RequestParam int month
    ) {
        return dashboardService.getExpensesByCategory(year, month);
    }
}
