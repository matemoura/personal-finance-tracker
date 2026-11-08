package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CardClosingOverride;
import com.mouramateus.financial.finance_api.repository.CardClosingOverrideRepository;
import com.mouramateus.financial.finance_api.util.CardBilling;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;

// Descobre qual dia de fechamento vale pra uma compra: o ajuste daquele mês,
// se houver, senão o dia padrão do cartão.
@Service
@RequiredArgsConstructor
public class CardClosingService {

    private final CardClosingOverrideRepository overrideRepository;

    public Integer effectiveClosingDay(Card card, int year, int month) {
        return overrideRepository.findByCardAndYearAndMonth(card, year, month)
                .map(CardClosingOverride::getClosingDay)
                .orElse(card.getClosingDay());
    }

    // Fatura "base" (sem deslocamento de parcela) de uma compra feita em "date".
    public YearMonth basePeriod(Card card, LocalDate date) {
        return CardBilling.periodOf(date, effectiveClosingDay(card, date.getYear(), date.getMonthValue()));
    }
}
