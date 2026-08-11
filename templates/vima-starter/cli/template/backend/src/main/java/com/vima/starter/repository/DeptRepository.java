package com.vima.starter.repository;

import com.vima.starter.entity.Dept;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DeptRepository extends JpaRepository<Dept, Long> {
    List<Dept> findByParentIdOrderBySort(Long parentId);
    
    List<Dept> findByStatusOrderBySort(Integer status);
}
