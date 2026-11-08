package com.mouramateus.financial.finance_api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

// Dia de fechamento do cartão válido só pro mês (year/month) em que a compra
// foi feita — sobrepõe o closing_day padrão do cartão nesse mês específico.
@Entity
@Table(name = "card_closing_overrides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardClosingOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "card_id", nullable = false)
    @JsonIgnore
    private Card card;

    @Column(nullable = false)
    private int year;

    @Column(nullable = false)
    private int month;

    @Column(name = "closing_day", nullable = false)
    private int closingDay;
}
