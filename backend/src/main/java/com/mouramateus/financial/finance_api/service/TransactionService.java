package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.TransactionCreateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.util.CardBilling;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CardRepository cardRepository;

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

    public Transaction createTransaction(TransactionCreateRequest dto) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        Category category = categoryRepository.findById(dto.categoryId())
                .orElseThrow();

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Category does not belong to user");
        }

        if (category.getType() != dto.type()) {
            throw new RuntimeException(
                    "Erro: O tipo da transação (" + dto.type() +
                            ") não coincide com o tipo da categoria (" + category.getType() + ")"
            );
        }

        Card card = resolveCard(dto.cardId(), user);

        Transaction transaction = Transaction.builder()
                .description(dto.description())
                .amount(dto.amount())
                .date(dto.date())
                .type(dto.type())
                .user(user)
                .category(category)
                .card(card)
                .build();

        return transactionRepository.save(transaction);
    }

    public List<Transaction> listByMonth(
            int year,
            int month,
            CategoryType type,
            Long categoryId
    ) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        YearMonth target = YearMonth.of(year, month);

        return transactionsForPeriod(user, target).stream()
                .filter(t -> type == null || t.getType() == type)
                .filter(t -> categoryId == null || (t.getCategory() != null && categoryId.equals(t.getCategory().getId())))
                .sorted(Comparator.comparing(Transaction::getId).reversed())
                .toList();
    }

    // Uma compra no cartão feita no dia do fechamento (ou depois) pertence à
    // fatura do mês seguinte — então o intervalo de datas real que pode cair
    // no mês pedido começa até um mês antes dele. A data da transação nunca é
    // alterada; só o agrupamento por mês usa esse período (CardBilling.periodOf).
    private List<Transaction> transactionsForPeriod(User user, YearMonth target) {
        LocalDate rangeStart = target.minusMonths(1).atDay(1);
        LocalDate rangeEnd = target.atEndOfMonth();

        return transactionRepository.findByUserAndDateBetween(user, rangeStart, rangeEnd).stream()
                .filter(t -> CardBilling.periodOf(t).equals(target))
                .toList();
    }

    public List<Integer> getAvailableYears() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow();

        List<Integer> years = transactionRepository.findDistinctYearsByUser(user);

        if (years.isEmpty()) {
            return List.of(LocalDate.now().getYear());
        }

        return years;
    }

    public void deleteTransaction(Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transação não encontrada"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: Você não pode excluir esta transação.");
        }

        transactionRepository.delete(transaction);
    }

    public Transaction update(Long id, TransactionCreateRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transação não encontrada"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: Você não pode editar esta transação.");
        }

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada"));

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Category does not belong to user");
        }

        if (category.getType() != request.type()) {
            throw new RuntimeException("O tipo da categoria não corresponde ao tipo da transação");
        }

        Card card = resolveCard(request.cardId(), user);

        transaction.setDescription(request.description());
        transaction.setAmount(request.amount());
        transaction.setDate(request.date());
        transaction.setType(request.type());
        transaction.setCategory(category);
        transaction.setCard(card);

        return transactionRepository.save(transaction);
    }
}
