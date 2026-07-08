package com.mouramateus.financial.finance_api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class SupabaseStorageService {

    private final RestTemplate restTemplate;

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${supabase.storage-bucket}")
    private String bucket;

    public SupabaseStorageService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String uploadFile(MultipartFile file, String fileName) throws IOException {
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucket + "/" + fileName;

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        headers.set("x-upsert", "true");
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        headers.setContentType(MediaType.parseMediaType(contentType));

        HttpEntity<byte[]> request = new HttpEntity<>(file.getBytes(), headers);
        restTemplate.exchange(uploadUrl, HttpMethod.PUT, request, String.class);

        return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + fileName;
    }
}
