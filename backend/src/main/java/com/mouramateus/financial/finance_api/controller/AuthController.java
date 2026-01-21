package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.AuthResponse;
import com.mouramateus.financial.finance_api.dto.LoginRequest;
import com.mouramateus.financial.finance_api.dto.RegisterRequest;
import com.mouramateus.financial.finance_api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@RequestBody @Valid RegisterRequest request) {
        authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody @Valid LoginRequest request) {
        return authService.login(request);
    }
}
