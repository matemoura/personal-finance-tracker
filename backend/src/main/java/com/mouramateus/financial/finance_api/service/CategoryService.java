package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.CategoryCreateRequest;
import com.mouramateus.financial.finance_api.dto.CategoryUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public Category create(CategoryCreateRequest dto) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        String name = dto.name().trim();

        if (categoryRepository.existsByUserAndTypeAndNameIgnoreCase(user, dto.type(), name)) {
            throw new RuntimeException("Você já tem uma categoria chamada \"" + name + "\" desse tipo.");
        }

        String icon = (dto.icon() == null || dto.icon().isBlank()) ? "🧾" : dto.icon();

        Category category = Category.builder()
                .name(name)
                .type(dto.type())
                .user(user)
                .icon(icon)
                .build();

        return categoryRepository.save(category);
    }

    public List<Category> listMyCategories() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        return categoryRepository.findByUser(user);
    }

    public Category update(Long id, CategoryUpdateRequest dto) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        Category category = categoryRepository.findById(id)
                .orElseThrow();

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acess denied");
        }

        String name = dto.name().trim();

        if (categoryRepository.existsByUserAndTypeAndNameIgnoreCaseAndIdNot(user, dto.type(), name, category.getId())) {
            throw new RuntimeException("Você já tem uma categoria chamada \"" + name + "\" desse tipo.");
        }

        category.setName(name);
        category.setType(dto.type());

        if (dto.icon() != null && !dto.icon().isBlank()) {
            category.setIcon(dto.icon());
        }

        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        Category category = categoryRepository.findById(id)
                .orElseThrow();

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }

        if (transactionRepository.existsByCategory(category)) {
            throw new RuntimeException("Não é possível deletar uma categoria que possui transações.");
        }

        categoryRepository.delete(category);
    }
}
