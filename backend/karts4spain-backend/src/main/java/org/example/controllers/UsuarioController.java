package org.example.controllers;

import org.example.entities.Usuario;
import org.example.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:4200")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    @Lazy
    private LogroController logroController;

    // IDs de logros sociales/cuenta
    private static final int LOGRO_PILOTO_NOVEL = 14;
    private static final int LOGRO_EN_EQUIPO    = 17;

    // ── GET todos ────────────────────────────────────────────────────────────────
    @GetMapping
    public List<Usuario> obtenerTodos() {
        return usuarioRepository.findAll();
    }

    // ── POST batch — obtener varios usuarios por sus IDs ──────────────────────────
    @PostMapping("/batch")
    public List<Usuario> getBatch(@RequestBody List<Long> ids) {
        return usuarioRepository.findAllById(ids);
    }

    // ── GET por ID ───────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Usuario> obtenerPorId(@PathVariable Long id) {
        return usuarioRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET por username ──────────────────────────────────────────────────────────
    @GetMapping("/username/{username}")
    public ResponseEntity<Usuario> obtenerPorUsername(@PathVariable String username) {
        return usuarioRepository.findByUsernameIgnoreCase(username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET por email ─────────────────────────────────────────────────────────────
    @GetMapping("/email/{email}")
    public ResponseEntity<Usuario> obtenerPorEmail(@PathVariable String email) {
        return usuarioRepository.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── LOGIN ─────────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciales) {
        String email    = credenciales.get("email");
        String password = credenciales.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email y contraseña requeridos"));
        }

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
        if (usuarioOpt.isEmpty() || !password.equals(usuarioOpt.get().getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Credenciales incorrectas"));
        }

        return ResponseEntity.ok(usuarioOpt.get());
    }

    // ── REGISTRAR ─────────────────────────────────────────────────────────────────
    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(@RequestBody Usuario datos) {
        if (usuarioRepository.findByEmail(datos.getEmail()).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "El email ya está registrado"));
        }
        if (usuarioRepository.findByUsernameIgnoreCase(datos.getUsername()).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "El nombre de piloto ya está en uso"));
        }
        datos.setDiaCreacion(LocalDate.now());
        Usuario guardado = usuarioRepository.save(datos);
        // Logro "Piloto Novel" — primer registro en la plataforma
        logroController.asignarSiNotieneLogro(Math.toIntExact(guardado.getId_usuario()), LOGRO_PILOTO_NOVEL);
        return ResponseEntity.ok(guardado);
    }

    // ── ACTUALIZAR ────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<Usuario> actualizarUsuario(
            @PathVariable Long id,
            @RequestBody Usuario datos) {

        Optional<Usuario> optional = usuarioRepository.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();

        Usuario usuario = optional.get();
        if (datos.getComunidadAutonoma() != null) usuario.setComunidadAutonoma(datos.getComunidadAutonoma());
        if (datos.getFotoPerfil() != null)        usuario.setFotoPerfil(datos.getFotoPerfil());
        if (datos.getPassword() != null)          usuario.setPassword(datos.getPassword());

        return ResponseEntity.ok(usuarioRepository.save(usuario));
    }

    // ── UNIRSE A ESCUDERÍA ────────────────────────────────────────────────────────
    @PutMapping("/{id}/escuderia/{idEscuderia}")
    public ResponseEntity<Map<String, String>> unirseEscuderia(
            @PathVariable Long id,
            @PathVariable Long idEscuderia) {

        Optional<Usuario> optional = usuarioRepository.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();

        Usuario usuario = optional.get();
        usuario.setId_escuderia(idEscuderia);
        usuarioRepository.save(usuario);
        // Logro "En Equipo" — unirse a una escudería
        logroController.asignarSiNotieneLogro(Math.toIntExact(id), LOGRO_EN_EQUIPO);
        return ResponseEntity.ok(Map.of("message", "Unido a la escudería"));
    }

    // ── ABANDONAR ESCUDERÍA ───────────────────────────────────────────────────────
    @PutMapping("/{id}/abandonar-escuderia")
    public ResponseEntity<Map<String, String>> abandonarEscuderia(@PathVariable Long id) {
        Optional<Usuario> optional = usuarioRepository.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();

        Usuario usuario = optional.get();
        usuario.setId_escuderia(null);
        usuarioRepository.save(usuario);
        return ResponseEntity.ok(Map.of("message", "Escudería abandonada"));
    }
}
