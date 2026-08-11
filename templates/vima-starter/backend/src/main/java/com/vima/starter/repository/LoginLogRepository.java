package com.vima.starter.repository;

import com.vima.starter.entity.LoginLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {
    Page<LoginLog> findAllByOrderByLoginTimeDesc(Pageable pageable);
}
