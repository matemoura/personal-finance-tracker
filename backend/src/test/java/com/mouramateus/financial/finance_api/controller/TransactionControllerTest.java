package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.security.CustomUserDetailsService;
import com.mouramateus.financial.finance_api.security.JwtAuthenticationFilter;
import com.mouramateus.financial.finance_api.security.JwtService;
import com.mouramateus.financial.finance_api.security.SecurityConfig;
import com.mouramateus.financial.finance_api.service.TransactionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TransactionController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.cors-allowed-origins=http://localhost:5500"
})
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TransactionService transactionService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void listByMonth_withoutToken_isRejected() throws Exception {
        mockMvc.perform(get("/api/transactions").param("year", "2026").param("month", "7"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void listByMonth_withValidToken_returns200() throws Exception {
        String token = "valid-token";
        UserDetails userDetails = User.withUsername("owner@test.com").password("x").authorities("USER").build();

        when(jwtService.extractSubject(token)).thenReturn("owner@test.com");
        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(customUserDetailsService.loadUserByUsername("owner@test.com")).thenReturn(userDetails);
        when(transactionService.listByMonth(2026, 7, null, null)).thenReturn(List.of());

        mockMvc.perform(get("/api/transactions")
                        .param("year", "2026")
                        .param("month", "7")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}
