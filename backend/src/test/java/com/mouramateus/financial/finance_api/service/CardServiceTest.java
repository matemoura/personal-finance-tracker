package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.CardCreateRequest;
import com.mouramateus.financial.finance_api.dto.CardResponse;
import com.mouramateus.financial.finance_api.dto.CardUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardServiceTest {

    @Mock
    private CardRepository cardRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    private CardService cardService;

    private static final String EMAIL = "owner@test.com";

    @BeforeEach
    void setUp() {
        cardService = new CardService(cardRepository, userRepository, transactionRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_withBlankIcon_usesDefaultIcon() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        CardCreateRequest request = new CardCreateRequest("Nubank", "  ", null);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.create(request);

        assertThat(result.getIcon()).isEqualTo("💳");
        assertThat(result.getUser()).isEqualTo(owner);
    }

    @Test
    void listMine_sumsOnlyExpensesForEachCard() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card nubank = Card.builder().id(10L).name("Nubank").icon("💜").user(owner).build();
        Card c6 = Card.builder().id(20L).name("C6").icon("💳").user(owner).build();

        Transaction expense1 = Transaction.builder()
                .amount(new BigDecimal("100.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.now()).build();
        Transaction expense2 = Transaction.builder()
                .amount(new BigDecimal("50.00")).type(CategoryType.EXPENSE).card(nubank).date(LocalDate.now()).build();
        Transaction income = Transaction.builder()
                .amount(new BigDecimal("999.00")).type(CategoryType.INCOME).card(nubank).date(LocalDate.now()).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findByUserOrderByNameAsc(owner)).thenReturn(List.of(nubank, c6));
        when(transactionRepository.findByUserAndCardIsNotNull(owner)).thenReturn(List.of(expense1, expense2, income));

        List<CardResponse> result = cardService.listMine();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(10L);
        assertThat(result.get(0).totalSpent()).isEqualByComparingTo("150.00");
        assertThat(result.get(1).id()).isEqualTo(20L);
        assertThat(result.get(1).totalSpent()).isEqualByComparingTo("0");
    }

    @Test
    void update_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Card card = Card.builder().id(10L).user(otherUser).build();
        CardUpdateRequest request = new CardUpdateRequest("Novo Nome", null, 10);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> cardService.update(10L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(cardRepository, never()).save(any());
    }

    @Test
    void update_ownedByCurrentUser_updatesNameAndClosingDay() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(10L).name("Nubank").icon("💜").user(owner).build();
        CardUpdateRequest request = new CardUpdateRequest("Nubank Ultravioleta", null, 10);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));
        when(cardRepository.save(any(Card.class))).thenAnswer(inv -> inv.getArgument(0));

        Card result = cardService.update(10L, request);

        assertThat(result.getName()).isEqualTo("Nubank Ultravioleta");
        assertThat(result.getClosingDay()).isEqualTo(10);
        assertThat(result.getIcon()).isEqualTo("💜");
    }

    @Test
    void deleteCard_ownedByAnotherUser_throwsAccessDenied() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        User otherUser = User.builder().id(2L).build();
        Card card = Card.builder().id(10L).user(otherUser).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> cardService.deleteCard(10L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Acesso negado");

        verify(cardRepository, never()).delete(any());
    }

    @Test
    void deleteCard_ownedByCurrentUser_deletesIt() {
        User owner = User.builder().id(1L).email(EMAIL).build();
        Card card = Card.builder().id(10L).user(owner).build();

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(owner));
        when(cardRepository.findById(10L)).thenReturn(Optional.of(card));

        cardService.deleteCard(10L);

        verify(cardRepository).delete(card);
    }
}
