package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.CardClosingOverrideRequest;
import com.mouramateus.financial.finance_api.dto.CardCreateRequest;
import com.mouramateus.financial.finance_api.dto.CardInvoicePayRequest;
import com.mouramateus.financial.finance_api.dto.CardInvoiceResponse;
import com.mouramateus.financial.finance_api.dto.CardResponse;
import com.mouramateus.financial.finance_api.dto.CardUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CardClosingOverride;
import com.mouramateus.financial.finance_api.entity.CardInvoicePayment;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardClosingOverrideRepository;
import com.mouramateus.financial.finance_api.repository.CardInvoicePaymentRepository;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardServiceTest {

    @Mock
    private CardRepository cardRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private CardInvoicePaymentRepository cardInvoicePaymentRepository;

    @Mock
    private CardClosingOverrideRepository cardClosingOverrideRepository;

    private CardService cardService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        cardService = new CardService(cardRepository, userRepository, transactionRepository, cardInvoicePaymentRepository,
                cardClosingOverrideRepository, new CardClosingService(cardClosingOverrideRepository));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Transaction cardPurchase(long id, Card card, LocalDate date, Integer invoiceYear, Integer invoiceMonth) {
        return Transaction.builder()
                .id(id).card(card).type(CategoryType.EXPENSE)
                .amount(new BigDecimal("100.00")).date(date)
                .invoiceYear(invoiceYear).invoiceMonth(invoiceMonth)
                .build();
    }

    @Test
    void setClosingOverride_repositionsThatMonthsPurchasesKeepingEachOnesInstallmentOffset() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        Card otherCard = Card.builder().id(6L).user(owner).closingDay(10).build();

        // Fechamento padrão 10; março passa a fechar no dia 25.
        Transaction plain = cardPurchase(1, card, LocalDate.of(2026, 3, 20), 2026, 4);
        // Parcela 3 de uma compra feita em 20/03: fatura salva em junho (abril + 2).
        Transaction installment = cardPurchase(2, card, LocalDate.of(2026, 3, 20), 2026, 6);
        // Linha antiga, sem fatura gravada.
        Transaction legacy = cardPurchase(3, card, LocalDate.of(2026, 3, 20), null, null);
        // Mesmo cartão, outro mês: não é afetada.
        Transaction otherMonth = cardPurchase(4, card, LocalDate.of(2026, 4, 20), 2026, 5);
        // Outro cartão, mesmo mês: não é afetada.
        Transaction otherCardPurchase = cardPurchase(5, otherCard, LocalDate.of(2026, 3, 20), 2026, 4);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(cardClosingOverrideRepository.findByCardAndYearAndMonth(card, 2026, 3)).thenReturn(Optional.empty());
        when(transactionRepository.findByUserAndCardIsNotNull(owner))
                .thenReturn(List.of(plain, installment, legacy, otherMonth, otherCardPurchase));

        cardService.setClosingOverride(5L, new CardClosingOverrideRequest(2026, 3, 25));

        // Antes caía em abril (20 >= 10); agora março (20 < 25).
        assertThat(plain.getInvoiceYear()).isEqualTo(2026);
        assertThat(plain.getInvoiceMonth()).isEqualTo(3);
        // Continua 2 meses depois da base: março + 2 = maio.
        assertThat(installment.getInvoiceMonth()).isEqualTo(5);
        // Sem fatura gravada antes: ganha uma, já com o fechamento novo.
        assertThat(legacy.getInvoiceYear()).isEqualTo(2026);
        assertThat(legacy.getInvoiceMonth()).isEqualTo(3);
        assertThat(otherMonth.getInvoiceMonth()).isEqualTo(5);
        assertThat(otherCardPurchase.getInvoiceMonth()).isEqualTo(4);

        ArgumentCaptor<CardClosingOverride> saved = ArgumentCaptor.forClass(CardClosingOverride.class);
        verify(cardClosingOverrideRepository).save(saved.capture());
        assertThat(saved.getValue().getClosingDay()).isEqualTo(25);
        assertThat(saved.getValue().getYear()).isEqualTo(2026);
        assertThat(saved.getValue().getMonth()).isEqualTo(3);
    }

    @Test
    void setClosingOverride_updatesTheExistingOverrideInsteadOfCreatingASecondOne() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        CardClosingOverride existing = CardClosingOverride.builder().card(card).year(2026).month(3).closingDay(25).build();
        // O ajuste já era 25 e passa a 28: a compra do dia 26 caía em abril
        // (26 >= 25) e agora cai em março (26 < 28).
        Transaction purchase = cardPurchase(1, card, LocalDate.of(2026, 3, 26), 2026, 4);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(cardClosingOverrideRepository.findByCardAndYearAndMonth(card, 2026, 3)).thenReturn(Optional.of(existing));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(purchase));

        cardService.setClosingOverride(5L, new CardClosingOverrideRequest(2026, 3, 28));

        assertThat(existing.getClosingDay()).isEqualTo(28);
        verify(cardClosingOverrideRepository).save(existing);
        assertThat(purchase.getInvoiceMonth()).isEqualTo(3);
    }

    @Test
    void setClosingOverride_toTheSameEffectiveValue_doesNotRewriteAnyTransaction() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(cardClosingOverrideRepository.findByCardAndYearAndMonth(card, 2026, 3)).thenReturn(Optional.empty());

        cardService.setClosingOverride(5L, new CardClosingOverrideRequest(2026, 3, 10));

        verify(transactionRepository, never()).saveAll(any());
    }

    @Test
    void removeClosingOverride_putsThatMonthBackOnTheCardsDefaultClosing() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        CardClosingOverride existing = CardClosingOverride.builder().card(card).year(2026).month(3).closingDay(25).build();
        // Com o ajuste (25), esta compra estava em março; sem ele (10), vai pra abril.
        Transaction purchase = cardPurchase(1, card, LocalDate.of(2026, 3, 20), 2026, 3);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(cardClosingOverrideRepository.findByCardAndYearAndMonth(card, 2026, 3)).thenReturn(Optional.of(existing));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(purchase));

        cardService.removeClosingOverride(5L, 2026, 3);

        verify(cardClosingOverrideRepository).delete(existing);
        assertThat(purchase.getInvoiceMonth()).isEqualTo(4);
    }

    @Test
    void removeClosingOverride_whenThereIsNone_doesNothing() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(cardClosingOverrideRepository.findByCardAndYearAndMonth(card, 2026, 3)).thenReturn(Optional.empty());

        cardService.removeClosingOverride(5L, 2026, 3);

        verify(cardClosingOverrideRepository, never()).delete(any());
        verify(transactionRepository, never()).saveAll(any());
    }

    @Test
    void setClosingOverride_onACardOwnedBySomeoneElse_isDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User other = User.builder().id(2L).build();
        Card card = Card.builder().id(5L).user(other).closingDay(10).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> cardService.setClosingOverride(5L, new CardClosingOverrideRequest(2026, 3, 25)))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(cardClosingOverrideRepository, never()).save(any());
    }

    @Test
    void listMine_includesEachCardsClosingOverrides() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).name("Nubank").closingDay(10).build();
        CardClosingOverride override = CardClosingOverride.builder().card(card).year(2026).month(3).closingDay(25).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findByUserOrderByNameAsc(owner)).thenReturn(List.of(card));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of());
        when(cardClosingOverrideRepository.findByCardIn(List.of(card))).thenReturn(List.of(override));

        List<CardResponse> result = cardService.listMine();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).closingOverrides()).hasSize(1);
        assertThat(result.get(0).closingOverrides().get(0).year()).isEqualTo(2026);
        assertThat(result.get(0).closingOverrides().get(0).month()).isEqualTo(3);
        assertThat(result.get(0).closingOverrides().get(0).closingDay()).isEqualTo(25);
    }

    @Test
    void create_withBlankIcon_usesDefaultIcon() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        CardCreateRequest request = new CardCreateRequest("Nubank", "  ", null, null);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.create(request);

        assertThat(result.getIcon()).isEqualTo("💳");
        assertThat(result.getUser()).isEqualTo(owner);
    }

    @Test
    void listMine_sumsOnlyExpensesForEachCard() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card nubank = Card.builder().id(10L).name("Nubank").icon("💜").user(owner).build();
        Card c6 = Card.builder().id(20L).name("C6").icon("💳").user(owner).build();

        Transaction expense1 = Transaction.builder()
                .amount(new BigDecimal("100.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.now()).build();
        Transaction expense2 = Transaction.builder()
                .amount(new BigDecimal("50.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.now()).build();
        Transaction income = Transaction.builder()
                .amount(new BigDecimal("999.00")).type(CategoryType.INCOME).card(nubank).date(LocalDate.now()).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findByUserOrderByNameAsc(owner)).thenReturn(List.of(nubank, c6));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(expense1, expense2, income));
        when(cardInvoicePaymentRepository.findByCardIn(List.of(nubank, c6))).thenReturn(List.of());

        List<CardResponse> result = cardService.listMine();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(10L);
        assertThat(result.get(0).totalSpent()).isEqualByComparingTo("150.00");
        assertThat(result.get(0).pendingTotal()).isEqualByComparingTo("150.00");
        assertThat(result.get(0).pendingCurrentMonth()).isEqualByComparingTo("150.00");
        assertThat(result.get(1).id()).isEqualTo(20L);
        assertThat(result.get(1).totalSpent()).isEqualByComparingTo("0");
        assertThat(result.get(1).pendingTotal()).isEqualByComparingTo("0");
        assertThat(result.get(1).pendingCurrentMonth()).isEqualByComparingTo("0");
    }

    @Test
    void listMine_pendingCurrentMonthOnlyIncludesCurrentMonthUnpaidExpenses() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card nubank = Card.builder().id(10L).name("Nubank").user(owner).build();

        YearMonth currentMonth = YearMonth.now();
        YearMonth lastMonth = currentMonth.minusMonths(1);

        Transaction currentMonthExpense = Transaction.builder()
                .amount(new BigDecimal("80.00")).type(CategoryType.EXPENSE).card(nubank).date(currentMonth.atDay(10)).build();
        Transaction lastMonthExpense = Transaction.builder()
                .amount(new BigDecimal("120.00")).type(CategoryType.EXPENSE).card(nubank).date(lastMonth.atDay(10)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findByUserOrderByNameAsc(owner)).thenReturn(List.of(nubank));
        when(transactionRepository.findByUserAndCardIsNotNull(owner))
                .thenReturn(List.of(currentMonthExpense, lastMonthExpense));
        when(cardInvoicePaymentRepository.findByCardIn(List.of(nubank))).thenReturn(List.of());

        List<CardResponse> result = cardService.listMine();

        assertThat(result.get(0).pendingTotal()).isEqualByComparingTo("200.00");
        assertThat(result.get(0).pendingCurrentMonth()).isEqualByComparingTo("80.00");
    }

    @Test
    void listMine_pendingCurrentMonth_treatsPurchaseOnOrAfterClosingDayAsNextMonthsInvoice() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card c6 = Card.builder().id(10L).name("C6").user(owner).closingDay(4).build();

        YearMonth currentMonth = YearMonth.now();
        YearMonth lastMonth = currentMonth.minusMonths(1);

        // Comprado no mês passado, no dia do fechamento ou depois: a data real
        // da compra continua sendo do mês passado, mas ela pertence à fatura
        // do mês atual.
        Transaction purchaseAfterClosingDay = Transaction.builder()
                .amount(new BigDecimal("34.99")).type(CategoryType.EXPENSE).card(c6)
                .date(lastMonth.atDay(Math.min(lastMonth.lengthOfMonth(), 8))).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findByUserOrderByNameAsc(owner)).thenReturn(List.of(c6));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(purchaseAfterClosingDay));
        when(cardInvoicePaymentRepository.findByCardIn(List.of(c6))).thenReturn(List.of());

        List<CardResponse> result = cardService.listMine();

        assertThat(result.get(0).pendingCurrentMonth()).isEqualByComparingTo("34.99");
        // A data real da compra (mês passado) não é alterada.
        assertThat(purchaseAfterClosingDay.getDate().getMonthValue()).isEqualTo(lastMonth.getMonthValue());
    }

    @Test
    void listMine_excludesPaidMonthsFromPendingTotal() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card nubank = Card.builder().id(10L).name("Nubank").icon("💜").user(owner).build();

        Transaction julyExpense = Transaction.builder()
                .amount(new BigDecimal("100.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.of(2026, 7, 15)).build();
        Transaction augustExpense = Transaction.builder()
                .amount(new BigDecimal("60.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.of(2026, 8, 5)).build();

        CardInvoicePayment julyPaid = CardInvoicePayment.builder()
                .card(nubank).year(2026).month(7).paidDate(LocalDate.of(2026, 7, 20)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findByUserOrderByNameAsc(owner)).thenReturn(List.of(nubank));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(julyExpense, augustExpense));
        when(cardInvoicePaymentRepository.findByCardIn(List.of(nubank))).thenReturn(List.of(julyPaid));

        List<CardResponse> result = cardService.listMine();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).totalSpent()).isEqualByComparingTo("160.00");
        assertThat(result.get(0).pendingTotal()).isEqualByComparingTo("60.00");
    }

    @Test
    void update_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Card card = Card.builder().id(10L).user(otherUser).build();
        CardUpdateRequest request = new CardUpdateRequest("Novo Nome", null, 10, 17);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> cardService.update(10L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(cardRepository, never()).save(any());
    }

    @Test
    void update_ownedByCurrentUser_updatesNameAndClosingDay() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(10L).name("Nubank").icon("💜").user(owner).build();
        CardUpdateRequest request = new CardUpdateRequest("Nubank Ultravioleta", null, 10, 17);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));
        when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.update(10L, request);

        assertThat(result.getName()).isEqualTo("Nubank Ultravioleta");
        assertThat(result.getClosingDay()).isEqualTo(10);
        assertThat(result.getDueDay()).isEqualTo(17);
        assertThat(result.getIcon()).isEqualTo("💜");
    }

    @Test
    void listPendingInvoices_excludesPaidMonthsAndSortsAscending() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card nubank = Card.builder().id(10L).name("Nubank").user(owner).build();

        Transaction augustExpense = Transaction.builder()
                .amount(new BigDecimal("60.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.of(2026, 8, 5)).build();
        Transaction julyExpense = Transaction.builder()
                .amount(new BigDecimal("100.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.of(2026, 7, 15)).build();
        Transaction junePaidExpense = Transaction.builder()
                .amount(new BigDecimal("40.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.of(2026, 6, 10)).build();

        CardInvoicePayment junePaid = CardInvoicePayment.builder()
                .card(nubank).year(2026).month(6).paidDate(LocalDate.of(2026, 6, 15)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(nubank));
        when(transactionRepository.findByUserAndCardIsNotNull(owner))
                .thenReturn(List.of(augustExpense, julyExpense, junePaidExpense));
        when(cardInvoicePaymentRepository.findByCard(nubank)).thenReturn(List.of(junePaid));

        List<CardInvoiceResponse> result = cardService.listPendingInvoices(10L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).year()).isEqualTo(2026);
        assertThat(result.get(0).month()).isEqualTo(7);
        assertThat(result.get(0).total()).isEqualByComparingTo("100.00");
        assertThat(result.get(1).month()).isEqualTo(8);
        assertThat(result.get(1).total()).isEqualByComparingTo("60.00");
    }

    @Test
    void listPendingInvoices_groupsByClosingDayInsteadOfCalendarMonth() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card c6 = Card.builder().id(10L).name("C6").user(owner).closingDay(4).build();

        // Comprado em 7 de julho, com fechamento no dia 4: cai na fatura de agosto.
        Transaction purchaseAfterClosingDay = Transaction.builder()
                .amount(new BigDecimal("34.99")).type(CategoryType.EXPENSE).card(c6)
                .date(LocalDate.of(2026, 7, 7)).build();
        // Comprado em 2 de julho, antes do fechamento: cai na fatura de julho.
        Transaction purchaseBeforeClosingDay = Transaction.builder()
                .amount(new BigDecimal("20.00")).type(CategoryType.EXPENSE).card(c6)
                .date(LocalDate.of(2026, 7, 2)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(c6));
        when(transactionRepository.findByUserAndCardIsNotNull(owner))
                .thenReturn(List.of(purchaseAfterClosingDay, purchaseBeforeClosingDay));
        when(cardInvoicePaymentRepository.findByCard(c6)).thenReturn(List.of());

        List<CardInvoiceResponse> result = cardService.listPendingInvoices(10L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).month()).isEqualTo(7);
        assertThat(result.get(0).total()).isEqualByComparingTo("20.00");
        assertThat(result.get(1).month()).isEqualTo(8);
        assertThat(result.get(1).total()).isEqualByComparingTo("34.99");
        // A data real da compra não é alterada.
        assertThat(purchaseAfterClosingDay.getDate()).isEqualTo(LocalDate.of(2026, 7, 7));
    }

    @Test
    void listPendingInvoices_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Card card = Card.builder().id(10L).user(otherUser).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> cardService.listPendingInvoices(10L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");
    }

    @Test
    void markInvoicePaid_noExistingPayment_createsOne() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card nubank = Card.builder().id(10L).user(owner).build();
        CardInvoicePayRequest request = new CardInvoicePayRequest(2026, 7, LocalDate.of(2026, 7, 20));

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(nubank));
        when(cardInvoicePaymentRepository.findByCardAndYearAndMonth(nubank, 2026, 7)).thenReturn(Optional.empty());
        when(cardInvoicePaymentRepository.save(any(CardInvoicePayment.class))).thenAnswer(inv -> inv.getArgument(0));

        cardService.markInvoicePaid(10L, request);

        ArgumentCaptor<CardInvoicePayment> captor = ArgumentCaptor.forClass(CardInvoicePayment.class);
        verify(cardInvoicePaymentRepository).save(captor.capture());
        assertThat(captor.getValue().getCard()).isEqualTo(nubank);
        assertThat(captor.getValue().getYear()).isEqualTo(2026);
        assertThat(captor.getValue().getMonth()).isEqualTo(7);
        assertThat(captor.getValue().getPaidDate()).isEqualTo(LocalDate.of(2026, 7, 20));
    }

    @Test
    void markInvoicePaid_existingPayment_updatesPaidDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card nubank = Card.builder().id(10L).user(owner).build();
        CardInvoicePayment existing = CardInvoicePayment.builder()
                .id(1L).card(nubank).year(2026).month(7).paidDate(LocalDate.of(2026, 7, 18)).build();
        CardInvoicePayRequest request = new CardInvoicePayRequest(2026, 7, LocalDate.of(2026, 7, 22));

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(nubank));
        when(cardInvoicePaymentRepository.findByCardAndYearAndMonth(nubank, 2026, 7)).thenReturn(Optional.of(existing));
        when(cardInvoicePaymentRepository.save(any(CardInvoicePayment.class))).thenAnswer(inv -> inv.getArgument(0));

        cardService.markInvoicePaid(10L, request);

        verify(cardInvoicePaymentRepository).save(existing);
        assertThat(existing.getPaidDate()).isEqualTo(LocalDate.of(2026, 7, 22));
    }

    @Test
    void markInvoicePaid_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Card card = Card.builder().id(10L).user(otherUser).build();
        CardInvoicePayRequest request = new CardInvoicePayRequest(2026, 7, LocalDate.of(2026, 7, 20));

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> cardService.markInvoicePaid(10L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(cardInvoicePaymentRepository, never()).save(any());
    }

    @Test
    void deleteCard_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Card card = Card.builder().id(10L).user(otherUser).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> cardService.deleteCard(10L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(cardRepository, never()).delete(any());
    }

    @Test
    void deleteCard_ownedByCurrentUser_deletesIt() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(10L).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        cardService.deleteCard(10L);

        verify(cardRepository).delete(card);
    }
}
