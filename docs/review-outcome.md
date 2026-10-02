# Abschlussprüfung von 2317

Ein unabhängiger Reviewer (gpt-6-astra, frischer Kontext) hat den gesamten Branch `f0b7e5a..0cf2e4a` gegen Design und Implementierungsplan geprüft. Bestätigte Befunde wurden in einem Korrekturdurchlauf behoben und mit zuvor fehlgeschlagenen Regressionstests geprüft. Eine weitere Reviewrunde wurde nicht beauftragt.

## Korrigierte Befunde

| Befund                                  | Änderung                                                                            | Regression                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Natürliches Trackende verwirft Aufnahme | Native Pause bei `ended=true` wird nicht als Unterbrechung gemeldet                 | Eventreihenfolge als Unit-Test; echter Audio-/Video-Download beim Trackende       |
| Abbruch startet verspätet Ton           | Playback-Versuche werden bei Pause ungültig; Prüfung nach Resume und Play           | Verzögertes Resume und Play als Unit-Tests; Browser prüft stummen Recorderabbruch |
| Tablet/Vollbild verzerrt Bild           | Beide Dimensionen werden gemeinsam über das ausgewählte Verhältnis eingepasst       | Vier Formate auf Desktop, Tablet, Mobil und im Vollbild                           |
| Fünf-Minuten-Limit löscht Arbeit        | Zeitlimit stoppt erfolgreich; genau eine Ergebnisbenachrichtigung löst Download aus | 300.000-ms-Unit-Test; echter MediaRecorder mit verkürztem Timer                   |
| Jede Variation ersetzt einen GPU-Puffer | Attribut wird einmal angelegt und danach aktualisiert                               | Native WebGL-Instrumentierung: zehn Variationen ohne zusätzliche Puffer           |

Die Pufferallokation wurde vom Reviewer als Minor eingestuft und vom Implementer wegen der Größe von 1.497.600 Byte je Variation und wiederholter Nutzung auf begrenzten Geräten als Important bewertet. Dies ist kein Nachweis eines permanenten Speicherlecks. Es bleiben keine zurückgestellten Minor-Befunde.

## Getroffene Entscheidungen

1. **Zeitlimit:** Automatischer Abschluss ersetzt das im Plan vorgesehene Verwerfen. Wer fünf Minuten aufnimmt, erhält das gespeicherte Segment; echte Unterbrechungen verwerfen weiterhin. Falls diese Erwartung falsch ist, entsteht ein unerwünschter, löschbarer Download.
2. **iPhone Safari:** Ohne echtes Gerät wird keine dortige Zuverlässigkeit zugesagt. Linux-WebKit und mobile Layouttests rechtfertigen diese Einschränkung. Andernfalls können gerätespezifische Wiedergabe-, Speicher- oder Exportprobleme weitere Arbeit benötigen.
3. **Referenzlook:** Der Autor hat lokale Referenzframes angesehen und das private Video in beiden Browsern abgespielt. Der Look ist eine eigene Interpretation; das private Medium wird nicht für Review oder Repository weitergegeben. Falls die Ästhetik nicht passt, sind weitere visuelle Anpassungen nötig.
4. **GitHub:** Erstellung, Remote-Inhalt und Remote-CI waren zunächst wegen der offenen Browseranmeldung unbestätigt. Am 2. Oktober 2026 hat der Nutzer das Repository selbst angelegt und nach Hinweis auf seine öffentliche Sichtbarkeit den Upload ausdrücklich freigegeben. Remote-Inhalt und CI werden getrennt geprüft; der vollständige lokale Quellstand bleibt unabhängig davon erhalten.
5. **Grafiktreiber:** Der Seed-Puffer wird wiederverwendet; native Tests prüfen neue Allokationen, nicht die spätere Speicherfreigabe im Treiber. Falls dennoch Speicherprobleme auftreten, ist Geräteprofiling nötig.

Die konkrete Gesamtabnahme und Browsergrenzen stehen in [verification.md](verification.md).
