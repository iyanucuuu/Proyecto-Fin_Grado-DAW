package org.example.controllers;

import org.example.entities.Amigo;
import org.example.entities.Usuario;
import org.example.repositories.AmigoRepository;
import org.example.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/amigos")
@CrossOrigin(origins = "http://localhost:4200")
public class AmigoController {

    @Autowired
    private AmigoRepository amigoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    @Lazy
    private LogroController logroController;

    private static final int LOGRO_PRIMER_AMIGO = 15;

    // ── GET amigos aceptados de un usuario ────────────────────────────────────────
    @GetMapping("/usuario/{id}")
    public List<Amigo> getAmigosAceptados(@PathVariable Long id) {
        return amigoRepository.findAmigosAceptados(id);
    }

    // ── GET todas las relaciones (para la pantalla de amigos) ─────────────────────
    @GetMapping("/relaciones/{id}")
    public List<Amigo> getTodasRelaciones(@PathVariable Long id) {
        return amigoRepository.findTodasRelaciones(id);
    }

    // ── GET solicitudes pendientes recibidas ──────────────────────────────────────
    @GetMapping("/pendientes/{id}")
    public List<Amigo> getSolicitudesPendientes(@PathVariable Long id) {
        return amigoRepository.findSolicitudesPendientes(id);
    }

    // ── GET conteo de solicitudes pendientes (para el badge del header) ───────────
    @GetMapping("/pendientes/count/{id}")
    public Map<String, Long> countPendientes(@PathVariable Long id) {
        return Map.of("count", amigoRepository.countSolicitudesPendientes(id));
    }

    // ── POST enviar solicitud ─────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> enviarSolicitud(@RequestBody Map<String, Long> body) {
        Long idSolicita = body.get("idSolicita");
        Long idAcepta   = body.get("idAcepta");

        Optional<Usuario> solicitante = usuarioRepository.findById(idSolicita);
        Optional<Usuario> aceptante   = usuarioRepository.findById(idAcepta);

        if (solicitante.isEmpty() || aceptante.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Usuario no encontrado"));
        }

        Amigo amigo = new Amigo();
        amigo.setSolicitante(solicitante.get());
        amigo.setAceptante(aceptante.get());
        amigo.setEstado("pendiente");

        return ResponseEntity.ok(amigoRepository.save(amigo));
    }

    // ── PUT aceptar solicitud ─────────────────────────────────────────────────────
    @PutMapping("/{id}/aceptar")
    public ResponseEntity<?> aceptarSolicitud(@PathVariable Integer id) {
        Optional<Amigo> optional = amigoRepository.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();

        Amigo amigo = optional.get();
        amigo.setEstado("aceptado");
        Amigo guardado = amigoRepository.save(amigo);

        // Logro "Primer Amigo" para ambos usuarios
        if (guardado.getSolicitante() != null)
            logroController.asignarSiNotieneLogro(Math.toIntExact(guardado.getSolicitante().getId_usuario()), LOGRO_PRIMER_AMIGO);
        if (guardado.getAceptante() != null)
            logroController.asignarSiNotieneLogro(Math.toIntExact(guardado.getAceptante().getId_usuario()), LOGRO_PRIMER_AMIGO);

        return ResponseEntity.ok(guardado);
    }

    // ── DELETE rechazar / eliminar relación ───────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminarRelacion(@PathVariable Integer id) {
        if (!amigoRepository.existsById(id)) return ResponseEntity.notFound().build();
        amigoRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Relación eliminada"));
    }

    // ── GET estado entre dos usuarios ─────────────────────────────────────────────
    // GET /api/amigos/estado?idUsuario=X&idOtro=Y
    // Devuelve { estado: "aceptado" | "pendiente" | "ninguno" }
    @GetMapping("/estado")
    public Map<String, String> getEstado(
            @RequestParam Long idUsuario,
            @RequestParam Long idOtro) {
        List<Amigo> relaciones = amigoRepository.findTodasRelaciones(idUsuario)
                .stream()
                .filter(a -> {
                    Long sol = a.getSolicitante() != null ? a.getSolicitante().getId_usuario() : null;
                    Long ace = a.getAceptante()   != null ? a.getAceptante().getId_usuario()   : null;
                    return idOtro.equals(sol) || idOtro.equals(ace);
                })
                .toList();
        if (relaciones.isEmpty()) return Map.of("estado", "ninguno");
        return Map.of("estado", relaciones.get(0).getEstado());
    }
}
