package com.vima.starter.security;

import com.vima.starter.utils.RedisUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    @Value("${jwt.secret:vima-starter-secret-key-must-be-at-least-256-bits-long!!}")
    private String secret;

    @Value("${jwt.expiration:86400000}")
    private long expiration;

    private final RedisUtil redisUtil;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username) {
        String token = UUID.randomUUID().toString().replace("-", "");
        redisUtil.saveToken(token, username, expiration);
        return token;
    }

    public String getUsernameFromToken(String token) {
        return redisUtil.getUsernameByToken(token);
    }

    public boolean validateToken(String token) {
        return redisUtil.getUsernameByToken(token) != null;
    }

    public void removeToken(String token) {
        redisUtil.removeToken(token);
    }

    public void removeTokenByUsername(String username) {
        redisUtil.removeTokenByUsername(username);
    }
}
