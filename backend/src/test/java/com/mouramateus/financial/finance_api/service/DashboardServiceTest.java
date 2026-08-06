package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.DashboardSummaryResponse;
import com.mouramateus.financial.finance_api.dto.ExpensesByCategoryResponse;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CardInvoicePayment;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardInvoicePaymentRepository;
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

    @Mock
    private CardInvoicePaymentRepository cardInvoicePaymentRepository;

    private DashboardService dashboardService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(transactionRepository, userRepository, cardInvoicePaymentRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getSummary_cashExpenseDiscountsBalanceImmediately() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        LocalDate start = LocalDate.of(2026, 7, 1);
        LocalDate end = LocalDate.of(2026, 7, 31);

        Transaction income = Transaction.builder()
                .type(CategoryType.INCOME).amount(new BigDecimal("1000.00")).date(LocalDate.of(2026, 7, 5)).build();
        Transaction cashExpense = Transaction.builder()
                .type(CategoryType.EXPENSE).amount(new BigDecimal("400.00")).date(LocalDate.of(2026, 7, 10)).card(null).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.INCOME, start, end))
                .thenReturn(new BigDecimal("1000.00"));
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.EXPENSE, start, end))
                .thenReturn(new BigDecimal("400.00"));
        when(transactionRepository.findByUserAndDateLessThanEqual(owner, end))
                .thenReturn(List.of(income, cashExpense));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of());
        when(cardInvoicePaymentRepository.findByCardIn(List.of())).thenReturn(List.of());

        DashboardSummaryResponse summary = dashboardService.getSummary(2026, 7);

        assertThat(summary.getTotalIncome()).isEqualByComparingTo("1000.00");
        assertThat(summary.getTotalExpenses()).isEqualByComparingTo("400.00");
        assertThat(summary.getBalance()).isEqualByComparingTo("600.00");
    }

    @Test
    void getSummary_unpaidCardExpenseDoesNotDiscountBalance() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        LocalDate start = LocalDate.of(2026, 7, 1);
        LocalDate end = LocalDate.of(2026, 7, 31);
        Card nubank = Card.builder().id(5L).user(owner).build();

        Transaction income = Transaction.builder()
                .type(CategoryType.INCOME).amount(new BigDecimal("1000.00")).date(LocalDate.of(2026, 7, 5)).build();
        Transaction cardExpense = Transaction.builder()
                .type(CategoryType.EXPENSE).amount(new BigDecimal("300.00")).date(LocalDate.of(2026, 7, 10)).card(nubank).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.INCOME, start, end))
                .thenReturn(new BigDecimal("1000.00"));
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.EXPENSE, start, end))
                .thenReturn(new BigDecimal("300.00"));
        when(transactionRepository.findByUserAndDateLessThanEqual(owner, end))
                .thenReturn(List.of(income, cardExpense));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(cardExpense));
        when(cardInvoicePaymentRepository.findByCardIn(List.of(nubank))).thenReturn(List.of());

        DashboardSummaryResponse summary = dashboardService.getSummary(2026, 7);

        assertThat(summary.getTotalExpenses()).isEqualByComparingTo("300.00");
        assertThat(summary.getBalance()).isEqualByComparingTo("1000.00");
    }

    @Test
    void getSummary_paidCardInvoiceDiscountsBalanceFromPaidDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        LocalDate start = LocalDate.of(2026, 8, 1);
        LocalDate end = LocalDate.of(2026, 8, 31);
        Card nubank = Card.builder().id(5L).user(owner).build();

        Transaction income = Transaction.builder()
                .type(CategoryType.INCOME).amount(new BigDecimal("1000.00")).date(LocalDate.of(2026, 7, 5)).build();
        Transaction cardExpense = Transaction.builder()
                .type(CategoryType.EXPENSE).amount(new BigDecimal("300.00")).date(LocalDate.of(2026, 7, 10)).card(nubank).build();
        CardInvoicePayment payment = CardInvoicePayment.builder()
                .card(nubank).year(2026).month(7).paidDate(LocalDate.of(2026, 8, 10)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.INCOME, start, end))
                .thenReturn(BigDecimal.ZERO);
        when(transactionRepository.sumByUserAndTypeAndDateBetween(owner, CategoryType.EXPENSE, start, end))
                .thenReturn(BigDecimal.ZERO);
        when(transactionRepository.findByUserAndDateLessThanEqual(owner, end))
                .thenReturn(List.of(income, cardExpense));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(cardExpense));
        when(cardInvoicePaymentRepository.findByCardIn(List.of(nubank))).thenReturn(List.of(payment));

        DashboardSummaryResponse summary = dashboardService.getSummary(2026, 8);

        assertThat(summary.getBalance()).isEqualByComparingTo("700.00");
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
