package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.dto.ExpensesByCategoryResponse;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserAndDateBetween(
            User user,
            LocalDate start,
            LocalDate end
    );

    List<Transaction> findByUserAndDateBetweenAndType(
            User user,
            LocalDate start,
            LocalDate end,
            CategoryType type
    );

    List<Transaction> findByUserAndDateBetweenAndCategory_Id(
            User user,
            LocalDate start,
            LocalDate end,
            Long CategoryId
    );

    @Query("""
        select coalesce(sum(t.amount), 0)
        from Transaction t
        where t.user = :user
        and t.type = :type
        and t.date between :start and :end
    """)
    BigDecimal sumByUserAndTypeAndDateBetween(
            User user,
            CategoryType type,
            LocalDate start,
            LocalDate end
    );

    @Query("""
        select new com.mouramateus.financial.finance_api.dto.ExpensesByCategoryResponse(
            c.name,
                sum(t.amount)
            )
            from Transaction t
            join t.category c
            where t.user = :user
                and t.type = 'EXPENSE'
                and t.date between :start and :end
             group by c.name        
    """)
    List<ExpensesByCategoryResponse> sumExpensesByCategory(
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

    @Query("""
        SELECT COALESCE(
            SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END), 
            0
        )
        FROM Transaction t
        WHERE t.user = :user
        AND t.date <= :endDate
    """)
    BigDecimal calculateAccumulatedBalance(User user, LocalDate endDate);

    List<Transaction> findByUserAndDateBetweenOrderByIdDesc(User user, LocalDate startDate, LocalDate endDate);
}
