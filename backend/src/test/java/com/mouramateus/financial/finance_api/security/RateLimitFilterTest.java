package com.mouramateus.financial.finance_api.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class RateLimitFilterTest {

    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
    }

    private MockHttpServletRequest sensitiveRequest(String ip) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(ip);
        return request;
    }

    @Test
    void nonSensitiveEndpoint_isNeverThrottled() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/transactions");
        request.setRemoteAddr("1.1.1.1");

        for (int i = 0; i < 20; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, chain);
            assertThat(response.getStatus()).isNotEqualTo(429);
        }
        verify(chain, times(20)).doFilter(any(), any());
    }

    @Test
    void sensitiveEndpoint_allowsUpToTenRequestsPerMinutePerIp() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(sensitiveRequest("2.2.2.2"), response, chain);
            assertThat(response.getStatus()).isNotEqualTo(429);
        }
        verify(chain, times(10)).doFilter(any(), any());
    }

    @Test
    void sensitiveEndpoint_blocksTheEleventhRequestWithinTheWindow() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse lastResponse = null;

        for (int i = 0; i < 11; i++) {
            lastResponse = new MockHttpServletResponse();
            filter.doFilter(sensitiveRequest("3.3.3.3"), lastResponse, chain);
        }

        assertThat(lastResponse.getStatus()).isEqualTo(429);
        assertThat(lastResponse.getContentAsString()).contains("Muitas tentativas");
        verify(chain, times(10)).doFilter(any(), any());
    }

    @Test
    void differentIps_areThrottledIndependently() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 10; i++) {
            filter.doFilter(sensitiveRequest("4.4.4.4"), new MockHttpServletResponse(), chain);
        }

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(sensitiveRequest("5.5.5.5"), response, chain);

        assertThat(response.getStatus()).isNotEqualTo(429);
    }

    @Test
    void trustsOnlyTheLastXForwardedForEntry_soASpoofedFirstValueDoesNotBypassTheLimit() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse lastResponse = null;

        for (int i = 0; i < 11; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            // O atacante varia a parte que ele controla (a esquerda) a cada
            // tentativa; o proxy confiável sempre acrescenta o mesmo IP real
            // como o ÚLTIMO valor da lista.
            request.addHeader("X-Forwarded-For", "9.9.9." + i + ", 6.6.6.6");
            lastResponse = new MockHttpServletResponse();
            filter.doFilter(request, lastResponse, chain);
        }

        assertThat(lastResponse.getStatus()).isEqualTo(429);
    }

    @Test
    void aRealClientVariedByTheAttacker_wouldBypassIfTheFirstValueWereTrusted() throws Exception {
        // Mesmo teste do de cima, mas prova o contrário: variando o ÚLTIMO
        // valor (o que o proxy escreveria se o cliente real mudasse de IP),
        // cada requisição cai num balde diferente e nenhuma é bloqueada.
        FilterChain chain = mock(FilterChain.class);

        for (int i = 0; i < 11; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.addHeader("X-Forwarded-For", "9.9.9.9, 6.6.6." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, chain);
            assertThat(response.getStatus()).isNotEqualTo(429);
        }
    }

    @Test
    void withoutXForwardedFor_fallsBackToRemoteAddr() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse lastResponse = null;

        for (int i = 0; i < 11; i++) {
            lastResponse = new MockHttpServletResponse();
            filter.doFilter(sensitiveRequest("7.7.7.7"), lastResponse, chain);
        }

        assertThat(lastResponse.getStatus()).isEqualTo(429);
    }
}
