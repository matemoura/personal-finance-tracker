package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CardClosingOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardClosingOverrideRepository extends JpaRepository<CardClosingOverride, Long> {

    List<CardClosingOverride> findByCardIn(List<Card> cards);

    Optional<CardClosingOverride> findByCardAndYearAndMonth(Card card, int year, int month);
}
