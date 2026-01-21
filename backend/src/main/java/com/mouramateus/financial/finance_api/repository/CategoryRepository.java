package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByUser(User user);
}
