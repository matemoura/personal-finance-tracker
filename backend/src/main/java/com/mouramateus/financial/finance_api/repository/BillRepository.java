package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Bill;
import com.mouramateus.financial.finance_api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillRepository extends JpaRepository<Bill, Long> {

    List<Bill> findByUserOrderByDueDateAsc(User user);
}
