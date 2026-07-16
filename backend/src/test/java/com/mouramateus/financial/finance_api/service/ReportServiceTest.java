package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    private ReportService reportService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        reportService = new ReportService(transactionRepository, userRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );

        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).name("Mercado").type(CategoryType.EXPENSE).user(owner).build();
        Transaction transaction = Transaction.builder()
                .id(99L)
                .description("Compra do mês")
                .amount(new BigDecimal("150.00"))
                .date(LocalDate.of(2026, 7, 10))
                .type(CategoryType.EXPENSE)
                .user(owner)
                .category(category)
                .build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findByUserAndDateBetween(eq(owner), any(), any()))
                .thenReturn(List.of(transaction));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generatePdf_returnsValidPdfBytes() {
        byte[] pdf = reportService.generatePdf(2026, 7);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
    }

    @Test
    void generateExcel_returnsValidXlsxBytes() {
        byte[] excel = reportService.generateExcel(2026, 7);

        assertThat(excel).isNotEmpty();
        // arquivos .xlsx são pacotes ZIP: assinatura "PK"
        assertThat(excel[0]).isEqualTo((byte) 'P');
        assertThat(excel[1]).isEqualTo((byte) 'K');
    }
}
