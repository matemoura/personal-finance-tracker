package com.mouramateus.financial.finance_api.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

// Bloqueia tentativas de login por CONTA (e-mail), não por IP — o
// RateLimitFilter já limita por IP, mas isso sozinho não impede alguém de
// tentar várias senhas pro MESMO e-mail vindo de IPs diferentes.
@Component
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_MILLIS = 15 * 60_000; // 15 minutos

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    private static class Attempt {
        final AtomicInteger failures = new AtomicInteger();
        volatile long lockedUntilMillis = 0;
    }

    public boolean isLocked(String email) {
        Attempt attempt = attempts.get(normalize(email));
        return attempt != null && attempt.lockedUntilMillis > System.currentTimeMillis();
    }

    // "synchronized" é de propósito: login não é rota de alto volume (já
    // passa pelo RateLimitFilter antes disso), e serializar aqui evita bugs
    // sutis de concorrência num componente de segurança, sem custo real de
    // performance.
    public synchronized void registerFailure(String email) {
        String key = normalize(email);
        long now = System.currentTimeMillis();
        Attempt attempt = attempts.computeIfAbsent(key, k -> new Attempt());

        // Bloqueio anterior já expirou — começa a contagem do zero.
        if (attempt.lockedUntilMillis > 0 && attempt.lockedUntilMillis < now) {
            attempt.failures.set(0);
            attempt.lockedUntilMillis = 0;
        }

        if (attempt.failures.incrementAndGet() >= MAX_ATTEMPTS) {
            attempt.lockedUntilMillis = now + LOCKOUT_MILLIS;
        }

        // Evita crescimento sem limite do mapa em cenários de muitos e-mails
        // distintos (a mesma lógica de limpeza do RateLimitFilter).
        if (attempts.size() > 10_000) {
            attempts.entrySet().removeIf(e ->
                    e.getValue().lockedUntilMillis > 0 && e.getValue().lockedUntilMillis < now);
        }
    }

    public void registerSuccess(String email) {
        attempts.remove(normalize(email));
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
