package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardRepository extends JpaRepository<Card, Long> {

    List<Card> findByUserOrderByNameAsc(User user);
}
