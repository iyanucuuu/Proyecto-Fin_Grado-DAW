package org.example.controllers;

import org.example.entities.ValoracionPista;
import org.example.repositories.ValoracionPistaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/valoraciones")
@CrossOrigin(origins = "http://localhost:4200")
public class ValoracionPistaController {

    @Autowired private ValoracionPistaRepository repo;

    /** GET /api/valoraciones/todas — todas las valoraciones de todas las pistas (para la lista de pistas) */
    @GetMapping("/todas")
    public ResponseEntity<List<ValoracionPista>> getTodas() {
        try { return ResponseEntity.ok(repo.findAll()); }
        catch (Exception e) { return ResponseEntity.ok(List.of()); }
    }

    /** GET /api/valoraciones/pista/{idPista} — todas las valoraciones de una pista */
    @GetMapping("/pista/{idPista}")
    public ResponseEntity<List<ValoracionPista>> getValoraciones(@PathVariable Integer idPista) {
        try { return ResponseEntity.ok(repo.findByIdPista(idPista)); }
        catch (Exception e) { return ResponseEntity.ok(List.of()); }
    }

    /** DELETE /api/valoraciones?idPista=X&idUsuario=Y — eliminar la valoración del usuario */
    @Transactional
    @DeleteMapping
    public ResponseEntity<Map<String, String>> eliminarValoracion(
            @RequestParam Integer idPista,
            @RequestParam Long idUsuario) {
        repo.deleteByIdPistaAndIdUsuario(idPista, idUsuario);
        return ResponseEntity.ok(Map.of("message", "Valoración eliminada"));
    }

    /**
     * POST /api/valoraciones — crear o actualizar valoración.
     * Si el usuario ya valoró esta pista se actualiza la nota, si no se crea.
     */
    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> valorar(@RequestBody Map<String, Object> body) {
        try {
            Integer idPista = body.get("id_pista")  instanceof Number n ? n.intValue()  : null;
            Long idUsuario  = body.get("id_usuario") instanceof Number n ? n.longValue() : null;
            Integer nota    = body.get("nota")       instanceof Number n ? n.intValue()  : null;
            if (idPista == null || idUsuario == null || nota == null)
                return ResponseEntity.badRequest().body("Faltan campos");
            repo.upsertValoracion(idPista, idUsuario, nota);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}
