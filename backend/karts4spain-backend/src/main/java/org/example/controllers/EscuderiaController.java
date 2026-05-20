package org.example.controllers;

import org.example.entities.Escuderia;
import org.example.entities.Usuario;
import org.example.repositories.EscuderiaRepository;
import org.example.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/escuderias")
@CrossOrigin(origins = "http://localhost:4200")
public class EscuderiaController {

    @Autowired
    private EscuderiaRepository escuderiaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    @Lazy
    private LogroController logroController;

    private static final int LOGRO_FUNDADOR = 16;

    // ── GET todas ─────────────────────────────────────────────────────────────────
    @GetMapping({"/", "/todas"})
    public ResponseEntity<List<Escuderia>> obtenerTodas() {
        return ResponseEntity.ok(escuderiaRepository.findAll());
    }

    // ── GET con filtros opcionales ────────────────────────────────────────────────
    @GetMapping("/filtradas")
    public ResponseEntity<List<Escuderia>> obtenerFiltradas(
            @RequestParam(required = false) String comunidad) {

        List<Escuderia> resultado = (comunidad != null && !comunidad.isBlank())
                ? escuderiaRepository.findByComunidadAutonomaOrderByNombreAsc(comunidad)
                : escuderiaRepository.findAll();

        return ResponseEntity.ok(resultado);
    }

    // ── GET por ID ────────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Escuderia> obtenerPorId(@PathVariable Long id) {
        return escuderiaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET miembros de una escudería ─────────────────────────────────────────────
    @GetMapping("/{id}/miembros")
    public ResponseEntity<List<Usuario>> getMiembros(@PathVariable Long id) {
        List<Usuario> miembros = usuarioRepository.findByIdEscuderia(id);
        return ResponseEntity.ok(miembros);
    }

    // ── GET conteo de miembros ────────────────────────────────────────────────────
    @GetMapping("/{id}/miembros/count")
    public ResponseEntity<Map<String, Long>> countMiembros(@PathVariable Long id) {
        long count = usuarioRepository.countByIdEscuderia(id);
        return ResponseEntity.ok(Map.of("count", count));
    }

    // ── POST crear escudería ──────────────────────────────────────────────────────
    @PostMapping("/crear/{idLider}")
    public ResponseEntity<Escuderia> crearEscuderia(
            @RequestBody Escuderia escuderia,
            @PathVariable Long idLider) {

        Optional<Usuario> usuarioOpt = usuarioRepository.findById(idLider);
        if (usuarioOpt.isEmpty()) return ResponseEntity.badRequest().build();

        Usuario lider = usuarioOpt.get();
        escuderia.setLider(lider);

        Escuderia guardada = escuderiaRepository.save(escuderia);
        lider.setId_escuderia(guardada.getIdEscuderia());
        usuarioRepository.save(lider);

        // Logro "Fundador" — crear una escudería propia
        logroController.asignarSiNotieneLogro(Math.toIntExact(idLider), LOGRO_FUNDADOR);

        return ResponseEntity.ok(guardada);
    }

    // ── PUT actualizar escudería ──────────────────────────────────────────────────
    @PutMapping("/actualizar/{id}")
    public ResponseEntity<Escuderia> actualizarEscuderia(
            @PathVariable Long id,
            @RequestBody Escuderia datos) {

        Optional<Escuderia> optional = escuderiaRepository.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();

        Escuderia escuderia = optional.get();
        if (datos.getNombre() != null)            escuderia.setNombre(datos.getNombre());
        if (datos.getDescripcion() != null)       escuderia.setDescripcion(datos.getDescripcion());
        if (datos.getLogo_url() != null)          escuderia.setLogo_url(datos.getLogo_url());
        if (datos.getComunidadAutonoma() != null) escuderia.setComunidadAutonoma(datos.getComunidadAutonoma());
        if (datos.getMaxMiembros() != null)       escuderia.setMaxMiembros(datos.getMaxMiembros());

        return ResponseEntity.ok(escuderiaRepository.save(escuderia));
    }

    // ── DELETE eliminar escudería ─────────────────────────────────────────────────
    @DeleteMapping("/eliminar/{id}")
    public ResponseEntity<Map<String, String>> eliminarEscuderia(@PathVariable Long id) {
        if (!escuderiaRepository.existsById(id)) return ResponseEntity.notFound().build();
        escuderiaRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Escudería eliminada correctamente"));
    }
}
