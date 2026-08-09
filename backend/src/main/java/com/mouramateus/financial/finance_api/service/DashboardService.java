package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.DashboardSummaryResponse;
import com.mouramateus.financial.finance_api.dto.ExpensesByCategoryResponse;
import com.mouramateus.financial.finance_api.entity.Card;
import com.mouramateus.financial.finance_api.entity.CategoryType;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.CardInvoicePaymentRepository;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.util.CardBilling;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CardInvoicePaymentRepository cardInvoicePaymentRepository;

    public DashboardService(
            TransactionRepository transactionRepository,
            UserRepository userRepository,
            CardInvoicePaymentRepository cardInvoicePaymentRepository
    ) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.cardInvoicePaymentRepository = cardInvoicePaymentRepository;
    }

    public DashboardSummaryResponse getSummary(int year, int month) {

        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        YearMonth target = YearMonth.of(year, month);
        List<Transaction> periodTransactions = transactionsForPeriod(user, target);

        BigDecimal income = sumWhere(periodTransactions, t -> t.getType() == CategoryType.INCOME);
        BigDecimal expense = sumWhere(periodTransactions, t -> t.getType() == CategoryType.EXPENSE);

        BigDecimal accumulatedBalance = calculateCashBalance(user, target.atEndOfMonth());

        return new DashboardSummaryResponse(income, expense, accumulatedBalance);
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

    /**
     * Regime de caixa: uma despesa em cartão só sai do saldo quando a fatura
     * correspondente é marcada como paga (usando a data do pagamento), em vez
     * de na data da compra. Despesas fora de cartão continuam descontando na hora.
     */
    private BigDecimal calculateCashBalance(User user, LocalDate end) {
        List<Transaction> transactions = transactionRepository.findByUserAndDateLessThanEqual(user, end);

        BigDecimal income = sumWhere(transactions, t -> t.getType() == CategoryType.INCOME);
        BigDecimal cashExpenses = sumWhere(transactions,
                t -> t.getType() == CategoryType.EXPENSE && t.getCard() == null);

        List<Transaction> cardExpenses = transactionRepository.findByUserAndCardIsNotNull(user).stream()
                .filter(t -> t.getType() == CategoryType.EXPENSE)
                .toList();

        Map<String, BigDecimal> totalsByCardMonth = cardExpenses.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getCard().getId() + "-" + CardBilling.periodOf(t),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        List<Card> cards = cardExpenses.stream().map(Transaction::getCard).distinct().toList();

        BigDecimal paidInvoices = cardInvoicePaymentRepository.findByCardIn(cards).stream()
                .filter(p -> !p.getPaidDate().isAfter(end))
                .map(p -> totalsByCardMonth.getOrDefault(
                        p.getCard().getId() + "-" + YearMonth.of(p.getYear(), p.getMonth()), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return income.subtract(cashExpenses).subtract(paidInvoices);
    }

    private BigDecimal sumWhere(List<Transaction> transactions, Predicate<Transaction> filter) {
        return transactions.stream()
                .filter(filter)
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<ExpensesByCategoryResponse> getExpensesByCategory(int year, int month) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow();

        YearMonth target = YearMonth.of(year, month);

        Map<String, BigDecimal> totalsByCategory = transactionsForPeriod(user, target).stream()
                .filter(t -> t.getType() == CategoryType.EXPENSE)
                .collect(Collectors.groupingBy(
                        t -> t.getCategory().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
                ));

        return totalsByCategory.entrySet().stream()
                .map(e -> new ExpensesByCategoryResponse(e.getKey(), e.getValue()))
                .toList();
    }
}
