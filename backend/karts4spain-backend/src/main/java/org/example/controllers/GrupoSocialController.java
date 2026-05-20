package org.example.controllers;

import org.example.entities.GrupoSocial;
import org.example.entities.GrupoSocialMiembro;
import org.example.entities.GrupoSocialMensaje;
import org.example.repositories.GrupoSocialMensajeRepository;
import org.example.repositories.GrupoSocialMiembroRepository;
import org.example.repositories.GrupoSocialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/grupos")
@CrossOrigin(origins = "http://localhost:4200")
public class GrupoSocialController {

    @Autowired private GrupoSocialRepository grupoRepo;
    @Autowired private GrupoSocialMiembroRepository miembroRepo;
    @Autowired private GrupoSocialMensajeRepository mensajeRepo;

    // ── Grupos del usuario ────────────────────────────────────────────────────────

    /** GET /api/grupos/usuario/{idUsuario} — grupos a los que pertenece el usuario */
    @GetMapping("/usuario/{idUsuario}")
    public List<GrupoSocial> getGruposDelUsuario(@PathVariable Long idUsuario) {
        List<Long> ids = miembroRepo.findByIdUsuario(idUsuario)
                                    .stream().map(GrupoSocialMiembro::getIdGrupo).toList();
        if (ids.isEmpty()) return List.of();
        return grupoRepo.findByIdIn(ids);
    }

    // ── Crear grupo ───────────────────────────────────────────────────────────────

    /** POST /api/grupos — crear un grupo y añadir al creador como primer miembro */
    @PostMapping
    public ResponseEntity<GrupoSocial> crearGrupo(@RequestBody GrupoSocial grupo) {
        if (grupo.getCreatedAt() == null) grupo.setCreatedAt(LocalDateTime.now());
        GrupoSocial guardado = grupoRepo.save(grupo);
        // Añadir al creador como miembro automáticamente
        GrupoSocialMiembro miembro = new GrupoSocialMiembro();
        miembro.setIdGrupo(guardado.getId());
        miembro.setIdUsuario(guardado.getCreadoPor());
        miembroRepo.save(miembro);
        return ResponseEntity.ok(guardado);
    }

    // ── Miembros ──────────────────────────────────────────────────────────────────

    /** GET /api/grupos/{idGrupo}/miembros — IDs de miembros del grupo */
    @GetMapping("/{idGrupo}/miembros")
    public List<Long> getMiembros(@PathVariable Long idGrupo) {
        return miembroRepo.findByIdGrupo(idGrupo)
                          .stream().map(GrupoSocialMiembro::getIdUsuario).toList();
    }

    /** POST /api/grupos/{idGrupo}/miembros — añadir miembro */
    @PostMapping("/{idGrupo}/miembros")
    public ResponseEntity<?> anadirMiembro(
            @PathVariable Long idGrupo,
            @RequestBody Map<String, Long> body) {
        Long idUsuario = body.get("id_usuario");
        if (idUsuario == null) return ResponseEntity.badRequest().body("id_usuario requerido");
        if (miembroRepo.existsByIdGrupoAndIdUsuario(idGrupo, idUsuario))
            return ResponseEntity.ok(Map.of("msg", "Ya es miembro"));
        GrupoSocialMiembro m = new GrupoSocialMiembro();
        m.setIdGrupo(idGrupo); m.setIdUsuario(idUsuario);
        return ResponseEntity.ok(miembroRepo.save(m));
    }

    /** DELETE /api/grupos/{idGrupo}/miembros/{idUsuario} — abandonar grupo */
    @Transactional
    @DeleteMapping("/{idGrupo}/miembros/{idUsuario}")
    public ResponseEntity<Map<String, String>> abandonar(
            @PathVariable Long idGrupo,
            @PathVariable Long idUsuario) {
        miembroRepo.deleteByIdGrupoAndIdUsuario(idGrupo, idUsuario);
        return ResponseEntity.ok(Map.of("message", "Abandonado"));
    }

    // ── Mensajes del grupo ────────────────────────────────────────────────────────

    /** GET /api/grupos/{idGrupo}/mensajes — últimos 200 mensajes del grupo */
    @GetMapping("/{idGrupo}/mensajes")
    public List<GrupoSocialMensaje> getMensajes(@PathVariable Long idGrupo) {
        List<GrupoSocialMensaje> todos = mensajeRepo.findByIdGrupoOrderByCreatedAtAsc(idGrupo);
        int inicio = Math.max(0, todos.size() - 200);
        return todos.subList(inicio, todos.size());
    }

    /** POST /api/grupos/{idGrupo}/mensajes — enviar mensaje al grupo */
    @PostMapping("/{idGrupo}/mensajes")
    public ResponseEntity<GrupoSocialMensaje> enviarMensaje(
            @PathVariable Long idGrupo,
            @RequestBody GrupoSocialMensaje mensaje) {
        mensaje.setIdGrupo(idGrupo);
        if (mensaje.getCreatedAt() == null) mensaje.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(mensajeRepo.save(mensaje));
    }
}
