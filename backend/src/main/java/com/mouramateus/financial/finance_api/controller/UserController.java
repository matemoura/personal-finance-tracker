package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.UserCreateRequest;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User create(@RequestBody @Valid UserCreateRequest request) {
        return userService.create(request);
    }
}
