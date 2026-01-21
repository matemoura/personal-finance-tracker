package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.CategoryCreateRequest;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Category create(@RequestBody @Valid CategoryCreateRequest request) {
        return categoryService.create(request);
    }
}
