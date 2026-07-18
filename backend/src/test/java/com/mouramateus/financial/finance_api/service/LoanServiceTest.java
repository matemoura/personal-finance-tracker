package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.LoanCreateRequest;
import com.mouramateus.financial.finance_api.dto.LoanResponse;
import com.mouramateus.financial.finance_api.dto.LoanSummaryResponse;
import com.mouramateus.financial.finance_api.dto.RepaymentCreateRequest;
import com.mouramateus.financial.finance_api.entity.Loan;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.LoanRepaymentRepository;
import com.mouramateus.financial.finance_api.repository.LoanRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    @Mock
    private LoanRepository loanRepository;

    @Mock
    private LoanRepaymentRepository loanRepaymentRepository;

    @Mock
    private UserRepository userRepository;

    private LoanService loanService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        loanService = new LoanService(loanRepository, loanRepaymentRepository, userRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_savesLoanWithStatusPending() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        LoanCreateRequest request = new LoanCreateRequest("João", "Almoço", new BigDecimal("100.00"), LocalDate.now(), null);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(loanRepository.save(any(Loan.class))).thenAnswer(inv -> {
            Loan l = inv.getArgument(0);
            l.setId(10L);
            return l;
        });

        LoanResponse result = loanService.create(request);

        assertThat(result.personName()).isEqualTo("João");
        assertThat(result.amount()).isEqualByComparingTo("100.00");
        assertThat(result.amountReturned()).isEqualByComparingTo("0");
        assertThat(result.remaining()).isEqualByComparingTo("100.00");
        assertThat(result.status()).isEqualTo("PENDING");
    }

    @Test
    void registerRepayment_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Loan loan = Loan.builder().id(5L).user(otherUser).amount(new BigDecimal("100.00")).build();
        RepaymentCreateRequest request = new RepaymentCreateRequest(new BigDecimal("50.00"), LocalDate.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(loanRepository.findById(5L)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.registerRepayment(5L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(loanRepaymentRepository, never()).save(any());
    }

    @Test
    void registerRepayment_amountExceedsRemaining_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Loan loan = Loan.builder().id(5L).user(owner).amount(new BigDecimal("100.00")).build();
        RepaymentCreateRequest request = new RepaymentCreateRequest(new BigDecimal("150.00"), LocalDate.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(loanRepository.findById(5L)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.registerRepayment(5L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("maior que o saldo pendente");

        verify(loanRepaymentRepository, never()).save(any());
    }

    @Test
    void registerRepayment_partial_updatesStatusToPartial() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Loan loan = Loan.builder().id(5L).user(owner).amount(new BigDecimal("100.00")).build();
        RepaymentCreateRequest request = new RepaymentCreateRequest(new BigDecimal("40.00"), LocalDate.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(loanRepository.findById(5L)).thenReturn(Optional.of(loan));
        when(loanRepaymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LoanResponse result = loanService.registerRepayment(5L, request);

        assertThat(result.status()).isEqualTo("PARTIAL");
        assertThat(result.amountReturned()).isEqualByComparingTo("40.00");
        assertThat(result.remaining()).isEqualByComparingTo("60.00");
    }

    @Test
    void registerRepayment_fullAmount_updatesStatusToPaid() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Loan loan = Loan.builder().id(5L).user(owner).amount(new BigDecimal("100.00")).build();
        RepaymentCreateRequest request = new RepaymentCreateRequest(new BigDecimal("100.00"), LocalDate.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(loanRepository.findById(5L)).thenReturn(Optional.of(loan));
        when(loanRepaymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LoanResponse result = loanService.registerRepayment(5L, request);

        assertThat(result.status()).isEqualTo("PAID");
        assertThat(result.remaining()).isEqualByComparingTo("0");
    }

    @Test
    void delete_ownedByAnotherUser_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Loan loan = Loan.builder().id(5L).user(otherUser).amount(new BigDecimal("100.00")).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(loanRepository.findById(5L)).thenReturn(Optional.of(loan));

        assertThatThrownBy(() -> loanService.delete(5L)).isInstanceOf(RuntimeException.class);
        verify(loanRepository, never()).delete(any());
    }

    @Test
    void getSummary_aggregatesAcrossLoans() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Loan paidLoan = Loan.builder().id(1L).user(owner).amount(new BigDecimal("100.00")).build();
        Loan pendingLoan = Loan.builder().id(2L).user(owner).amount(new BigDecimal("50.00")).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(loanRepository.findByUserOrderByDateLentDesc(owner)).thenReturn(List.of(paidLoan, pendingLoan));

        LoanSummaryResponse summary = loanService.getSummary();

        assertThat(summary.totalLent()).isEqualByComparingTo("150.00");
        assertThat(summary.totalReturned()).isEqualByComparingTo("0");
        assertThat(summary.totalPending()).isEqualByComparingTo("150.00");
        assertThat(summary.pendingCount()).isEqualTo(2);
    }
}
