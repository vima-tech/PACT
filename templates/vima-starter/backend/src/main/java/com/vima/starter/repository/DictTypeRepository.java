package com.vima.starter.repository;

import com.vima.starter.entity.DictType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DictTypeRepository extends JpaRepository<DictType, Long> {
    Optional<DictType> findByDictCode(String dictCode);
    boolean existsByDictCode(String dictCode);
}
