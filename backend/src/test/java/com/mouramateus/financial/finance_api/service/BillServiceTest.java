package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.BillCreateRequest;
import com.mouramateus.financial.finance_api.dto.BillPayRequest;
import com.mouramateus.financial.finance_api.dto.BillResponse;
import com.mouramateus.financial.finance_api.dto.BillUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Bill;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.BillRepository;
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
class BillServiceTest {

    @Mock
    private BillRepository billRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private TransactionRepository transactionRepository;

    private BillService billService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        billService = new BillService(billRepository, userRepository, categoryRepository, transactionRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_withIncomeCategory_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.INCOME).build();
        BillCreateRequest request = new BillCreateRequest("Aluguel", new BigDecimal("1500.00"), LocalDate.now(), 10L);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> billService.create(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("categoria de despesa");

        verify(billRepository, never()).save(any());
    }

    @Test
    void create_withCategoryFromAnotherUser_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Category category = Category.builder().id(10L).user(otherUser).type(CategoryType.EXPENSE).build();
        BillCreateRequest request = new BillCreateRequest("Aluguel", new BigDecimal("1500.00"), LocalDate.now(), 10L);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> billService.create(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("does not belong to user");

        verify(billRepository, never()).save(any());
    }

    @Test
    void create_valid_savesAsUnpaid() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).name("Moradia").icon("🏠").build();
        BillCreateRequest request = new BillCreateRequest("Aluguel", new BigDecimal("1500.00"), LocalDate.now().plusDays(5), 10L);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(billRepository.save(any(Bill.class))).thenAnswer(inv -> inv.getArgument(0));

        BillResponse result = billService.create(request);

        assertThat(result.paid()).isFalse();
        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.categoryName()).isEqualTo("Moradia");
    }

    @Test
    void listMine_computesOverdueStatusForPastDueDate() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).name("Moradia").build();
        Bill overdueBill = Bill.builder().id(1L).description("Aluguel").amount(new BigDecimal("1500.00"))
                .dueDate(LocalDate.now().minusDays(3)).paid(false).category(category).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findByUserOrderByDueDateAsc(owner)).thenReturn(java.util.List.of(overdueBill));

        var result = billService.listMine();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).status()).isEqualTo("OVERDUE");
    }

    @Test
    void markAsPaid_createsTransactionAndUpdatesBill() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).name("Moradia").build();
        Bill bill = Bill.builder().id(1L).description("Aluguel").amount(new BigDecimal("1500.00"))
                .dueDate(LocalDate.now()).paid(false).category(category).user(owner).build();
        BillPayRequest request = new BillPayRequest(LocalDate.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
            Transaction t = inv.getArgument(0);
            t.setId(99L);
            return t;
        });
        when(billRepository.save(any(Bill.class))).thenAnswer(inv -> inv.getArgument(0));

        BillResponse result = billService.markAsPaid(1L, request);

        assertThat(result.paid()).isTrue();
        assertThat(result.status()).isEqualTo("PAID");
        assertThat(result.transactionId()).isEqualTo(99L);

        verify(transactionRepository).save(argThat(t ->
                t.getType() == CategoryType.EXPENSE
                        && t.getAmount().compareTo(new BigDecimal("1500.00")) == 0
                        && t.getCategory().equals(category)
                        && t.getCard() == null
        ));
    }

    @Test
    void update_unpaidBill_changesAllEditableFields() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category oldCategory = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).name("Moradia").build();
        Category newCategory = Category.builder().id(11L).user(owner).type(CategoryType.EXPENSE).name("Lazer").icon("🎮").build();
        Bill bill = Bill.builder().id(1L).description("Aluguel").amount(new BigDecimal("1500.00"))
                .dueDate(LocalDate.of(2026, 11, 5)).paid(false).category(oldCategory).user(owner).build();
        BillUpdateRequest request = new BillUpdateRequest("Aluguel + condomínio", new BigDecimal("1650.50"),
                LocalDate.of(2026, 11, 10), 11L);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));
        when(categoryRepository.findById(11L)).thenReturn(Optional.of(newCategory));
        when(billRepository.save(any(Bill.class))).thenAnswer(inv -> inv.getArgument(0));

        BillResponse result = billService.update(1L, request);

        assertThat(result.description()).isEqualTo("Aluguel + condomínio");
        assertThat(result.amount()).isEqualByComparingTo("1650.50");
        assertThat(result.dueDate()).isEqualTo(LocalDate.of(2026, 11, 10));
        assertThat(result.categoryName()).isEqualTo("Lazer");
        assertThat(result.paid()).isFalse();
    }

    @Test
    void update_paidBill_isRejected() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Bill bill = Bill.builder().id(1L).paid(true).user(owner).build();
        BillUpdateRequest request = new BillUpdateRequest("Aluguel", new BigDecimal("1500.00"), LocalDate.now(), 10L);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billService.update(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("já paga");

        verify(billRepository, never()).save(any());
    }

    @Test
    void update_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Bill bill = Bill.builder().id(1L).paid(false).user(otherUser).build();
        BillUpdateRequest request = new BillUpdateRequest("Aluguel", new BigDecimal("1500.00"), LocalDate.now(), 10L);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billService.update(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(billRepository, never()).save(any());
    }

    @Test
    void update_withIncomeCategory_isRejected() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category income = Category.builder().id(12L).user(owner).type(CategoryType.INCOME).build();
        Bill bill = Bill.builder().id(1L).paid(false).user(owner).build();
        BillUpdateRequest request = new BillUpdateRequest("Aluguel", new BigDecimal("1500.00"), LocalDate.now(), 12L);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));
        when(categoryRepository.findById(12L)).thenReturn(Optional.of(income));

        assertThatThrownBy(() -> billService.update(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("categoria de despesa");

        verify(billRepository, never()).save(any());
    }

    @Test
    void markAsPaid_alreadyPaid_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).type(CategoryType.EXPENSE).build();
        Bill bill = Bill.builder().id(1L).amount(new BigDecimal("1500.00")).dueDate(LocalDate.now())
                .paid(true).category(category).user(owner).build();
        BillPayRequest request = new BillPayRequest(LocalDate.now());

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billService.markAsPaid(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("já está marcada como paga");

        verify(transactionRepository, never()).save(any());
    }

    @Test
    void delete_paidBill_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Bill bill = Bill.builder().id(1L).paid(true).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billService.delete(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("já paga");

        verify(billRepository, never()).delete(any());
    }

    @Test
    void delete_unpaidBillOwnedByCurrentUser_deletesIt() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Bill bill = Bill.builder().id(1L).paid(false).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));

        billService.delete(1L);

        verify(billRepository).delete(bill);
    }

    @Test
    void delete_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Bill bill = Bill.builder().id(1L).paid(false).user(otherUser).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(billRepository.findById(1L)).thenReturn(Optional.of(bill));

        assertThatThrownBy(() -> billService.delete(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(billRepository, never()).delete(any());
    }
}
