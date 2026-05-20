package org.example.controllers;

import org.example.entities.MensajeChatPista;
import org.example.repositories.MensajeChatPistaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat-pista")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatPistaController {

    @Autowired private MensajeChatPistaRepository repo;

    /** GET /api/chat-pista/{idPista} — últimos 100 mensajes del chat de la pista */
    @GetMapping("/{idPista}")
    public List<MensajeChatPista> getMensajes(@PathVariable Integer idPista) {
        List<MensajeChatPista> todos = repo.findByIdPistaOrderByCreatedAtAsc(idPista);
        int inicio = Math.max(0, todos.size() - 100);
        return todos.subList(inicio, todos.size());
    }

    /** POST /api/chat-pista — enviar mensaje al chat de la pista */
    @PostMapping
    public ResponseEntity<MensajeChatPista> enviarMensaje(@RequestBody MensajeChatPista mensaje) {
        if (mensaje.getCreatedAt() == null) mensaje.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repo.save(mensaje));
    }

    /** GET /api/chat-pista/conteo-recientes — nº mensajes por pista en las últimas 24 h */
    @GetMapping("/conteo-recientes")
    public Map<Integer, Long> getConteoRecientes() {
        LocalDateTime hace24h = LocalDateTime.now().minusHours(24);
        List<Object[]> rows = repo.countPorPistaDesde(hace24h);
        Map<Integer, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            result.put((Integer) row[0], (Long) row[1]);
        }
        return result;
    }
}
