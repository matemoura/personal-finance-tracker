package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.TransactionCreateRequest;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.entity.Transaction;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

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
}
