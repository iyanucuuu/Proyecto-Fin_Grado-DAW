package org.example.controllers;

import org.example.entities.PistaFavorita;
import org.example.repositories.PistaFavoritaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favoritas")
@CrossOrigin(origins = "http://localhost:4200")
public class PistaFavoritaController {

    @Autowired private PistaFavoritaRepository repo;

    /** GET /api/favoritas/{idUsuario} — lista de IDs de pistas favoritas del usuario */
    @GetMapping("/{idUsuario}")
    public List<Integer> getFavoritas(@PathVariable Long idUsuario) {
        return repo.findByIdUsuario(idUsuario)
                   .stream().map(PistaFavorita::getIdPista).toList();
    }

    /** POST /api/favoritas — añadir una pista a favoritos */
    @PostMapping
    public ResponseEntity<?> addFavorita(@RequestBody Map<String, Number> body) {
        Long idUsuario  = body.get("id_usuario").longValue();
        Integer idPista = body.get("id_pista").intValue();
        if (repo.existsByIdUsuarioAndIdPista(idUsuario, idPista))
            return ResponseEntity.ok(Map.of("msg", "Ya en favoritos"));
        PistaFavorita fav = new PistaFavorita();
        fav.setIdUsuario(idUsuario); fav.setIdPista(idPista);
        return ResponseEntity.ok(repo.save(fav));
    }

    /** DELETE /api/favoritas/{idUsuario}/{idPista} — quitar de favoritos */
    @Transactional
    @DeleteMapping("/{idUsuario}/{idPista}")
    public ResponseEntity<Map<String, String>> removeFavorita(
            @PathVariable Long idUsuario, @PathVariable Integer idPista) {
        repo.deleteByIdUsuarioAndIdPista(idUsuario, idPista);
        return ResponseEntity.ok(Map.of("message", "Eliminado de favoritos"));
    }
}
