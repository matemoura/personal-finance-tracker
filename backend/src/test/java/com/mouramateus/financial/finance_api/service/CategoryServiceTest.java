package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.CategoryCreateRequest;
import com.mouramateus.financial.finance_api.dto.CategoryUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.User;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    private CategoryService categoryService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        categoryService = new CategoryService(categoryRepository, userRepository, transactionRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_withBlankIcon_usesDefaultIcon() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        CategoryCreateRequest request = new CategoryCreateRequest("Mercado", CategoryType.EXPENSE, "  ");

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        Category result = categoryService.create(request);

        assertThat(result.getIcon()).isEqualTo("🧾");
        assertThat(result.getUser()).isEqualTo(owner);
    }

    @Test
    void update_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Category category = Category.builder().id(10L).user(otherUser).build();
        CategoryUpdateRequest request = new CategoryUpdateRequest("Novo Nome", CategoryType.EXPENSE, null);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> categoryService.update(10L, request))
                .isInstanceOf(RuntimeException.class);

        verify(categoryRepository, never()).save(any());
    }

    @Test
    void deleteCategory_ownedByAnotherUser_deniesBeforeCheckingTransactions() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Category category = Category.builder().id(10L).user(otherUser).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> categoryService.deleteCategory(10L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Access denied");

        verify(transactionRepository, never()).existsByCategory(any());
        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void deleteCategory_withTransactions_throws() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(transactionRepository.existsByCategory(category)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.deleteCategory(10L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("possui transações");

        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void deleteCategory_ownedAndWithoutTransactions_deletesIt() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Category category = Category.builder().id(10L).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(categoryRepository.findById(10L)).thenReturn(Optional.of(category));
        when(transactionRepository.existsByCategory(category)).thenReturn(false);

        categoryService.deleteCategory(10L);

        verify(categoryRepository).delete(category);
    }
}
