package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.TransactionCreateRequest;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardRepository;
import com.mouramateus.financial.finance_api.repository.CategoryRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.util.CardBilling;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CardRepository cardRepository;
    private final CardClosingService cardClosingService;

    private Card resolveCard(Long cardId, User user) {
        if (cardId == null) {
            return null;
        }

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Cartão não encontrado"));

        if (!card.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Card does not belong to user");
        }

        return card;
    }

    public Transaction createTransaction(TransactionCreateRequest dto) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        Category category = categoryRepository.findById(dto.categoryId())
                .orElseThrow();

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Category does not belong to user");
        }

        if (category.getType() != dto.type()) {
            throw new RuntimeException(
                    "Erro: O tipo da transação (" + dto.type() +
                            ") não coincide com o tipo da categoria (" + category.getType() + ")"
            );
        }

        if (dto.type() == CategoryType.INCOME
                && (dto.installmentIndex() != null || dto.installmentTotal() != null)) {
            throw new RuntimeException("Receitas não podem ser parceladas.");
        }

        Card card = resolveCard(dto.cardId(), user);
        YearMonth invoicePeriod = invoicePeriodFor(dto.date(), card, dto.installmentIndex());

        Transaction transaction = Transaction.builder()
                .description(dto.description())
                .amount(dto.amount())
                .date(dto.date())
                .type(dto.type())
                .user(user)
                .category(category)
                .card(card)
                .invoiceYear(invoicePeriod != null ? invoicePeriod.getYear() : null)
                .invoiceMonth(invoicePeriod != null ? invoicePeriod.getMonthValue() : null)
                .installmentIndex(dto.installmentIndex())
                .installmentTotal(dto.installmentTotal())
                .build();

        return transactionRepository.save(transaction);
    }

    // Calcula, uma única vez na criação, em qual fatura essa transação cai —
    // deslocado por "installmentIndex" meses no caso de uma parcela (parcela
    // 0 usa a fatura correspondente à data real; parcela N usa N meses depois
    // dessa mesma fatura, mesmo que todas as parcelas compartilhem a mesma
    // "date"). Sem cartão, não existe fatura: fica nulo.
    private YearMonth invoicePeriodFor(LocalDate date, Card card, Integer installmentIndex) {
        if (card == null) {
            return null;
        }

        YearMonth base = cardClosingService.basePeriod(card, date);
        int offset = installmentIndex != null ? installmentIndex : 0;
        return base.plusMonths(offset);
    }

    public List<Transaction> listByMonth(
            int year,
            int month,
            CategoryType type,
            Long categoryId
    ) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        YearMonth target = YearMonth.of(year, month);

        return transactionsForPeriod(user, target).stream()
                .filter(t -> type == null || t.getType() == type)
                .filter(t -> categoryId == null || (t.getCategory() != null && categoryId.equals(t.getCategory().getId())))
                .sorted(Comparator.comparing(Transaction::getId).reversed())
                .toList();
    }

    // Uma parcela pode ter a mesma data real de qualquer parcela anterior mas
    // cair numa fatura vários meses à frente (invoice_year/invoice_month),
    // então não dá pra restringir a busca a uma janela de datas próxima do
    // mês pedido — precisa checar CardBilling.periodOf em todas as
    // transações do usuário. A data da transação nunca é alterada; só o
    // agrupamento por mês usa esse período.
    private List<Transaction> transactionsForPeriod(User user, YearMonth target) {
        return transactionRepository.findByUser(user).stream()
                .filter(t -> CardBilling.periodOf(t).equals(target))
                .toList();
    }

    public List<Integer> getAvailableYears() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow();

        List<Integer> years = transactionRepository.findDistinctYearsByUser(user);

        if (years.isEmpty()) {
            return List.of(LocalDate.now().getYear());
        }

        return years;
    }

    public void deleteTransaction(Long id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transação não encontrada"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: Você não pode excluir esta transação.");
        }

        List<Transaction> toDelete = new ArrayList<>();
        toDelete.add(transaction);
        toDelete.addAll(followingInstallments(user, transaction));

        transactionRepository.deleteAll(toDelete);
    }

    private static final Pattern INSTALLMENT_SUFFIX = Pattern.compile("^(.*) \\((\\d+)/(\\d+)\\)$", Pattern.DOTALL);

    // Excluir a parcela 1 de uma compra parcelada leva junto as parcelas 2..N
    // — não faz sentido sobrar "3/10" de uma compra que o usuário apagou. Não
    // existe um id de grupo ligando as parcelas (compras antigas nem têm
    // installment_index), então elas são reconhecidas pelo mesmo jeito que os
    // scripts de correção já usam: descrição "<base> (k/N)" igual na base e no
    // N, mesmo cartão e mesmo tipo. Duas travas contra apagar a compra errada:
    // só entram parcelas com data igual ou posterior à da parcela 1 (uma compra
    // antiga de mesmo nome já teria data anterior), e pra cada k só UMA linha é
    // escolhida (a mais antiga), então duas compras idênticas em paralelo não
    // perdem as duas de uma vez. Qualquer outra parcela (2/N em diante) é
    // excluída sozinha, como sempre.
    private List<Transaction> followingInstallments(User user, Transaction first) {
        if (first.getDescription() == null) {
            return List.of();
        }

        Matcher firstMatch = INSTALLMENT_SUFFIX.matcher(first.getDescription());
        if (!firstMatch.matches()
                || Integer.parseInt(firstMatch.group(2)) != 1
                || Integer.parseInt(firstMatch.group(3)) < 2) {
            return List.of();
        }

        String base = firstMatch.group(1);
        int total = Integer.parseInt(firstMatch.group(3));
        Long cardId = first.getCard() != null ? first.getCard().getId() : null;

        Map<Integer, Transaction> pickedByNumber = new HashMap<>();

        for (Transaction candidate : transactionRepository.findByUser(user)) {
            if (candidate.getId().equals(first.getId())
                    || candidate.getDescription() == null
                    || candidate.getType() != first.getType()
                    || candidate.getDate().isBefore(first.getDate())) {
                continue;
            }

            Long candidateCardId = candidate.getCard() != null ? candidate.getCard().getId() : null;
            if (!Objects.equals(cardId, candidateCardId)) {
                continue;
            }

            Matcher m = INSTALLMENT_SUFFIX.matcher(candidate.getDescription());
            if (!m.matches() || !m.group(1).equals(base) || Integer.parseInt(m.group(3)) != total) {
                continue;
            }

            int number = Integer.parseInt(m.group(2));
            if (number < 2 || number > total) {
                continue;
            }

            Transaction current = pickedByNumber.get(number);
            boolean older = current == null
                    || candidate.getDate().isBefore(current.getDate())
                    || (candidate.getDate().isEqual(current.getDate()) && candidate.getId() < current.getId());
            if (older) {
                pickedByNumber.put(number, candidate);
            }
        }

        return new ArrayList<>(pickedByNumber.values());
    }

    public Transaction update(Long id, TransactionCreateRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transação não encontrada"));

        if (!transaction.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: Você não pode editar esta transação.");
        }

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada"));

        if (!category.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Category does not belong to user");
        }

        if (category.getType() != request.type()) {
            throw new RuntimeException("O tipo da categoria não corresponde ao tipo da transação");
        }

        Card card = resolveCard(request.cardId(), user);
        // Usa o installmentIndex já gravado NA TRANSAÇÃO (não o do request, que
        // o formulário de edição nunca preenche) — assim editar qualquer campo
        // (valor, categoria, cartão...) recalcula a fatura certa mantendo o
        // deslocamento da parcela, em vez de jogá-la de volta pro mês base.
        // Para uma transação que não é parcela, installmentIndex já é nulo (= 0).
        YearMonth invoicePeriod = invoicePeriodFor(request.date(), card, transaction.getInstallmentIndex());

        transaction.setDescription(request.description());
        transaction.setAmount(request.amount());
        transaction.setDate(request.date());
        transaction.setType(request.type());
        transaction.setCategory(category);
        transaction.setCard(card);
        transaction.setInvoiceYear(invoicePeriod != null ? invoicePeriod.getYear() : null);
        transaction.setInvoiceMonth(invoicePeriod != null ? invoicePeriod.getMonthValue() : null);

        return transactionRepository.save(transaction);
    }
}
