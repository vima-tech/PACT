package com.vima.starter.controller;

import com.vima.starter.dto.ApiResponse;
import com.vima.starter.dto.PageResponse;
import com.vima.starter.dto.UserDTO;
import com.vima.starter.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/system/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping("/list")
    public ApiResponse<PageResponse<UserDTO>> list(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String realName,
            @RequestParam(required = false) Long deptId,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "10") int pageSize) {
        PageResponse<UserDTO> page = userService.listUsers(username, realName, deptId, pageNum, pageSize);
        return ApiResponse.success(page);
    }

    @GetMapping("/{id}")
    public ApiResponse<UserDTO> getById(@PathVariable Long id) {
        return ApiResponse.success(userService.getUser(id));
    }

    @PostMapping
    public ApiResponse<UserDTO> create(@RequestBody UserDTO dto) {
        try {
            return ApiResponse.success(userService.createUser(dto));
        } catch (Exception e) {
            return ApiResponse.error(e.getMessage());
        }
    }

    @PutMapping
    public ApiResponse<UserDTO> update(@RequestBody UserDTO dto) {
        return ApiResponse.success(userService.updateUser(dto));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        userService.deleteUser(id);
        return ApiResponse.success();
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@RequestBody Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("userId").toString());
        String newPassword = params.get("newPassword").toString();
        userService.resetPassword(userId, newPassword);
        return ApiResponse.success();
    }
}
