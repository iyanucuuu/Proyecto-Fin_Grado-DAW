package org.example.controllers;

import org.example.entities.Pista;
import org.example.entities.ResenaPista;
import org.example.entities.Usuario;
import org.example.repositories.PistaRepository;
import org.example.repositories.ResenaPistaRepository;
import org.example.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/resenas")
@CrossOrigin(origins = "http://localhost:4200")
public class ResenaPistaController {

    @Autowired private ResenaPistaRepository resenaRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private PistaRepository pistaRepo;

    /** GET /api/resenas/pista/{idPista} — reseñas de una pista ordenadas por fecha desc */
    @GetMapping("/pista/{idPista}")
    public ResponseEntity<List<Map<String, Object>>> getResenas(@PathVariable Integer idPista) {
        try {
            List<Map<String, Object>> result = resenaRepo.findByPistaIdPistaOrderByFechaCreacionDesc(idPista)
                .stream().map(r -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id_resena",     r.getIdResena());
                    m.put("comentario",    r.getComentario());
                    m.put("valoracion",    r.getValoracion());
                    m.put("estado_asfalto",r.getEstadoAsfalto());
                    m.put("fecha_creacion",r.getFechaCreacion());
                    Map<String, Object> u = new java.util.LinkedHashMap<>();
                    if (r.getUsuario() != null) {
                        u.put("id_usuario",  r.getUsuario().getId_usuario());
                        u.put("username",    r.getUsuario().getUsername());
                        u.put("foto_perfil", r.getUsuario().getFotoPerfil());
                    }
                    m.put("usuario", u);
                    return m;
                }).toList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    /** GET /api/resenas/existe?idUsuario=X&idPista=Y — comprueba si el usuario ya reseñó */
    @GetMapping("/existe")
    public Map<String, Boolean> existeResena(
            @RequestParam Long idUsuario,
            @RequestParam Integer idPista) {
        return Map.of("existe", resenaRepo.existsByUsuarioIdUsuarioAndPistaIdPista(idUsuario, idPista));
    }

    /** POST /api/resenas — crear reseña */
    @PostMapping
    public ResponseEntity<?> crearResena(@RequestBody Map<String, Object> body) {
        Long idUsuario  = body.get("id_usuario") instanceof Number n ? n.longValue() : null;
        Integer idPista = body.get("id_pista") instanceof Number n ? n.intValue() : null;

        if (idUsuario == null || idPista == null)
            return ResponseEntity.badRequest().body("id_usuario e id_pista requeridos");
        if (resenaRepo.existsByUsuarioIdUsuarioAndPistaIdPista(idUsuario, idPista))
            return ResponseEntity.badRequest().body(Map.of("error", "Ya existe una reseña de este usuario para esta pista"));

        Optional<Usuario> uOpt = usuarioRepo.findById(idUsuario);
        Optional<Pista>   pOpt = pistaRepo.findById(idPista);
        if (uOpt.isEmpty() || pOpt.isEmpty()) return ResponseEntity.notFound().build();

        ResenaPista r = new ResenaPista();
        r.setUsuario(uOpt.get());
        r.setPista(pOpt.get());
        r.setComentario((String) body.getOrDefault("comentario", ""));
        r.setValoracion(body.get("valoracion") instanceof Number n ? n.intValue() : null);
        r.setEstadoAsfalto(body.get("estado_asfalto") instanceof Number n ? n.intValue() : null);
        r.setFechaCreacion(LocalDateTime.now());
        return ResponseEntity.ok(resenaRepo.save(r));
    }

    /** DELETE /api/resenas?idUsuario=X&idPista=Y — eliminar la reseña del usuario */
    @Transactional
    @DeleteMapping
    public ResponseEntity<Map<String, String>> eliminarResena(
            @RequestParam Long idUsuario,
            @RequestParam Integer idPista) {
        resenaRepo.deleteByUsuarioIdUsuarioAndPistaIdPista(idUsuario, idPista);
        return ResponseEntity.ok(Map.of("message", "Reseña eliminada"));
    }
}
