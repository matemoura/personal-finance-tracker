package com.mouramateus.financial.finance_api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mouramateus.financial.finance_api.dto.AuthResponse;
import com.mouramateus.financial.finance_api.dto.LoginRequest;
import com.mouramateus.financial.finance_api.dto.RegisterRequest;
import com.mouramateus.financial.finance_api.security.CustomUserDetailsService;
import com.mouramateus.financial.finance_api.security.JwtAuthenticationFilter;
import com.mouramateus.financial.finance_api.security.JwtService;
import com.mouramateus.financial.finance_api.security.SecurityConfig;
import com.mouramateus.financial.finance_api.service.AuthService;
import com.mouramateus.financial.finance_api.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.cors-allowed-origins=http://localhost:5500"
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserService userService;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void register_withValidBody_returns201() throws Exception {
        RegisterRequest request = new RegisterRequest("Jane Doe", "jane@test.com", "Sup3r$ecret", null);
        when(authService.register(request)).thenReturn(new AuthResponse("jwt-token", "Jane Doe", null));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    void login_withValidBody_returns200() throws Exception {
        LoginRequest request = new LoginRequest("jane@test.com", "Sup3r$ecret");
        when(authService.login(request)).thenReturn(new AuthResponse("jwt-token", "Jane Doe", null));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
