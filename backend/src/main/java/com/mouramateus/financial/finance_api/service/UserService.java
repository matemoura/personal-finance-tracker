package com.mouramateus.financial.finance_api.service;

import com.mouramateus.financial.finance_api.dto.UserCreateRequest;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User create(UserCreateRequest dto) {

        if(userRepository.existsByEmail(dto.email())) {
            throw new RuntimeException("Email already exists");
        }

        User user = User.builder()
                .name(dto.name())
                .email(dto.email())
                .password(passwordEncoder.encode(dto.password()))
                .build();

        return userRepository.save(user);
    }
}
