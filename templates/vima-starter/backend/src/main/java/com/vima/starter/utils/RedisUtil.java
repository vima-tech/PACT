package com.vima.starter.utils;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class RedisUtil {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String TOKEN_PREFIX = "token:";
    private static final String USER_TOKEN_PREFIX = "user:token:";

    public void set(String key, Object value, long timeout, TimeUnit unit) {
        redisTemplate.opsForValue().set(key, value, timeout, unit);
    }

    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }

    public Boolean expire(String key, long timeout, TimeUnit unit) {
        return redisTemplate.expire(key, timeout, unit);
    }

    public Boolean hasKey(String key) {
        return redisTemplate.hasKey(key);
    }

    public void saveToken(String token, String username, long timeout) {
        String tokenKey = TOKEN_PREFIX + token;
        String userTokenKey = USER_TOKEN_PREFIX + username;
        
        redisTemplate.opsForValue().set(tokenKey, username, timeout, TimeUnit.MILLISECONDS);
        redisTemplate.opsForValue().set(userTokenKey, token, timeout, TimeUnit.MILLISECONDS);
    }

    public String getUsernameByToken(String token) {
        Object username = redisTemplate.opsForValue().get(TOKEN_PREFIX + token);
        return username != null ? username.toString() : null;
    }

    public void removeToken(String token) {
        String username = getUsernameByToken(token);
        if (username != null) {
            redisTemplate.delete(USER_TOKEN_PREFIX + username);
        }
        redisTemplate.delete(TOKEN_PREFIX + token);
    }

    public void removeTokenByUsername(String username) {
        Object token = redisTemplate.opsForValue().get(USER_TOKEN_PREFIX + username);
        if (token != null) {
            redisTemplate.delete(TOKEN_PREFIX + token);
        }
        redisTemplate.delete(USER_TOKEN_PREFIX + username);
    }
}
