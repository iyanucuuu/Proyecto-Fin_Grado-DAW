package org.example.controllers;

import org.example.entities.MensajeChatClan;
import org.example.repositories.MensajeChatClanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat-clan")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatClanController {

    @Autowired private MensajeChatClanRepository repo;

    /** GET /api/chat-clan/{idEscuderia} — últimos 100 mensajes de la escudería */
    @GetMapping("/{idEscuderia}")
    public List<MensajeChatClan> getMensajes(@PathVariable Long idEscuderia) {
        List<MensajeChatClan> todos = repo.findByIdEscuderiaOrderByCreatedAtAsc(idEscuderia);
        int inicio = Math.max(0, todos.size() - 100);
        return todos.subList(inicio, todos.size());
    }

    /** POST /api/chat-clan — enviar un mensaje al chat de la escudería */
    @PostMapping
    public ResponseEntity<MensajeChatClan> enviarMensaje(@RequestBody MensajeChatClan mensaje) {
        if (mensaje.getCreatedAt() == null) mensaje.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(repo.save(mensaje));
    }

    /** DELETE /api/chat-clan/{id} — eliminar un mensaje concreto */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminarMensaje(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Mensaje eliminado"));
    }
}
