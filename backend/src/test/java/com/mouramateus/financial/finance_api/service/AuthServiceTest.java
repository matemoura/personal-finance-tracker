package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.AuthResponse;
import com.mouramateus.financial.finance_api.dto.LoginRequest;
import com.mouramateus.financial.finance_api.dto.RegisterRequest;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    private static final String EMAIL = "user@test.com";
    private static final String RAW_PASSWORD = "Sup3r$ecret";
    private static final String ENCODED_PASSWORD = "encoded-password";

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void register_withNewEmail_savesUserAndReturnsToken() {
        RegisterRequest request = new RegisterRequest("Jane Doe", EMAIL, RAW_PASSWORD, null);

        when(userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
        when(jwtService.generateToken(EMAIL)).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.name()).isEqualTo("Jane Doe");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getEmail()).isEqualTo(EMAIL);
        assertThat(userCaptor.getValue().getPassword()).isEqualTo(ENCODED_PASSWORD);
    }

    @Test
    void register_withExistingEmail_throwsBadRequest() {
        RegisterRequest request = new RegisterRequest("Jane Doe", EMAIL, RAW_PASSWORD, null);
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Email already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_withCorrectPassword_returnsToken() {
        User user = User.builder().email(EMAIL).name("Jane Doe").password(ENCODED_PASSWORD).build();
        LoginRequest request = new LoginRequest(EMAIL, RAW_PASSWORD);

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
        when(jwtService.generateToken(EMAIL)).thenReturn("jwt-token");

        AuthResponse response = authService.login(request);

        assertThat(response.token()).isEqualTo("jwt-token");
    }

    @Test
    void login_withWrongPassword_throws() {
        User user = User.builder().email(EMAIL).name("Jane Doe").password(ENCODED_PASSWORD).build();
        LoginRequest request = new LoginRequest(EMAIL, "wrong-password");

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", ENCODED_PASSWORD)).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void login_withUnknownEmail_throws() {
        LoginRequest request = new LoginRequest(EMAIL, RAW_PASSWORD);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Invalid credentials");
    }
}
