package org.example.repositories;

import org.example.entities.Escuderia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EscuderiaRepository extends JpaRepository<Escuderia, Long> {
    List<Escuderia> findByComunidadAutonomaOrderByNombreAsc(String comunidadAutonoma);
}
