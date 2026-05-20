package org.example.controllers;

import org.example.entities.CarreraPista;
import org.example.entities.InscripcionCarreraPista;
import org.example.repositories.CarreraPistaRepository;
import org.example.repositories.InscripcionCarreraPistaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/carreras-pista")
@CrossOrigin(origins = "http://localhost:4200")
public class CarreraPistaController {

    @Autowired private CarreraPistaRepository carreraRepo;
    @Autowired private InscripcionCarreraPistaRepository inscripcionRepo;

    /** GET /api/carreras-pista/{idPista} — carreras abiertas de una pista */
    @GetMapping("/{idPista}")
    public List<CarreraPista> getCarreras(@PathVariable Integer idPista) {
        return carreraRepo.findByIdPistaOrderByFechaHoraAsc(idPista);
    }

    /** GET /api/carreras-pista/{idCarrera}/inscritos */
    @GetMapping("/{idCarrera}/inscritos")
    public List<InscripcionCarreraPista> getInscritos(@PathVariable Long idCarrera) {
        return inscripcionRepo.findByIdCarrera(idCarrera);
    }

    /** GET /api/carreras-pista/inscritos/lote — inscritos de varias carreras a la vez */
    @PostMapping("/inscritos/lote")
    public List<InscripcionCarreraPista> getInscritosLote(@RequestBody List<Long> ids) {
        return inscripcionRepo.findByIdCarreraIn(ids);
    }

    /** POST /api/carreras-pista — crear carrera abierta */
    @PostMapping
    public ResponseEntity<CarreraPista> crearCarrera(@RequestBody CarreraPista carrera) {
        if (carrera.getCreatedAt() == null) carrera.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(carreraRepo.save(carrera));
    }

    /** POST /api/carreras-pista/{idCarrera}/inscribirse */
    @PostMapping("/{idCarrera}/inscribirse")
    public ResponseEntity<?> inscribirse(
            @PathVariable Long idCarrera,
            @RequestBody Map<String, Object> body) {

        Long idUsuario = body.get("id_usuario") instanceof Number n ? n.longValue() : null;
        if (idUsuario == null) return ResponseEntity.badRequest().body("id_usuario requerido");

        if (inscripcionRepo.existsByIdCarreraAndIdUsuario(idCarrera, idUsuario))
            return ResponseEntity.ok(Map.of("msg", "Ya inscrito"));

        InscripcionCarreraPista ins = new InscripcionCarreraPista();
        ins.setIdCarrera(idCarrera);
        ins.setIdUsuario(idUsuario);
        ins.setUsername((String) body.get("username"));
        ins.setFotoPerfil((String) body.getOrDefault("foto_perfil", null));
        return ResponseEntity.ok(inscripcionRepo.save(ins));
    }

    /** DELETE /api/carreras-pista/{idCarrera}/inscribirse/{idUsuario} */
    @Transactional
    @DeleteMapping("/{idCarrera}/inscribirse/{idUsuario}")
    public ResponseEntity<Map<String, String>> desinscribirse(
            @PathVariable Long idCarrera, @PathVariable Long idUsuario) {
        inscripcionRepo.deleteByIdCarreraAndIdUsuario(idCarrera, idUsuario);
        return ResponseEntity.ok(Map.of("message", "Desinscrito"));
    }

    /** DELETE /api/carreras-pista/{id} — eliminar carrera (y sus inscripciones) */
    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminarCarrera(@PathVariable Long id) {
        if (!carreraRepo.existsById(id)) return ResponseEntity.notFound().build();
        inscripcionRepo.deleteByIdCarrera(id);
        carreraRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Carrera eliminada"));
    }
}
