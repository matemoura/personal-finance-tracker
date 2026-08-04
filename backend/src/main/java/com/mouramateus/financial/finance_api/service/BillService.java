package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.BillCreateRequest;
import com.mouramateus.financial.finance_api.dto.BillPayRequest;
import com.mouramateus.financial.finance_api.dto.BillResponse;
import com.mouramateus.financial.finance_api.entity.Bill;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.BillRepository;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BillService {

    private final BillRepository billRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CardRepository cardRepository;
    private final TransactionRepository transactionRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    public BillResponse create(BillCreateRequest dto) {
        User user = currentUser();

        Category category = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada"));

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Category does not belong to user");
        }

        if (category.getType() != CategoryType.EXPENSE) {
            throw new RuntimeException("Uma conta a pagar deve usar uma categoria de despesa");
        }

        Card card = resolveCard(dto.cardId(), user);

        Bill bill = Bill.builder()
                .description(dto.description())
                .amount(dto.amount())
                .dueDate(dto.dueDate())
                .paid(false)
                .category(category)
                .card(card)
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
                .card(bill.getCard())
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

    private Card resolveCard(Long cardId, User user) {
        if (cardId == null) {
            return null;
        }

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Cartão não encontrado"));

        if (!card.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Card does not belong to user");
        }

        return card;
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
        Card card = bill.getCard();

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
                card != null ? card.getId() : null,
                card != null ? card.getName() : null,
                card != null ? card.getIcon() : null,
                bill.getTransaction() != null ? bill.getTransaction().getId() : null
        );
    }
}
