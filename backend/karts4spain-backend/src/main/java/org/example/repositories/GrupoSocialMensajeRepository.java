package org.example.repositories;

import org.example.entities.GrupoSocialMensaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GrupoSocialMensajeRepository extends JpaRepository<GrupoSocialMensaje, Long> {
    List<GrupoSocialMensaje> findByIdGrupoOrderByCreatedAtAsc(Long idGrupo);
}
