package com.vima.starter.service;

import com.vima.starter.dto.PageResponse;
import com.vima.starter.dto.UserDTO;
import com.vima.starter.entity.Role;
import com.vima.starter.entity.User;
import com.vima.starter.repository.RoleRepository;
import com.vima.starter.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public PageResponse<UserDTO> listUsers(String username, String realName, Long deptId, int pageNum, int pageSize) {
        Specification<User> spec = Specification.where(null);

        if (username != null && !username.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(root.get("username"), "%" + username + "%"));
        }
        if (realName != null && !realName.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(root.get("realName"), "%" + realName + "%"));
        }
        if (deptId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("deptId"), deptId));
        }

        Page<User> page = userRepository.findAll(spec, PageRequest.of(pageNum - 1, pageSize, Sort.by("createTime").descending()));

        List<UserDTO> records = page.getContent().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return PageResponse.<UserDTO>builder()
                .records(records)
                .total(page.getTotalElements())
                .pageNum(pageNum)
                .pageSize(pageSize)
                .build();
    }

    public UserDTO getUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return toDTO(user);
    }

    public UserDTO createUser(UserDTO dto) {
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode("123456"));
        user.setRealName(dto.getRealName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setDeptId(dto.getDeptId());
        user.setStatus(dto.getStatus());

        if (dto.getRoleIds() != null && !dto.getRoleIds().isEmpty()) {
            List<Role> roles = roleRepository.findAllById(dto.getRoleIds());
            user.setRoles(new HashSet<>(roles));
        }

        return toDTO(userRepository.save(user));
    }

    public UserDTO updateUser(UserDTO dto) {
        User user = userRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        user.setRealName(dto.getRealName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setDeptId(dto.getDeptId());
        user.setStatus(dto.getStatus());

        if (dto.getRoleIds() != null) {
            List<Role> roles = roleRepository.findAllById(dto.getRoleIds());
            user.setRoles(new HashSet<>(roles));
        }

        return toDTO(userRepository.save(user));
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public void resetPassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private UserDTO toDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setRealName(user.getRealName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setDeptId(user.getDeptId());
        dto.setStatus(user.getStatus());
        dto.setCreateTime(user.getCreateTime());
        dto.setRoleIds(user.getRoles().stream().map(Role::getId).collect(Collectors.toSet()));
        return dto;
    }
}
