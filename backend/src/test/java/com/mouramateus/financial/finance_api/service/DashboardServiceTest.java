package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.DashboardSummaryResponse;
import com.mouramateus.financial.finance_api.dto.ExpensesByCategoryResponse;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    private DashboardService dashboardService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(transactionRepository, userRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getSummary_returnsIncomeExpenseAndAccumulatedBalance() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        LocalDate start = LocalDate.of(2026, 7, 1);
        LocalDate end = LocalDate.of(2026, 7, 31);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.INCOME, start, end))
                .thenReturn(new BigDecimal("1000.00"));
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.EXPENSE, start, end))
                .thenReturn(new BigDecimal("400.00"));
        when(transactionRepository.calculateAccumulatedBalance(owner, end))
                .thenReturn(new BigDecimal("600.00"));

        DashboardSummaryResponse summary = dashboardService.getSummary(2026, 7);

        assertThat(summary.getTotalIncome()).isEqualByComparingTo("1000.00");
        assertThat(summary.getTotalExpenses()).isEqualByComparingTo("400.00");
        assertThat(summary.getBalance()).isEqualByComparingTo("600.00");
    }

    @Test
    void getExpensesByCategory_delegatesToRepositoryWithMonthBounds() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        List<ExpensesByCategoryResponse> expected = List.of(
                new ExpensesByCategoryResponse("Mercado", new BigDecimal("250.00"))
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.sumExpensesByCategory(
                eq(owner), eq(LocalDate.of(2026, 7, 1)), eq(LocalDate.of(2026, 7, 31))))
                .thenReturn(expected);

        List<ExpensesByCategoryResponse> result = dashboardService.getExpensesByCategory(2026, 7);

        assertThat(result).isEqualTo(expected);
    }
}
