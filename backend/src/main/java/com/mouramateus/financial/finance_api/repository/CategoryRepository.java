package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByUser(User user);

    boolean existsByUserAndTypeAndNameIgnoreCase(User user, CategoryType type, String name);

    boolean existsByUserAndTypeAndNameIgnoreCaseAndIdNot(User user, CategoryType type, String name, Long id);
}
