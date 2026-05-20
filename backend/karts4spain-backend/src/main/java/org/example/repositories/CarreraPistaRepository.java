package org.example.repositories;

import org.example.entities.CarreraPista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CarreraPistaRepository extends JpaRepository<CarreraPista, Long> {
    List<CarreraPista> findByIdPistaOrderByFechaHoraAsc(Integer idPista);
}
