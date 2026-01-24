package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.AuthResponse;
import com.mouramateus.financial.finance_api.dto.LoginRequest;
import com.mouramateus.financial.finance_api.dto.RegisterRequest;
import com.mouramateus.financial.finance_api.service.AuthService;
import com.mouramateus.financial.finance_api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@RequestBody @Valid RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody @Valid LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        userService.forgotPassword(email);
        return ResponseEntity.ok("Email de recuperação enviado.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestParam String token, @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        userService.resetPassword(token, newPassword);
        return ResponseEntity.ok("Senha redefinida com sucesso.");
    }
}
