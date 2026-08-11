package com.vima.starter.controller;

import com.vima.starter.dto.ApiResponse;
import com.vima.starter.dto.PageResponse;
import com.vima.starter.entity.LoginLog;
import com.vima.starter.entity.OperLog;
import com.vima.starter.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system/log")
@RequiredArgsConstructor
public class LogController {
    private final LogService logService;

    @GetMapping("/oper/list")
    public ApiResponse<PageResponse<OperLog>> listOperLogs(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ApiResponse.success(logService.listOperLogs(pageNum, pageSize));
    }

    @DeleteMapping("/oper/clear")
    public ApiResponse<Void> clearOperLogs() {
        logService.clearOperLogs();
        return ApiResponse.success();
    }

    @GetMapping("/login/list")
    public ApiResponse<PageResponse<LoginLog>> listLoginLogs(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        return ApiResponse.success(logService.listLoginLogs(pageNum, pageSize));
    }

    @DeleteMapping("/login/clear")
    public ApiResponse<Void> clearLoginLogs() {
        logService.clearLoginLogs();
        return ApiResponse.success();
    }
}
