package com.mouramateus.financial.finance_api.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.mouramateus.financial.finance_api.entity.Transaction;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.TransactionRepository;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.util.CardBilling;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.YearMonth;
import java.util.List;

@Service
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public ReportService(TransactionRepository transactionRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    // Uma parcela pode ter a mesma data real de qualquer parcela anterior mas
    // cair numa fatura vários meses à frente (invoice_year/invoice_month),
    // então não dá pra restringir a busca a uma janela de datas próxima do
    // mês pedido — precisa checar CardBilling.periodOf em todas as
    // transações do usuário (a data exibida no relatório é sempre a real).
    private List<Transaction> getTransactionsForUser(int year, int month) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        User user = userRepository.findByEmail(email).orElseThrow();

        YearMonth target = YearMonth.of(year, month);

        return transactionRepository.findByUser(user).stream()
                .filter(t -> CardBilling.periodOf(t).equals(target))
                .toList();
    }

    public byte[] generatePdf(int year, int month) {
        List<Transaction> transactions = getTransactionsForUser(year, month);

        try {
            Document document = new Document();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, out);

            document.open();

            document.add(new Paragraph("Relatório Financeiro - " + month + "/" + year));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(5);
            table.addCell("Data");
            table.addCell("Descrição");
            table.addCell("Categoria");
            table.addCell("Tipo");
            table.addCell("Valor");

            for (Transaction transaction : transactions) {
                table.addCell(transaction.getDate().toString());
                table.addCell(transaction.getDescription());
                table.addCell(transaction.getCategory().getName());
                table.addCell(transaction.getType().toString());
                table.addCell(transaction.getAmount().toString());
            }

            document.add(table);
            document.close();

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar PDF", e);
        }
    }

    public byte[] generateExcel(int year, int month) {
        List<Transaction> transactions = getTransactionsForUser(year, month);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Relatório");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Data");
            header.createCell(1).setCellValue("Descrição");
            header.createCell(2).setCellValue("Categoria");
            header.createCell(3).setCellValue("Tipo");
            header.createCell(4).setCellValue("Valor");

            int rowNum = 1;
            for (Transaction transaction : transactions) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(transaction.getDate().toString());
                row.createCell(1).setCellValue(transaction.getDescription());
                row.createCell(2).setCellValue(transaction.getCategory().getName());
                row.createCell(3).setCellValue(transaction.getType().toString());
                row.createCell(4).setCellValue(transaction.getAmount().doubleValue());
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar Excel", e);
        }
    }
}
