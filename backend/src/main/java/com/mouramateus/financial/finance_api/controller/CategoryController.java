package com.mouramateus.financial.finance_api.controller;

import com.mouramateus.financial.finance_api.dto.CategoryCreateRequest;
import com.mouramateus.financial.finance_api.dto.CategoryUpdateRequest;
import com.mouramateus.financial.finance_api.entity.Category;
import com.mouramateus.financial.finance_api.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    public List<Category> list() {
        return categoryService.listMyCategories();
    }

    @PutMapping("/{id}")
    public Category update(
            @PathVariable Long id,
            @RequestBody @Valid CategoryUpdateRequest request
    ) {
        return categoryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory (@PathVariable Long id) {
        categoryService.deleteCategory(id);
    }
}
