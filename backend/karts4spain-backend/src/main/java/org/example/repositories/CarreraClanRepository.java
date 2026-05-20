package org.example.repositories;

import org.example.entities.CarreraClan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CarreraClanRepository extends JpaRepository<CarreraClan, Long> {
    List<CarreraClan> findByIdEscuderiaOrderByFechaHoraAsc(Long idEscuderia);
    List<CarreraClan> findByPistaIgnoreCaseAndFechaHoraGreaterThanEqualOrderByFechaHoraAsc(
            String pista, LocalDateTime fechaHora);
}
