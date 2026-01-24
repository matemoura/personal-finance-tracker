package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.AuthResponse;
import com.mouramateus.financial.finance_api.dto.ChangePasswordRequest;
import com.mouramateus.financial.finance_api.dto.RegisterRequest;
import com.mouramateus.financial.finance_api.entity.User;
import com.mouramateus.financial.finance_api.repository.UserRepository;
import com.mouramateus.financial.finance_api.security.JwtService;
import com.mouramateus.financial.finance_api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import static java.util.Objects.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @PostMapping
    public ResponseEntity<AuthResponse> create(@RequestBody @Valid RegisterRequest request) {
        User newUser = userService.create(request);

        String token = jwtService.generateToken(newUser);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(token, newUser.getName(), newUser.getPhotoUrl()));
    }

    @PostMapping("/upload-photo")
    public ResponseEntity<String> uploadPhoto(@RequestParam("file") MultipartFile file, Authentication authentication) {
        try {
            String email = authentication.getName();

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

            String uploadDir = "uploads/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileName = user.getId() + "_" + StringUtils.cleanPath(requireNonNull(file.getOriginalFilename()));
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "http://localhost:8080/uploads/" + fileName;
            user.setPhotoUrl(fileUrl);
            userRepository.save(user);

            return ResponseEntity.ok(fileUrl);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro ao salvar foto: " + e.getMessage());
        }
    }

    @PatchMapping("/change-password")
    public ResponseEntity<Void> changePassword(@RequestBody @Valid ChangePasswordRequest request, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        userService.changePassword(user.getId(), request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/photo")
    public ResponseEntity<Void> removePhoto(Authentication authentication) {
        String email = authentication.getName();
        userService.removePhoto(email);
        return ResponseEntity.ok().build();
    }
}
