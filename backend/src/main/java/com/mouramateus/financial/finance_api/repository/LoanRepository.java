package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Loan;
import com.mouramateus.financial.finance_api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    List<Loan> findByUserOrderByDateLentDesc(User user);
}
