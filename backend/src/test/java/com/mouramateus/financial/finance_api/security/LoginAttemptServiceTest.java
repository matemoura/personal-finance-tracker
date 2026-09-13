package com.mouramateus.financial.finance_api.security;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private final LoginAttemptService service = new LoginAttemptService();

    @Test
    void isLocked_withNoAttempts_isFalse() {
        assertThat(service.isLocked("user@test.com")).isFalse();
    }

    @Test
    void isLocked_afterFourFailures_isStillFalse() {
        for (int i = 0; i < 4; i++) service.registerFailure("user@test.com");
        assertThat(service.isLocked("user@test.com")).isFalse();
    }

    @Test
    void isLocked_afterFiveFailures_becomesTrue() {
        for (int i = 0; i < 5; i++) service.registerFailure("user@test.com");
        assertThat(service.isLocked("user@test.com")).isTrue();
    }

    @Test
    void registerSuccess_clearsTheFailureCount() {
        for (int i = 0; i < 4; i++) service.registerFailure("user@test.com");
        service.registerSuccess("user@test.com");

        // Se o contador não tivesse zerado, essa quinta falha já trancaria a conta.
        service.registerFailure("user@test.com");
        assertThat(service.isLocked("user@test.com")).isFalse();
    }

    @Test
    void emailComparisonIsCaseAndWhitespaceInsensitive() {
        for (int i = 0; i < 5; i++) service.registerFailure("  User@Test.com  ");
        assertThat(service.isLocked("user@test.com")).isTrue();
    }

    @Test
    void lockingOneAccountDoesNotAffectAnother() {
        for (int i = 0; i < 5; i++) service.registerFailure("victim@test.com");
        assertThat(service.isLocked("someone-else@test.com")).isFalse();
    }

    @Test
    void aFreshFailureAfterTheLockoutWindowExpired_startsCountingFromOne() throws Exception {
        for (int i = 0; i < 5; i++) service.registerFailure("user@test.com");
        assertThat(service.isLocked("user@test.com")).isTrue();

        // Simula o bloqueio já ter expirado, sem depender de esperar 15
        // minutos de verdade — reflection direto no estado interno.
        expireLockout("user@test.com");
        assertThat(service.isLocked("user@test.com")).isFalse();

        // Uma falha isolada, logo depois de expirar, não deve re-trancar a conta.
        service.registerFailure("user@test.com");
        assertThat(service.isLocked("user@test.com")).isFalse();
    }

    @SuppressWarnings("unchecked")
    private void expireLockout(String email) throws Exception {
        Field attemptsField = LoginAttemptService.class.getDeclaredField("attempts");
        attemptsField.setAccessible(true);
        Map<String, Object> attempts = (Map<String, Object>) attemptsField.get(service);
        Object attempt = attempts.get(email.trim().toLowerCase());

        Field lockedUntilField = attempt.getClass().getDeclaredField("lockedUntilMillis");
        lockedUntilField.setAccessible(true);
        lockedUntilField.set(attempt, System.currentTimeMillis() - 1);
    }
}
