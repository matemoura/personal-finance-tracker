package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.CardCreateRequest;
import com.mouramateus.financial.finance_api.dto.CardResponse;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    public Card create(CardCreateRequest dto) {
        User user = currentUser();

        String icon = (dto.icon() == null || dto.icon().isBlank()) ? "💳" : dto.icon();

        Card card = Card.builder()
                .name(dto.name())
                .icon(icon)
                .user(user)
                .build();

        return cardRepository.save(card);
    }

    public List<CardResponse> listMine() {
        User user = currentUser();

        List<Card> cards = cardRepository.findByUserOrderByNameAsc(user);

        Map<Long, BigDecimal> totalsByCard = transactionRepository.findByUserAndCardIsNotNull(user).stream()
                .filter(t -> t.getType() == CategoryType.EXPENSE)
                .collect(Collectors.groupingBy(
                        t -> t.getCard().getId(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        return cards.stream()
                .map(c -> new CardResponse(
                        c.getId(),
                        c.getName(),
                        c.getIcon(),
                        totalsByCard.getOrDefault(c.getId(), BigDecimal.ZERO)
                ))
                .toList();
    }

    public void deleteCard(Long id) {
        User user = currentUser();

        Card card = cardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cartão não encontrado"));

        if (!card.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: Você não pode excluir este cartão.");
        }

        cardRepository.delete(card);
    }
}
