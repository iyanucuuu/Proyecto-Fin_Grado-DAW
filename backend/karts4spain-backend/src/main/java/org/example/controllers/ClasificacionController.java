package org.example.controllers;

import org.example.entities.ClasificacionGeneral;
import org.example.entities.ResultadoCarrera;
import org.example.repositories.ClasificacionGeneralRepository;
import org.example.repositories.ResultadoCarreraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clasificacion")
@CrossOrigin(origins = "http://localhost:4200")
public class ClasificacionController {

    @Autowired
    private ClasificacionGeneralRepository repo;

    @Autowired
    private ResultadoCarreraRepository resultadoRepo;

    /** GET /api/clasificacion — ranking completo ordenado por posicion_actual */
    @GetMapping
    public List<ClasificacionGeneral> getRanking() {
        return repo.findAll()
                .stream()
                .sorted((a, b) -> {
                    int pa = a.getPosicionActual() == null ? Integer.MAX_VALUE : a.getPosicionActual();
                    int pb = b.getPosicionActual() == null ? Integer.MAX_VALUE : b.getPosicionActual();
                    return Integer.compare(pa, pb);
                })
                .toList();
    }

    /** GET /api/clasificacion/{idUsuario} — stats de un piloto concreto */
    @GetMapping("/{idUsuario}")
    public ResponseEntity<ClasificacionGeneral> getByUsuario(@PathVariable Long idUsuario) {
        return repo.findByIdUsuario(idUsuario)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/clasificacion/historial/{username} — últimas 30 carreras de un piloto */
    @GetMapping("/historial/{username}")
    public List<ResultadoCarrera> getHistorial(@PathVariable String username) {
        List<ResultadoCarrera> todos = resultadoRepo.findByUsernameIgnoreCaseOrderByCreatedAtDesc(username);
        return todos.stream().limit(30).toList();
    }
}
