package org.example.repositories;

import org.example.entities.GrupoSocial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GrupoSocialRepository extends JpaRepository<GrupoSocial, Long> {
    List<GrupoSocial> findByIdIn(List<Long> ids);
}
