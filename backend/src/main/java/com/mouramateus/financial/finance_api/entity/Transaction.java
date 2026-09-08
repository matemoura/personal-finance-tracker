package com.mouramateus.financial.finance_api.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CategoryType type;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne
    @JoinColumn(name = "card_id")
    private Card card;

    // Em qual fatura do cartão essa transação cai — independente da data real
    // da compra (ex: parcela 2/10 tem a mesma "date" da parcela 1, mas cai na
    // fatura do mês seguinte). Nulo quando não tem cartão, ou em transações
    // criadas antes desta coluna existir.
    @Column(name = "invoice_year")
    private Integer invoiceYear;

    @Column(name = "invoice_month")
    private Integer invoiceMonth;

    // Posição (a partir de 0) e total de parcelas de uma compra parcelada,
    // gravados uma única vez na criação. É o que permite recalcular a fatura
    // certa (invoiceYear/invoiceMonth) em cada edição sem perder o deslocamento
    // da parcela — sem isso, editar qualquer campo jogava a transação de volta
    // pro mês base. Nulo para transações que não são parcela.
    @Column(name = "installment_index")
    private Integer installmentIndex;

    @Column(name = "installment_total")
    private Integer installmentTotal;
}
