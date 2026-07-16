package com.mouramateus.financial.finance_api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MILLIS = 60_000;
    private static final int MAX_REQUESTS_PER_WINDOW = 10;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private static class Window {
        volatile long startMillis;
        final AtomicInteger count = new AtomicInteger();

        Window(long startMillis) {
            this.startMillis = startMillis;
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        boolean sensitive = path.startsWith("/api/auth/")
                || (path.equals("/api/users") && "POST".equalsIgnoreCase(request.getMethod()));
        return !sensitive;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String clientIp = resolveClientIp(request);
        long nowMillis = System.currentTimeMillis();

        Window window = windows.compute(clientIp, (ip, current) -> {
            if (current == null || nowMillis - current.startMillis >= WINDOW_MILLIS) {
                return new Window(nowMillis);
            }
            return current;
        });

        if (window.count.incrementAndGet() > MAX_REQUESTS_PER_WINDOW) {
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Muitas tentativas. Aguarde um minuto e tente novamente.\"}");
            return;
        }

        // Evita crescimento sem limite do mapa em cenários de muitos IPs distintos
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> nowMillis - e.getValue().startMillis >= WINDOW_MILLIS);
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
