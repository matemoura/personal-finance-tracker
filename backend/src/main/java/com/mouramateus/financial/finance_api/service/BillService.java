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
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

// Conta a pagar não tem cartão: compra no cartão é lançada como despesa (já
// com o cartão) na tela de Transações. Aqui é só o que vence em dinheiro/conta.
@Service
@RequiredArgsConstructor
public class BillService {

    private final BillRepository billRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    public BillResponse create(BillCreateRequest dto) {
        User user = currentUser();
        Category category = resolveExpenseCategory(dto.categoryId(), user);

        Bill bill = Bill.builder()
                .description(dto.description())
                .amount(dto.amount())
                .dueDate(dto.dueDate())
                .paid(false)
                .category(category)
                .user(user)
                .build();

        return toResponse(billRepository.save(bill));
    }

    public List<BillResponse> listMine() {
        return billRepository.findByUserOrderByDueDateAsc(currentUser())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Só conta ainda não paga pode ser editada: ao pagar, ela vira uma
    // transação própria (com a data do pagamento), e mexer na conta depois
    // deixaria as duas descasadas. Pra corrigir uma conta paga, o caminho é
    // editar a transação correspondente na tela de Transações.
    public BillResponse update(Long id, BillUpdateRequest dto) {
        User user = currentUser();
        Bill bill = findOwned(id);

        if (bill.isPaid()) {
            throw new RuntimeException("Não é possível editar uma conta já paga. Edite a transação correspondente na tela de Transações.");
        }

        Category category = resolveExpenseCategory(dto.categoryId(), user);

        bill.setDescription(dto.description());
        bill.setAmount(dto.amount());
        bill.setDueDate(dto.dueDate());
        bill.setCategory(category);

        return toResponse(billRepository.save(bill));
    }

    public BillResponse markAsPaid(Long id, BillPayRequest dto) {
        Bill bill = findOwned(id);

        if (bill.isPaid()) {
            throw new RuntimeException("Esta conta já está marcada como paga.");
        }

        Transaction transaction = Transaction.builder()
                .description(bill.getDescription())
                .amount(bill.getAmount())
                .date(dto.paidDate())
                .type(CategoryType.EXPENSE)
                .user(bill.getUser())
                .category(bill.getCategory())
                .build();

        transactionRepository.save(transaction);

        bill.setPaid(true);
        bill.setPaidDate(dto.paidDate());
        bill.setTransaction(transaction);

        return toResponse(billRepository.save(bill));
    }

    public void delete(Long id) {
        Bill bill = findOwned(id);

        if (bill.isPaid()) {
            throw new RuntimeException("Não é possível excluir uma conta já paga. Exclua a transação correspondente na tela de Transações.");
        }

        billRepository.delete(bill);
    }

    private Category resolveExpenseCategory(Long categoryId, User user) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada"));

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Category does not belong to user");
        }

        if (category.getType() != CategoryType.EXPENSE) {
            throw new RuntimeException("Uma conta a pagar deve usar uma categoria de despesa");
        }

        return category;
    }

    private Bill findOwned(Long id) {
        User user = currentUser();
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conta não encontrada"));

        if (!bill.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: esta conta não é sua.");
        }

        return bill;
    }

    private BillResponse toResponse(Bill bill) {
        String status;
        if (bill.isPaid()) {
            status = "PAID";
        } else if (bill.getDueDate().isBefore(LocalDate.now())) {
            status = "OVERDUE";
        } else {
            status = "PENDING";
        }

        Category category = bill.getCategory();

        return new BillResponse(
                bill.getId(),
                bill.getDescription(),
                bill.getAmount(),
                bill.getDueDate(),
                bill.isPaid(),
                bill.getPaidDate(),
                status,
                category.getId(),
                category.getName(),
                category.getIcon(),
                bill.getTransaction() != null ? bill.getTransaction().getId() : null
        );
    }
}
