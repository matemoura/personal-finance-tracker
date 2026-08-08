package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserAndDateBetween(
            User user,
            LocalDate start,
            LocalDate end
    );

    boolean existsByCategory(Category category);

    @Query("""
        SELECT DISTINCT YEAR(t.date)
        FROM Transaction t
        WHERE t.user = :user
        ORDER BY YEAR(t.date) DESC
    """)
    List<Integer> findDistinctYearsByUser(User user);

    List<Transaction> findByUserAndCardIsNotNull(User user);

    List<Transaction> findByUserAndDateLessThanEqual(User user, LocalDate endDate);
}
