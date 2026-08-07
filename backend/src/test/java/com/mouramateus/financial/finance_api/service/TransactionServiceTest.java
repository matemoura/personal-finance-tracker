package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.TransactionCreateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
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

    private TransactionService transactionService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        transactionService = new TransactionService(transactionRepository, userRepository, categoryRepository, cardRepository);
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
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null
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
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null
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
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null
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
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 20), CategoryType.EXPENSE, 10L, 5L
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        // A data da transação é sempre a data real da compra; qual fatura ela
        // cai é calculado à parte em CardService, sem tocar nesse campo.
        assertThat(result.getDate()).isEqualTo(LocalDate.of(2026, 3, 20));
    }

    @Test
    void createTransaction_withCardAndDateOnClosingDay_keepsRealPurchaseDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(10).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 10), CategoryType.EXPENSE, 10L, 5L
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
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 5), CategoryType.EXPENSE, 10L, 5L
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.createTransaction(request);

        assertThat(result.getDate()).isEqualTo(LocalDate.of(2026, 3, 5));
    }

    @Test
    void createTransaction_withCardWithoutClosingDay_keepsOriginalDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Card card = Card.builder().id(5L).user(owner).closingDay(null).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.of(2026, 3, 28), CategoryType.EXPENSE, 10L, 5L
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

        verify(transactionRepository, never()).delete(any());
    }

    @Test
    void deleteTransaction_ownedByCurrentUser_deletesIt() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Transaction transaction = Transaction.builder().id(99L).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));

        transactionService.deleteTransaction(99L);

        verify(transactionRepository).delete(transaction);
    }

    @Test
    void update_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Transaction transaction = Transaction.builder().id(99L).user(otherUser).build();
        TransactionCreateRequest request = new TransactionCreateRequest(
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null
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
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null
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
                "Mercado", new BigDecimal("100.00"), LocalDate.now(), CategoryType.EXPENSE, 10L, null
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(transactionRepository.findById(99L)).thenReturn(Optional.of(transaction));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));

        Transaction result = transactionService.update(99L, request);

        assertThat(result.getDescription()).isEqualTo("Mercado");
        assertThat(result.getCategory()).isEqualTo(category);
    }
}
