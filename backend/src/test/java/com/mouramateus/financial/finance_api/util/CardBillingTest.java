package com.mouramateus.financial.finance_api.util;

import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.Transaction;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

class CardBillingTest {

    @Test
    void periodOf_withInvoiceYearAndMonthSet_usesThemOverDateCalculation() {
        Card card = Card.builder().closingDay(10).build();
        // Data real diz "abril" (dia 5, antes do fechamento), mas a fatura
        // explícita (usada por parcelas, que compartilham a mesma data) diz
        // "junho" — o valor explícito deve vencer.
        Transaction transaction = Transaction.builder()
                .date(LocalDate.of(2026, 4, 5))
                .card(card)
                .invoiceYear(2026)
                .invoiceMonth(6)
                .build();

        assertThat(CardBilling.periodOf(transaction)).isEqualTo(YearMonth.of(2026, 6));
    }

    @Test
    void periodOf_withoutInvoiceYearAndMonth_fallsBackToDateAndClosingDay() {
        Card card = Card.builder().closingDay(10).build();
        Transaction transaction = Transaction.builder()
                .date(LocalDate.of(2026, 4, 15))
                .card(card)
                .build();

        assertThat(CardBilling.periodOf(transaction)).isEqualTo(YearMonth.of(2026, 5));
    }

    @Test
    void periodOf_withoutCard_usesRealDateMonth() {
        Transaction transaction = Transaction.builder()
                .date(LocalDate.of(2026, 4, 15))
                .build();

        assertThat(CardBilling.periodOf(transaction)).isEqualTo(YearMonth.of(2026, 4));
    }
}
