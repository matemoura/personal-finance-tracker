package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.TransactionCreateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.entity.CardClosingOverride;
import com.mouramateus.financial.finance_api.repository.CardClosingOverrideRepository;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private CardRepository cardRepository;

    @Mock
    private CardClosingOverrideRepository cardClosingOverrideRepository;

    private TransactionService transactionService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        transactionService = new TransactionService(transactionRepository, userRepository, categoryRepository, cardRepository,
                new CardClosingService(cardClosingOverrideRepository));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createTransaction_withOwnCategoryAndMatchingType_savesTransaction() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getDescription()).isEqualTo("Mercado");
        assertThat(result.getUser()).isEqualTo(owner);
        assertThat(result.getCategory()).isEqualTo(category);
    }

    @Test
    void createTransaction_withCategoryFromAnotherUser_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Category category = Category.builder().id(10L).user(otherUser).type(CategoryType.EXPENSE).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> transactionService.createTransaction(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("does not belong to user");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void createTransaction_withMismatchedCategoryType_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.INCOME).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> transactionService.createTransaction(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("não coincide com o tipo da categoria");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void createTransaction_withCardAndDateAfterClosingDay_keepsRealPurchaseDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 20), CategoryType.EXPENSE, 10L, 5L, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        // A data da transação é sempre a data real da compra; a fatura
        // (calculada uma vez, na criação) é que reflete o dia de fechamento.
        assertThat(result.getDate()).isEqualTo(LocalDate.of(2026, 3, 20));
        assertThat(result.getInvoiceYear()).isEqualTo(2026);
        assertThat(result.getInvoiceMonth()).isEqualTo(4);
    }

    @Test
    void createTransaction_withCardAndDateOnClosingDay_keepsRealPurchaseDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 10), CategoryType.EXPENSE, 10L, 5L, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getDate()).isEqualTo(LocalDate.of(2026, 3, 10));
    }

    @Test
    void createTransaction_withCardAndDateBeforeClosingDay_keepsSameMonth() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 5), CategoryType.EXPENSE, 10L, 5L, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getDate()).isEqualTo(LocalDate.of(2026, 3, 5));
    }

    @Test
    void createTransaction_installmentIndex_offsetsInvoicePeriodWithoutChangingDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        // Dia 5, antes do fechamento (dia 10) -> fatura base de março. A
        // parcela 3 (índice 2) deve cair 2 meses depois: maio — mas a data
        // salva continua sendo a mesma data real de todas as parcelas.
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Sofá (3/10)", new BigDecimal("100.00"), LocalDate.of(2026, 3, 5), CategoryType.EXPENSE, 10L, 5L, 2, 10
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getDate()).isEqualTo(LocalDate.of(2026, 3, 5));
        assertThat(result.getInvoiceYear()).isEqualTo(2026);
        assertThat(result.getInvoiceMonth()).isEqualTo(5);
        // O índice/total da parcela precisam ficar salvos na própria transação
        // (não só usados de passagem pro cálculo acima) — é o que permite
        // reconstruir a fatura certa numa edição futura sem esse dado do request.
        assertThat(result.getInstallmentIndex()).isEqualTo(2);
        assertThat(result.getInstallmentTotal()).isEqualTo(10);
    }

    @Test
    void createTransaction_usesThatMonthsClosingOverrideInsteadOfTheCardDefault() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        // Dia 20 de março com fechamento padrão 10 cairia em abril — mas março
        // fechou só no dia 25 desta vez, então a compra ainda é da fatura de março.
        CardClosingOverride override = CardClosingOverride.builder().card(card).year(2026).month(3).closingDay(25).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 20), CategoryType.EXPENSE, 10L, 5L, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(cardClosingOverrideRepository.findByCardAndYearAndMonth(card, 2026, 3)).thenReturn(Optional.of(override));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getInvoiceYear()).isEqualTo(2026);
        assertThat(result.getInvoiceMonth()).isEqualTo(3);
    }

    @Test
    void createTransaction_installmentsKeepTheirOffsetOnTopOfTheOverriddenBase() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        CardClosingOverride override = CardClosingOverride.builder().card(card).year(2026).month(3).closingDay(25).build();
        // Parcela 3 (índice 2): base de março (por causa do override) + 2 = maio.
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Sofá (3/10)", new BigDecimal("100.00"), LocalDate.of(2026, 3, 20), CategoryType.EXPENSE, 10L, 5L, 2, 10
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(cardClosingOverrideRepository.findByCardAndYearAndMonth(card, 2026, 3)).thenReturn(Optional.of(override));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getInvoiceMonth()).isEqualTo(5);
    }

    @Test
    void createTransaction_incomeAsInstallment_isRejected() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.INCOME).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Salário (1/3)", new BigDecimal("1000.00"), LocalDate.of(2026, 3, 5), CategoryType.INCOME, 10L, null, 0, 3
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> transactionService.createTransaction(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Receitas não podem ser parceladas");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void createTransaction_withoutCard_leavesInvoicePeriodNull() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 5), CategoryType.EXPENSE, 10L, null, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getInvoiceYear()).isNull();
        assertThat(result.getInvoiceMonth()).isNull();
    }

    @Test
    void createTransaction_withCardWithoutClosingDay_keepsOriginalDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(null).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 28), CategoryType.EXPENSE, 10L, 5L, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getDate()).isEqualTo(LocalDate.of(2026, 3, 28));
    }

    @Test
    void deleteTransaction_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Transaction transaction = Transaction.builder().id(99L).user(otherUser).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));

        assertThatThrownBy(() -> transactionService.deleteTransaction(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(transactionRepository, never()).deleteAll(anyList());
    }

    @Test
    void deleteTransaction_ownedByCurrentUser_deletesIt() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Transaction transaction = Transaction.builder().id(99L).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));

        transactionService.deleteTransaction(99L);

        verify(transactionRepository).deleteAll(List.of(transaction));
    }

    private Transaction installment(long id, User owner, Card card, String description, LocalDate date) {
        return Transaction.builder()
                .id(id).user(owner).card(card).type(CategoryType.EXPENSE)
                .description(description).amount(new BigDecimal("100.00")).date(date)
                .build();
    }

    @Test
    void deleteTransaction_firstInstallment_alsoDeletesTheFollowingOnes() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).build();
        LocalDate date = LocalDate.of(2026, 3, 5);
        Transaction first = installment(1, owner, card, "Sofá (1/3)", date);
        Transaction second = installment(2, owner, card, "Sofá (2/3)", date);
        Transaction third = installment(3, owner, card, "Sofá (3/3)", date);
        Transaction unrelated = installment(4, owner, card, "Mercado", date);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(first));
        when(transactionRepository.findByUser(owner)).thenReturn(List.of(first, second, third, unrelated));

        transactionService.deleteTransaction(1L);

        ArgumentCaptor<List<Transaction>> captor = ArgumentCaptor.forClass(List.class);
        verify(transactionRepository).deleteAll(captor.capture());
        assertThat(captor.getValue()).containsExactlyInAnyOrder(first, second, third);
    }

    @Test
    void deleteTransaction_nonFirstInstallment_deletesOnlyItself() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).build();
        LocalDate date = LocalDate.of(2026, 3, 5);
        Transaction second = installment(2, owner, card, "Sofá (2/3)", date);
        Transaction third = installment(3, owner, card, "Sofá (3/3)", date);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(2L)).thenReturn(Optional.of(second));

        transactionService.deleteTransaction(2L);

        verify(transactionRepository).deleteAll(List.of(second));
        verify(transactionRepository, never()).findByUser(any());
    }

    @Test
    void deleteTransaction_firstInstallment_ignoresInstallmentsOfAnOlderPurchaseWithTheSameName() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).build();
        // Compra antiga de mesmo nome (data anterior à da nova parcela 1).
        Transaction oldTwo = installment(10, owner, card, "Sofá (2/3)", LocalDate.of(2025, 1, 5));
        Transaction first = installment(20, owner, card, "Sofá (1/3)", LocalDate.of(2026, 3, 5));
        Transaction newTwo = installment(21, owner, card, "Sofá (2/3)", LocalDate.of(2026, 3, 5));

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(20L)).thenReturn(Optional.of(first));
        when(transactionRepository.findByUser(owner)).thenReturn(List.of(oldTwo, first, newTwo));

        transactionService.deleteTransaction(20L);

        ArgumentCaptor<List<Transaction>> captor = ArgumentCaptor.forClass(List.class);
        verify(transactionRepository).deleteAll(captor.capture());
        assertThat(captor.getValue()).containsExactlyInAnyOrder(first, newTwo);
    }

    @Test
    void deleteTransaction_firstInstallment_ignoresOtherCardsAndOtherTotals() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).build();
        Card otherCard = Card.builder().id(6L).user(owner).build();
        LocalDate date = LocalDate.of(2026, 3, 5);
        Transaction first = installment(1, owner, card, "Sofá (1/3)", date);
        Transaction otherCardTwo = installment(2, owner, otherCard, "Sofá (2/3)", date);
        Transaction otherTotalTwo = installment(3, owner, card, "Sofá (2/5)", date);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(first));
        when(transactionRepository.findByUser(owner)).thenReturn(List.of(first, otherCardTwo, otherTotalTwo));

        transactionService.deleteTransaction(1L);

        verify(transactionRepository).deleteAll(List.of(first));
    }

    @Test
    void deleteTransaction_firstInstallment_ofTwoIdenticalPurchases_removesOnlyOneChain() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(5L).user(owner).build();
        LocalDate date = LocalDate.of(2026, 3, 5);
        Transaction firstA = installment(1, owner, card, "Carregador (1/2)", date);
        Transaction firstB = installment(2, owner, card, "Carregador (1/2)", date);
        Transaction secondA = installment(3, owner, card, "Carregador (2/2)", date);
        Transaction secondB = installment(4, owner, card, "Carregador (2/2)", date);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(firstA));
        when(transactionRepository.findByUser(owner)).thenReturn(List.of(firstA, firstB, secondA, secondB));

        transactionService.deleteTransaction(1L);

        ArgumentCaptor<List<Transaction>> captor = ArgumentCaptor.forClass(List.class);
        verify(transactionRepository).deleteAll(captor.capture());
        // Só uma parcela 2/2 (a mais antiga) acompanha a exclusão; a outra compra fica intacta.
        assertThat(captor.getValue()).containsExactlyInAnyOrder(firstA, secondA);
    }

    @Test
    void update_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Transaction transaction = Transaction.builder().id(99L).user(otherUser).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));

        assertThatThrownBy(() -> transactionService.update(99L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void update_withCategoryFromAnotherUser_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Transaction transaction = Transaction.builder().id(99L).user(owner).build();
        Category category = Category.builder().id(10L).user(otherUser).type(CategoryType.EXPENSE).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> transactionService.update(99L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("does not belong to user");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void update_ownedByCurrentUser_savesChanges() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Transaction transaction = Transaction.builder().id(99L).user(owner).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.update(99L, request);

        assertThat(result.getDescription()).isEqualTo("Mercado");
        assertThat(result.getCategory()).isEqualTo(category);
    }

    @Test
    void update_preservesInstallmentOffset_evenThoughRequestNeverSendsIt() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();

        // Parcela 3/10 (índice 2) criada originalmente caindo em maio
        // (fatura base de março + 2 meses).
        Transaction transaction = Transaction.builder()
                .id(99L).user(owner).category(category).card(card).type(CategoryType.EXPENSE)
                .description("Sofá (3/10)").amount(new BigDecimal("100.00"))
                .date(LocalDate.of(2026, 3, 5))
                .invoiceYear(2026).invoiceMonth(5)
                .installmentIndex(2).installmentTotal(10)
                .build();

        // O formulário de edição só muda o valor — nunca envia installmentIndex.
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Sofá (3/10)", new BigDecimal("120.00"), LocalDate.of(2026, 3, 5),
                CategoryType.EXPENSE, 10L, 5L, null, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.update(99L, request);

        assertThat(result.getAmount()).isEqualByComparingTo("120.00");
        // Continua caindo em maio — se o índice nulo do request fosse usado em
        // vez do índice já gravado na transação, isso voltaria pra março.
        assertThat(result.getInvoiceYear()).isEqualTo(2026);
        assertThat(result.getInvoiceMonth()).isEqualTo(5);
        assertThat(result.getInstallmentIndex()).isEqualTo(2);
        assertThat(result.getInstallmentTotal()).isEqualTo(10);
    }

    @Test
    void listByMonth_cardPurchaseOnOrAfterClosingDayAppearsInNextMonthsList() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card c6 = Card.builder().id(5L).user(owner).closingDay(4).build();

        // Comprado em 15/07, com fechamento no dia 4: pertence à fatura de
        // agosto, então precisa aparecer na lista de agosto (mantendo a data
        // real de julho no próprio registro).
        Transaction julyPurchase = Transaction.builder()
                .id(1L).user(owner).card(c6).type(CategoryType.EXPENSE)
                .amount(new BigDecimal("150.00")).date(LocalDate.of(2026, 7, 15)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findByUser(owner))
                .thenReturn(List.of(julyPurchase));

        List<Transaction> august = transactionService.listByMonth(2026, 8, null, null);
        List<Transaction> july = transactionService.listByMonth(2026, 7, null, null);

        assertThat(august).containsExactly(julyPurchase);
        assertThat(july).isEmpty();
        assertThat(julyPurchase.getDate()).isEqualTo(LocalDate.of(2026, 7, 15));
    }

    @Test
    void listByMonth_cardPurchaseBeforeClosingDayStaysInSameMonth() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card c6 = Card.builder().id(5L).user(owner).closingDay(20).build();

        Transaction purchase = Transaction.builder()
                .id(1L).user(owner).card(c6).type(CategoryType.EXPENSE)
                .amount(new BigDecimal("80.00")).date(LocalDate.of(2026, 7, 10)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findByUser(owner))
                .thenReturn(List.of(purchase));

        List<Transaction> july = transactionService.listByMonth(2026, 7, null, null);

        assertThat(july).containsExactly(purchase);
    }

    @Test
    void listByMonth_filtersByTypeAndCategoryAfterGroupingByPeriod() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category mercado = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Category outra = Category.builder().id(11L).user(owner).type(CategoryType.EXPENSE).build();

        Transaction wantedExpense = Transaction.builder()
                .id(1L).user(owner).type(CategoryType.EXPENSE).category(mercado)
                .amount(new BigDecimal("50.00")).date(LocalDate.of(2026, 7, 5)).build();
        Transaction otherCategory = Transaction.builder()
                .id(2L).user(owner).type(CategoryType.EXPENSE).category(outra)
                .amount(new BigDecimal("30.00")).date(LocalDate.of(2026, 7, 6)).build();
        Transaction income = Transaction.builder()
                .id(3L).user(owner).type(CategoryType.INCOME).category(mercado)
                .amount(new BigDecimal("999.00")).date(LocalDate.of(2026, 7, 7)).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findByUser(owner))
                .thenReturn(List.of(wantedExpense, otherCategory, income));

        List<Transaction> result = transactionService.listByMonth(2026, 7, CategoryType.EXPENSE, 10L);

        assertThat(result).containsExactly(wantedExpense);
    }
}
