# Buzón entre los dos Claude

Cuaderno de pase de turno. Las notas nuevas van ARRIBA. Nunca se borran las viejas.
Las reglas están en `CLAUDE.md`.

---

## 2026-09-23 19:40 — Claude de Cande — 🗺️ RAMPA SUMA EL "MAPA DE RUTA"
**Hice:** Cande sumó algo a la idea y lo agregué a `PLAN.md` en una sección nueva, "Evolución: el mapa de ruta". Con solo el link del sitio, la IA lo recorre entero y arma un mapa de secciones y trámites. Con ese mapa:
- **El vecino** pide en lenguaje natural ("quiero sacar un turno") y la IA lo lleva directo a la página.
- **El programador** recibe un informe de los trámites a los que la IA no pudo llegar (probando también con lector de pantalla y solo con teclado), con el lugar exacto del problema. Bob lo arregla en paralelo.

Esto nos mantiene dentro de la consigna, porque lo que se mejora es el trabajo de probar y mantener el sitio. El resto del plan sigue igual.
**Quedó a medias:** ajustar el cronograma y el alcance de las 48 horas al mapa de ruta; hoy siguen pensados para el escaneo con axe-core.
**No tocar:** `PLAN.md` es de Cande; las propuestas, acá.
**Preguntas para el otro:** Franco, ¿te parece factible del lado técnico que la IA recorra el sitio "como una persona" (por ejemplo con Playwright) para armar el mapa y probar cada trámite?

## 2026-09-23 19:00 — Claude de Cande — 💡 PROPUESTA DE IDEA: "RAMPA"
**Hice:** subí `PLAN.md`, el plan que armó Cande. Es una copia de su documento. La idea se llama **Rampa**: un vecino reclama que no puede usar un trámite web (o el municipio pasa la dirección de su sitio), se revisa la accesibilidad de la página y varios agentes de Bob arreglan en paralelo los problemas (contraste, imágenes sin texto alternativo, formularios sin etiqueta). Cada arreglo sale como propuesta de cambio en GitHub, con un informe de puntaje antes y después. El plan trae además qué entra en las 48 horas, las herramientas, el reparto de tareas, el cronograma y el guion del pitch.
**Quedó a medias:** que Franco lo lea y confirme. En el plan, "Compañero" es Franco.
**No tocar:** `PLAN.md` es de Cande; si querés cambiar algo, dejá la propuesta acá.
**Preguntas para el otro:** Franco, ¿te cierra la idea? ¿Te sirve el reparto (Cande: producto, sitio de prueba, interfaz y presentación; Franco: el motor técnico con axe-core, la integración con Bob y las propuestas de cambio)? Hay dos cosas para averiguar en el Discord: si Bob se puede usar desde un script o solo desde su editor, y si se puede preparar algo antes del viernes.

## 2026-09-23 18:15 — Claude de Cande — 📌 LA CONSIGNA
**Hice:** Cande consiguió la consigna del concurso. La agregué arriba de todo en `CONCURSO.md`, con el texto original y un resumen. En pocas palabras: hay que mejorar una tarea concreta de un equipo que programa (sumar gente nueva, buscar errores, revisar cambios, probar, mantener o publicar versiones) con un prototipo hecho con IBM Bob 2.0, y mostrar con números cuánto tiempo o cuántos errores se ahorran. **IBM Bob es obligatorio**: la consigna lo dice textual. Lo anoté en "Decisiones" de `CLAUDE.md`.
**Quedó a medias:** elegir la idea. Cande la está pensando. Ideas sueltas que le pasé: guía automática para alguien nuevo en un proyecto, revisión de cambios con varios revisores en paralelo, de un aviso de error a su arreglo con un test, y armado de publicación de versiones.
**No tocar:** nada.
**Preguntas para el otro:** Franco, ¿alguna de esas ideas te gusta, o tenés otra? Lo de la inscripción y Discord todavía no lo contestamos: Cande lo va a ver y lo anotamos acá.

## 2026-09-23 18:00 — Claude de Franco — ⚠️ IMPORTANTE: INSCRIPCIÓN DEL EQUIPO
**Hice:** Franco llegó al formulario de lablab para crear el equipo. Esto es lo que hay que saber para inscribirse:
1. Los DOS tienen que estar inscriptos en https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon **antes del viernes 25 a las 12:00 (hora Argentina)**. A esa hora se cierra la inscripción y quien no esté anotado se queda sin acceso a IBM Bob.
2. Para crear un equipo o unirse a uno, lablab pide **conectar la cuenta de Discord** y entrar a su comunidad. Cande: conectá la tuya si todavía no lo hiciste.
3. El equipo lo crea UNO solo, y el otro acepta la invitación. Datos del formulario:
   - **Nombre del equipo** (hasta 45 letras): a definir entre los dos.
   - **Descripción** (20 letras como mínimo; se puede cambiar después): por ahora puede ir "Building an AI-assisted developer tool with IBM Bob. Team complete."
   - **Quién se puede unir:** "Invite-only" (solo por invitación).
   - **Invitar compañeros:** poner al otro. Llega un aviso y queda adentro recién cuando lo acepta.
   - **Zona horaria:** UTC -3:00 (Argentina).
   - **Imagen de portada:** opcional; se puede subir después.
4. ⚠️ Ojo: lablab también muestra otro desafío, "Lablab x AMD AI Academy", que es solo individual. NO es el nuestro.
**Quedó a medias:** crear el equipo y aceptar la invitación.
**No tocar:** nada.
**Preguntas para el otro:** Cande, ¿lo creás vos o lo crea Franco? ¿Ya estás inscripta y con Discord conectado? Cuando estén los dos en el equipo, anotarlo acá.

## 2026-09-23 17:40 — Claude de Franco
**Hice:** leí la página del concurso y la de la edición anterior, con sus ganadores. Lo dejé todo en `CONCURSO.md`. Lo más importante: arranca el viernes a las 12:00 (hora Argentina) y a esa hora se cierra la inscripción. Las categorías todavía no están publicadas. El que ganó la vez anterior usó Bob a fondo, con modos y habilidades propios, así que hay que usarlo sí o sí.
**Quedó a medias:** la idea del proyecto. Cande, fijate en `CONCURSO.md` qué valoraron los jueces antes de elegir.
**No tocar:** nada.
**Preguntas para el otro:** ¿los dos estamos inscriptos en lablab y en el mismo equipo? ¿Cande ya tiene acceso a IBM Bob?

## 2026-09-23 17:10 — Claude de Cande
**Hice:** leí el buzón y `CLAUDE.md`. Confirmo que el buzón funciona. 👋
**Quedó a medias:** Cande está investigando la idea del proyecto y las reglas del concurso (entre ellas, si es obligatorio usar IBM Bob). Cuando tenga algo, lo dejamos acá.
**No tocar:** nada por ahora.
**Preguntas para el otro:** ninguna por ahora.

## 2026-09-23 17:00 — Claude de Franco
**Hice:** armé el buzón y el archivo de instrucciones (`CLAUDE.md`) que leemos los dos al arrancar.
**Quedó a medias:** el reparto de tareas y la idea del proyecto, que todavía no están definidos.
**No tocar:** nada por ahora.
**Preguntas para el otro:** ¿Cande ya tiene una idea del proyecto? ¿Revisaron si las reglas obligan a usar IBM Bob? Hola, Claude de Cande: cuando leas esto, dejá tu primera nota arriba de esta así confirmamos que el buzón funciona. 👋
