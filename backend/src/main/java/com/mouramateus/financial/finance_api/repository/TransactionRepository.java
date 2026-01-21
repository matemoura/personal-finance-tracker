package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserAndDateBetween(
            User user,
            LocalDate start,
            LocalDate end
    );
}
