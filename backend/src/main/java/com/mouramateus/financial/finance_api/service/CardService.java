package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.CardClosingOverrideRequest;
import com.mouramateus.financial.finance_api.dto.CardClosingOverrideResponse;
import com.mouramateus.financial.finance_api.dto.CardCreateRequest;
import com.mouramateus.financial.finance_api.dto.CardInvoicePayRequest;
import com.mouramateus.financial.finance_api.dto.CardInvoiceResponse;
import com.mouramateus.financial.finance_api.dto.CardResponse;
import com.mouramateus.financial.finance_api.dto.CardUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CardClosingOverride;
import com.mouramateus.financial.finance_api.entity.CardInvoicePayment;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardClosingOverrideRepository;
import com.mouramateus.financial.finance_api.repository.CardInvoicePaymentRepository;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.util.CardBilling;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final CardInvoicePaymentRepository cardInvoicePaymentRepository;
    private final CardClosingOverrideRepository cardClosingOverrideRepository;
    private final CardClosingService cardClosingService;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private Card findOwnedCard(Long id, User user) {
        Card card = cardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cartão não encontrado"));

        if (!card.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: este cartão não é seu.");
        }

        return card;
    }

    public Card create(CardCreateRequest dto) {
        User user = currentUser();

        String icon = (dto.icon() == null || dto.icon().isBlank()) ? "💳" : dto.icon();

        Card card = Card.builder()
                .name(dto.name())
                .icon(icon)
                .closingDay(dto.closingDay())
                .dueDay(dto.dueDay())
                .user(user)
                .build();

        return cardRepository.save(card);
    }

    public Card update(Long id, CardUpdateRequest dto) {
        User user = currentUser();
        Card card = findOwnedCard(id, user);

        card.setName(dto.name());
        card.setClosingDay(dto.closingDay());
        card.setDueDay(dto.dueDay());

        if (dto.icon() != null && !dto.icon().isBlank()) {
            card.setIcon(dto.icon());
        }

        return cardRepository.save(card);
    }

    public List<CardResponse> listMine() {
        User user = currentUser();

        List<Card> cards = cardRepository.findByUserOrderByNameAsc(user);

        List<Transaction> cardExpenses = transactionRepository.findByUserAndCardIsNotNull(user).stream()
                .filter(t -> t.getType() == CategoryType.EXPENSE)
                .toList();

        Map<Long, BigDecimal> totalsByCard = cardExpenses.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getCard().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        Set<String> paidMonthKeys = cardInvoicePaymentRepository.findByCardIn(cards).stream()
                .map(p -> p.getCard().getId() + "-" + p.getYear() + "-" + p.getMonth())
                .collect(Collectors.toSet());

        Map<Long, BigDecimal> pendingByCard = cardExpenses.stream()
                .filter(t -> !paidMonthKeys.contains(monthKey(t)))
                .collect(Collectors.groupingBy(
                        t -> t.getCard().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        YearMonth currentMonth = YearMonth.now();

        Map<Long, BigDecimal> pendingCurrentMonthByCard = cardExpenses.stream()
                .filter(t -> !paidMonthKeys.contains(monthKey(t)))
                .filter(t -> CardBilling.periodOf(t).equals(currentMonth))
                .collect(Collectors.groupingBy(
                        t -> t.getCard().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        Map<Long, List<CardClosingOverrideResponse>> overridesByCard = cardClosingOverrideRepository.findByCardIn(cards).stream()
                .sorted(Comparator.comparingInt(CardClosingOverride::getYear)
                        .thenComparingInt(CardClosingOverride::getMonth))
                .collect(Collectors.groupingBy(
                        o -> o.getCard().getId(),
                        Collectors.mapping(
                                o -> new CardClosingOverrideResponse(o.getYear(), o.getMonth(), o.getClosingDay()),
                                Collectors.toList()
                        )
                ));

        return cards.stream()
                .map(c -> new CardResponse(
                        c.getId(),
                        c.getName(),
                        c.getIcon(),
                        c.getClosingDay(),
                        c.getDueDay(),
                        totalsByCard.getOrDefault(c.getId(), BigDecimal.ZERO),
                        pendingByCard.getOrDefault(c.getId(), BigDecimal.ZERO),
                        pendingCurrentMonthByCard.getOrDefault(c.getId(), BigDecimal.ZERO),
                        overridesByCard.getOrDefault(c.getId(), List.of())
                ))
                .toList();
    }

    // Define o dia de fechamento de UM mês específico (year/month = mês em que
    // as compras foram feitas), sem mexer no dia padrão do cartão.
    @Transactional
    public void setClosingOverride(Long cardId, CardClosingOverrideRequest dto) {
        User user = currentUser();
        Card card = findOwnedCard(cardId, user);

        Integer previousClosing = cardClosingService.effectiveClosingDay(card, dto.year(), dto.month());

        CardClosingOverride override = cardClosingOverrideRepository
                .findByCardAndYearAndMonth(card, dto.year(), dto.month())
                .orElseGet(() -> CardClosingOverride.builder()
                        .card(card)
                        .year(dto.year())
                        .month(dto.month())
                        .build());
        override.setClosingDay(dto.closingDay());
        cardClosingOverrideRepository.save(override);

        recomputeInvoices(user, card, YearMonth.of(dto.year(), dto.month()), previousClosing, dto.closingDay());
    }

    // Volta aquele mês a seguir o dia padrão do cartão.
    @Transactional
    public void removeClosingOverride(Long cardId, int year, int month) {
        User user = currentUser();
        Card card = findOwnedCard(cardId, user);

        Optional<CardClosingOverride> existing = cardClosingOverrideRepository
                .findByCardAndYearAndMonth(card, year, month);
        if (existing.isEmpty()) {
            return;
        }

        Integer previousClosing = existing.get().getClosingDay();
        cardClosingOverrideRepository.delete(existing.get());

        recomputeInvoices(user, card, YearMonth.of(year, month), previousClosing, card.getClosingDay());
    }

    // A fatura de cada transação é calculada uma vez, na criação, e gravada
    // (invoice_year/invoice_month) — então mudar o fechamento de um mês não
    // reposiciona sozinho o que já foi lançado nele. Aqui as compras daquele
    // cartão e mês são recolocadas na fatura certa, preservando o deslocamento
    // que cada uma já tinha (parcela N continua N meses depois da primeira,
    // mesmo nas antigas que não têm installment_index gravado: o deslocamento
    // é lido da diferença entre a fatura salva e a fatura-base antiga). Linhas
    // antigas sem fatura gravada ganham uma agora, já com o fechamento novo.
    private void recomputeInvoices(User user, Card card, YearMonth month, Integer previousClosing, Integer newClosing) {
        if (Objects.equals(previousClosing, newClosing)) {
            return;
        }

        List<Transaction> affected = transactionRepository.findByUserAndCardIsNotNull(user).stream()
                .filter(t -> t.getCard().getId().equals(card.getId()))
                .filter(t -> YearMonth.from(t.getDate()).equals(month))
                .toList();

        for (Transaction t : affected) {
            YearMonth previousBase = CardBilling.periodOf(t.getDate(), previousClosing);
            YearMonth newBase = CardBilling.periodOf(t.getDate(), newClosing);

            long shift = (t.getInvoiceYear() != null && t.getInvoiceMonth() != null)
                    ? ChronoUnit.MONTHS.between(previousBase, YearMonth.of(t.getInvoiceYear(), t.getInvoiceMonth()))
                    : 0;

            YearMonth period = newBase.plusMonths(shift);
            t.setInvoiceYear(period.getYear());
            t.setInvoiceMonth(period.getMonthValue());
        }

        transactionRepository.saveAll(affected);
    }

    private String monthKey(Transaction t) {
        YearMonth ym = CardBilling.periodOf(t);
        return t.getCard().getId() + "-" + ym.getYear() + "-" + ym.getMonthValue();
    }

    public List<CardInvoiceResponse> listPendingInvoices(Long cardId) {
        User user = currentUser();
        Card card = findOwnedCard(cardId, user);

        Map<YearMonth, BigDecimal> totalsByMonth = transactionRepository.findByUserAndCardIsNotNull(user).stream()
                .filter(t -> t.getCard().getId().equals(card.getId()))
                .filter(t -> t.getType() == CategoryType.EXPENSE)
                .collect(Collectors.groupingBy(
                        CardBilling::periodOf,
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        Set<YearMonth> paidMonths = cardInvoicePaymentRepository.findByCard(card).stream()
                .map(p -> YearMonth.of(p.getYear(), p.getMonth()))
                .collect(Collectors.toSet());

        return totalsByMonth.entrySet().stream()
                .filter(e -> !paidMonths.contains(e.getKey()))
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new CardInvoiceResponse(e.getKey().getYear(), e.getKey().getMonthValue(), e.getValue()))
                .toList();
    }

    public void markInvoicePaid(Long cardId, CardInvoicePayRequest dto) {
        User user = currentUser();
        Card card = findOwnedCard(cardId, user);

        CardInvoicePayment payment = cardInvoicePaymentRepository
                .findByCardAndYearAndMonth(card, dto.year(), dto.month())
                .orElseGet(() -> CardInvoicePayment.builder()
                        .card(card)
                        .year(dto.year())
                        .month(dto.month())
                        .build());

        payment.setPaidDate(dto.paidDate());
        cardInvoicePaymentRepository.save(payment);
    }

    public void deleteCard(Long id) {
        User user = currentUser();
        Card card = findOwnedCard(id, user);

        cardRepository.delete(card);
    }
}
