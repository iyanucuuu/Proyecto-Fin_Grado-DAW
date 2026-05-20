package org.example.repositories;

import org.example.entities.GrupoSocialMiembro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GrupoSocialMiembroRepository extends JpaRepository<GrupoSocialMiembro, Long> {
    List<GrupoSocialMiembro> findByIdUsuario(Long idUsuario);
    List<GrupoSocialMiembro> findByIdGrupo(Long idGrupo);
    boolean existsByIdGrupoAndIdUsuario(Long idGrupo, Long idUsuario);
    @Modifying
    void deleteByIdGrupoAndIdUsuario(Long idGrupo, Long idUsuario);
}
