package com.mouramateus.financial.finance_api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendResetToken(String to, String token) {
        String url = "http://127.0.0.1:5500/reset-password.html?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Recuperação de Senha - Finance Tracker");
        message.setText("Para redefinir sua senha, clique no link abaixo:\n\n" + url + "\n\nO link expira em 30 minutos.");

        mailSender.send(message);
    }
}
