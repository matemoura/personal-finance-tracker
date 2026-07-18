package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.LoanRepayment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, Long> {
}
