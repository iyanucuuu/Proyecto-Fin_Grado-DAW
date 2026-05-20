package org.example.controllers;

import org.example.entities.CarreraClan;
import org.example.entities.InscripcionCarrera;
import org.example.entities.MensajeChatClan;
import org.example.repositories.CarreraClanRepository;
import org.example.repositories.InscripcionCarreraRepository;
import org.example.repositories.MensajeChatClanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/carreras-clan")
@CrossOrigin(origins = "http://localhost:4200")
public class CarreraClanController {

    @Autowired private CarreraClanRepository carreraRepo;
    @Autowired private InscripcionCarreraRepository inscripcionRepo;
    @Autowired private MensajeChatClanRepository chatRepo;

    // ── GET carreras de una escudería ────────────────────────────────────────
    @GetMapping("/escuderia/{idEscuderia}")
    public List<CarreraClan> getCarrerasDeEscuderia(@PathVariable Long idEscuderia) {
        return carreraRepo.findByIdEscuderiaOrderByFechaHoraAsc(idEscuderia);
    }

    // ── GET carreras de clan programadas en una pista concreta ───────────────
    @GetMapping("/pista")
    public List<CarreraClan> getCarrerasPorPista(@RequestParam String nombre) {
        return carreraRepo.findByPistaIgnoreCaseAndFechaHoraGreaterThanEqualOrderByFechaHoraAsc(
                nombre, LocalDateTime.now());
    }

    // ── GET inscritos de una carrera ─────────────────────────────────────────
    @GetMapping("/{idCarrera}/inscritos")
    public List<InscripcionCarrera> getInscritos(@PathVariable Long idCarrera) {
        return inscripcionRepo.findByIdCarrera(idCarrera);
    }

    // ── POST crear carrera ───────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<CarreraClan> crearCarrera(@RequestBody CarreraClan carrera) {
        if (carrera.getCreatedAt() == null) carrera.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(carreraRepo.save(carrera));
    }

    // ── POST inscribirse ─────────────────────────────────────────────────────
    @PostMapping("/{idCarrera}/inscribirse")
    public ResponseEntity<?> inscribirse(
            @PathVariable Long idCarrera,
            @RequestBody Map<String, Object> body) {

        Long idUsuario = body.get("id_usuario") instanceof Number n ? n.longValue() : null;
        if (idUsuario == null) return ResponseEntity.badRequest().body("id_usuario requerido");

        // Verificar que la carrera no ha pasado
        Optional<CarreraClan> carreraOpt = carreraRepo.findById(idCarrera);
        if (carreraOpt.isEmpty()) return ResponseEntity.notFound().build();
        if (carreraOpt.get().getFechaHora().isBefore(LocalDateTime.now()))
            return ResponseEntity.badRequest().body(Map.of("error", "La carrera ya ha finalizado"));

        // Idempotente
        if (inscripcionRepo.findByIdCarreraAndIdUsuario(idCarrera, idUsuario).isPresent())
            return ResponseEntity.ok().body(Map.of("msg", "Ya inscrito"));

        InscripcionCarrera ins = new InscripcionCarrera();
        ins.setIdCarrera(idCarrera);
        ins.setIdUsuario(idUsuario);
        ins.setUsername((String) body.get("username"));
        ins.setFotoPerfil((String) body.getOrDefault("foto_perfil", null));
        return ResponseEntity.ok(inscripcionRepo.save(ins));
    }

    // ── DELETE desinscribirse ────────────────────────────────────────────────
    @Transactional
    @DeleteMapping("/{idCarrera}/inscribirse/{idUsuario}")
    public ResponseEntity<Map<String, String>> desinscribirse(
            @PathVariable Long idCarrera,
            @PathVariable Long idUsuario) {
        inscripcionRepo.deleteByIdCarreraAndIdUsuario(idCarrera, idUsuario);
        return ResponseEntity.ok(Map.of("message", "Desinscrito"));
    }

    // ── DELETE carrera (y mensajes de chat asociados) ────────────────────────
    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminarCarrera(@PathVariable Long id) {
        Optional<CarreraClan> opt = carreraRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        CarreraClan carrera = opt.get();
        // Eliminar inscripciones
        inscripcionRepo.deleteByIdCarrera(id);
        // Eliminar mensajes del chat que referencian esta carrera
        chatRepo.deleteByIdCarreraAndIdEscuderia(id, carrera.getIdEscuderia());
        // Eliminar la carrera
        carreraRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Carrera eliminada"));
    }
}
