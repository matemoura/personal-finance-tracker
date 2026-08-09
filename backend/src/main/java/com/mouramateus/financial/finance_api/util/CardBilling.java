package com.mouramateus.financial.finance_api.util;

import com.mouramateus.financial.finance_api.entity.Transaction;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Determina em qual "período" (mês/ano) uma transação deve ser agrupada em
 * todas as telas que filtram por mês (Transações, Dashboard, Relatórios).
 *
 * A data da transação (Transaction.date) é sempre a data real da compra e
 * nunca é alterada. Mas uma compra no cartão feita no dia do fechamento (ou
 * depois) pertence à fatura do mês seguinte — e o usuário espera vê-la
 * agrupada nesse mês em toda a aplicação, não só nos totais do cartão.
 * Transações sem cartão (ou com cartão sem dia de fechamento definido)
 * simplesmente usam o mês/ano real da data.
 *
 * Transações com cartão guardam esse período explicitamente em
 * invoiceYear/invoiceMonth (calculado uma vez, na criação) — essencial para
 * compras parceladas, onde cada parcela tem a MESMA data real mas cai em
 * faturas diferentes (a data sozinha não dá pra distinguir isso). Só cai de
 * volta pro cálculo via data+dia de fechamento para transações antigas,
 * criadas antes dessas colunas existirem.
 */
public final class CardBilling {

    private CardBilling() {
    }

    public static YearMonth periodOf(LocalDate date, Integer cardClosingDay) {
        if (cardClosingDay != null && date.getDayOfMonth() >= cardClosingDay) {
            return YearMonth.from(date).plusMonths(1);
        }
        return YearMonth.from(date);
    }

    public static YearMonth periodOf(Transaction transaction) {
        if (transaction.getInvoiceYear() != null && transaction.getInvoiceMonth() != null) {
            return YearMonth.of(transaction.getInvoiceYear(), transaction.getInvoiceMonth());
        }

        if (transaction.getCard() == null) {
            return YearMonth.from(transaction.getDate());
        }

        return periodOf(transaction.getDate(), transaction.getCard().getClosingDay());
    }
}
