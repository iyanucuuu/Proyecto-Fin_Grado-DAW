package org.example.repositories;

import org.example.entities.Pista;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PistaRepository extends JpaRepository<Pista, Integer> {
    List<Pista> findByCcaa(String ccaa);
    List<Pista> findByTipoKart(String tipoKart);
    List<Pista> findByCcaaAndTipoKart(String ccaa, String tipoKart);
    List<Pista> findByCcaaAndEntorno(String ccaa, String entorno);
    List<Pista> findByTipoKartAndEntorno(String tipoKart, String entorno);
    List<Pista> findByCcaaAndTipoKartAndEntorno(String ccaa, String tipoKart, String entorno);
    List<Pista> findByEntorno(String entorno);
}
