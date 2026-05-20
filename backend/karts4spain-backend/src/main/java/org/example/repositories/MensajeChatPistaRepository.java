package org.example.repositories;

import org.example.entities.MensajeChatPista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MensajeChatPistaRepository extends JpaRepository<MensajeChatPista, Long> {
    List<MensajeChatPista> findByIdPistaOrderByCreatedAtAsc(Integer idPista);

    /** Conteo de mensajes por pista desde una fecha dada (para "actividad reciente") */
    @Query("SELECT m.idPista, COUNT(m) FROM MensajeChatPista m WHERE m.createdAt >= :desde GROUP BY m.idPista")
    List<Object[]> countPorPistaDesde(@Param("desde") LocalDateTime desde);
}
