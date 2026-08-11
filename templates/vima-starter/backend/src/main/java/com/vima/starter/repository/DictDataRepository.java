package com.vima.starter.repository;

import com.vima.starter.entity.DictData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DictDataRepository extends JpaRepository<DictData, Long> {
    List<DictData> findByTypeIdAndStatusOrderBySort(Long typeId, Integer status);
    List<DictData> findByTypeIdOrderBySort(Long typeId);
}
