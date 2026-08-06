package com.mouramateus.financial.finance_api.repository;

import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CardInvoicePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardInvoicePaymentRepository extends JpaRepository<CardInvoicePayment, Long> {

    List<CardInvoicePayment> findByCard(Card card);

    List<CardInvoicePayment> findByCardIn(List<Card> cards);

    Optional<CardInvoicePayment> findByCardAndYearAndMonth(Card card, int year, int month);
}
