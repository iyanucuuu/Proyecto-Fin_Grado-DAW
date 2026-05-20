package org.example.repositories;

import org.example.entities.MensajeChatClan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MensajeChatClanRepository extends JpaRepository<MensajeChatClan, Long> {
    List<MensajeChatClan> findByIdEscuderiaOrderByCreatedAtAsc(Long idEscuderia);
    void deleteByIdCarreraAndIdEscuderia(Long idCarrera, Long idEscuderia);
}
