package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.LoanCreateRequest;
import com.mouramateus.financial.finance_api.dto.LoanResponse;
import com.mouramateus.financial.finance_api.dto.LoanSummaryResponse;
import com.mouramateus.financial.finance_api.dto.RepaymentCreateRequest;
import com.mouramateus.financial.finance_api.dto.RepaymentResponse;
import com.mouramateus.financial.finance_api.entity.Loan;
import com.mouramateus.financial.finance_api.entity.LoanRepayment;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.LoanRepaymentRepository;
import com.mouramateus.financial.finance_api.repository.LoanRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final UserRepository userRepository;

    private User currentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    public LoanResponse create(LoanCreateRequest request) {
        Loan loan = Loan.builder()
                .personName(request.personName())
                .description(request.description())
                .amount(request.amount())
                .dateLent(request.dateLent())
                .expectedReturnDate(request.expectedReturnDate())
                .user(currentUser())
                .build();

        return toResponse(loanRepository.save(loan));
    }

    public List<LoanResponse> listMine() {
        return loanRepository.findByUserOrderByDateLentDesc(currentUser())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public LoanResponse registerRepayment(Long loanId, RepaymentCreateRequest request) {
        Loan loan = findOwned(loanId);

        BigDecimal alreadyReturned = sumRepayments(loan);
        BigDecimal remaining = loan.getAmount().subtract(alreadyReturned);

        if (request.amount().compareTo(remaining) > 0) {
            throw new RuntimeException(
                    "Valor do recebimento (" + request.amount() + ") é maior que o saldo pendente (" + remaining + ")"
            );
        }

        LoanRepayment repayment = LoanRepayment.builder()
                .amount(request.amount())
                .date(request.date())
                .loan(loan)
                .build();

        loanRepaymentRepository.save(repayment);
        loan.getRepayments().add(repayment);

        return toResponse(loan);
    }

    public void delete(Long loanId) {
        Loan loan = findOwned(loanId);
        loanRepository.delete(loan);
    }

    public LoanSummaryResponse getSummary() {
        List<Loan> loans = loanRepository.findByUserOrderByDateLentDesc(currentUser());

        BigDecimal totalLent = BigDecimal.ZERO;
        BigDecimal totalReturned = BigDecimal.ZERO;
        long pendingCount = 0;

        for (Loan loan : loans) {
            BigDecimal returned = sumRepayments(loan);
            BigDecimal remaining = loan.getAmount().subtract(returned);

            totalLent = totalLent.add(loan.getAmount());
            totalReturned = totalReturned.add(returned);

            if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                pendingCount++;
            }
        }

        return new LoanSummaryResponse(totalLent, totalReturned, totalLent.subtract(totalReturned), pendingCount);
    }

    private Loan findOwned(Long loanId) {
        User user = currentUser();
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Empréstimo não encontrado"));

        if (!loan.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Acesso negado: este empréstimo não é seu.");
        }

        return loan;
    }

    private BigDecimal sumRepayments(Loan loan) {
        return loan.getRepayments().stream()
                .map(LoanRepayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private LoanResponse toResponse(Loan loan) {
        BigDecimal returned = sumRepayments(loan);
        BigDecimal remaining = loan.getAmount().subtract(returned);

        String status;
        if (returned.compareTo(BigDecimal.ZERO) <= 0) {
            status = "PENDING";
        } else if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            status = "PAID";
        } else {
            status = "PARTIAL";
        }

        List<RepaymentResponse> repayments = loan.getRepayments().stream()
                .map(r -> new RepaymentResponse(r.getId(), r.getAmount(), r.getDate()))
                .toList();

        return new LoanResponse(
                loan.getId(),
                loan.getPersonName(),
                loan.getDescription(),
                loan.getAmount(),
                returned,
                remaining,
                status,
                loan.getDateLent(),
                loan.getExpectedReturnDate(),
                repayments
        );
    }
}
