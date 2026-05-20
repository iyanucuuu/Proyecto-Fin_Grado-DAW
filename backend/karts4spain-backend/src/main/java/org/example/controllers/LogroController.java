package org.example.controllers;

import org.example.entities.Logro;
import org.example.entities.UsuarioLogro;
import org.example.repositories.LogroRepository;
import org.example.repositories.UsuarioLogroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/logros")
@CrossOrigin(origins = "http://localhost:4200")
public class LogroController {

    @Autowired
    private LogroRepository logroRepository;

    @Autowired
    private UsuarioLogroRepository usuarioLogroRepository;

    /**
     * Devuelve TODOS los logros disponibles en la plataforma.
     * GET /api/logros
     */
    @GetMapping
    public List<Logro> obtenerTodos() {
        return logroRepository.findAll();
    }

    /**
     * Devuelve los logros desbloqueados por un usuario.
     * GET /api/logros/usuario/{idUsuario}
     */
    @GetMapping("/usuario/{idUsuario}")
    public List<UsuarioLogro> obtenerLogrosDeUsuario(@PathVariable Integer idUsuario) {
        return usuarioLogroRepository.findByIdUsuario(idUsuario);
    }

    /**
     * Asigna un logro a un usuario si aún no lo tiene.
     * Llamado desde otros controllers cuando el usuario cumple un requisito.
     * POST /api/logros/asignar   body: { "idUsuario": 1, "idLogro": 14 }
     */
    @PostMapping("/asignar")
    public ResponseEntity<?> asignarLogro(@RequestBody java.util.Map<String, Integer> body) {
        Integer idUsuario = body.get("idUsuario");
        Integer idLogro   = body.get("idLogro");
        if (idUsuario == null || idLogro == null)
            return ResponseEntity.badRequest().body("idUsuario e idLogro son obligatorios");

        // Idempotente: no asignamos el mismo logro dos veces
        if (usuarioLogroRepository.existsByIdUsuarioAndLogroIdLogro(idUsuario, idLogro))
            return ResponseEntity.ok().body("Ya tenía el logro");

        Optional<Logro> logroOpt = logroRepository.findById(idLogro);
        if (logroOpt.isEmpty())
            return ResponseEntity.notFound().build();

        UsuarioLogro ul = new UsuarioLogro();
        ul.setIdUsuario(idUsuario);
        ul.setLogro(logroOpt.get());
        ul.setFechaObtencion(LocalDateTime.now());
        return ResponseEntity.ok(usuarioLogroRepository.save(ul));
    }

    // ─── Método de utilidad llamado internamente por otros controllers ────────

    /**
     * Asigna el logro indicado al usuario si no lo tiene ya. No lanza excepción.
     */
    public void asignarSiNotieneLogro(Integer idUsuario, Integer idLogro) {
        try {
            if (usuarioLogroRepository.existsByIdUsuarioAndLogroIdLogro(idUsuario, idLogro)) return;
            Optional<Logro> logroOpt = logroRepository.findById(idLogro);
            if (logroOpt.isEmpty()) return;
            UsuarioLogro ul = new UsuarioLogro();
            ul.setIdUsuario(idUsuario);
            ul.setLogro(logroOpt.get());
            ul.setFechaObtencion(LocalDateTime.now());
            usuarioLogroRepository.save(ul);
        } catch (Exception ignored) {}
    }
}
