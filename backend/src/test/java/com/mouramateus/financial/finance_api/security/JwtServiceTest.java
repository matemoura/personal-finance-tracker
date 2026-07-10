package com.mouramateus.financial.finance_api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET = "***REMOVED-JWT-SECRET***=";

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET);
    }

    @Test
    void generateToken_thenExtractSubject_roundTripsSubject() {
        String token = jwtService.generateToken("user@test.com");

        assertThat(jwtService.extractSubject(token)).isEqualTo("user@test.com");
    }

    @Test
    void isTokenValid_returnsTrueForTokenSignedWithSameKey() {
        String token = jwtService.generateToken("user@test.com");

        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    void isTokenValid_returnsFalseForTokenSignedWithDifferentKey() {
        JwtService otherJwtService = new JwtService("fKwy6CCTY4mUrJ7UnsoAQXUJJbnm+MxMNVfYIFbDTnY=");
        String token = otherJwtService.generateToken("user@test.com");

        assertThat(jwtService.isTokenValid(token)).isFalse();
    }

    @Test
    void isTokenValid_returnsFalseForGarbageToken() {
        assertThat(jwtService.isTokenValid("not-a-real-token")).isFalse();
    }
}
