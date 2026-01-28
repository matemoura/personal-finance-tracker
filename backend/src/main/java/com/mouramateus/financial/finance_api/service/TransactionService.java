package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.TransactionCreateRequest;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.entity.Transaction;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

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

        Transaction transaction = Transaction.builder()
                .description(dto.description())
                .amount(dto.amount())
                .date(dto.date())
                .type(dto.type())
                .user(user)
                .category(category)
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

        YearMonth yearMonth = YearMonth.of(year, month);

        LocalDate start = yearMonth.atDay(1);
        LocalDate end = yearMonth.atEndOfMonth();

        if (type != null) {
            return transactionRepository.findByUserAndDateBetweenAndType(
                    user, start, end, type
            );
        }

        if (categoryId != null) {
            return transactionRepository.findByUserAndDateBetweenAndCategory_Id(
                    user, start, end, categoryId
            );
        }

        return transactionRepository.findByUserAndDateBetweenOrderByIdDesc(user, start, end);
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
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transação não encontrada"));

        transaction.setDescription(request.description());
        transaction.setAmount(request.amount());
        transaction.setDate(request.date());
        transaction.setType(request.type());

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada"));

        if (category.getType() != request.type()) {
            throw new RuntimeException("O tipo da categoria não corresponde ao tipo da transação");
        }

        transaction.setCategory(category);

        return transactionRepository.save(transaction);
    }
}
