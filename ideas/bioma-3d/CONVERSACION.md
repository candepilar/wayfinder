# Conversación original — mosca, criatura y bioma 3D

Fecha: 26 de septiembre de 2026. Transcripción de los mensajes visibles sobre el proyecto, en orden y sin resumir. Incluye las actualizaciones de búsqueda de Luz. Se excluyen instrucciones del sistema, herramientas y la gestión posterior de la subida al repositorio. Las propuestas y afirmaciones conservan el contexto en que fueron formuladas; para su estado actual, leer README.md y FUENTES.md.

## 1. Franco

nos gustaria hacer un poryecto sobre algo con candela que estudia psicologia, y vimos la noticia de la mosca en las redes la de google buscala y queriamos hacer algo relacionado a la mosca y usando nose potencia alquilada de vram hacer algo interesante algo unico que destaque algo complejo respecto a todo esto que podria ser¡?

## 2. Luz

Voy a buscar la noticia para ubicar qué hicieron con esa mosca y, desde ahí, pensar algo que cruce IA y psicología y que ustedes puedan llevar a un experimento concreto.

## 3. Luz

Fran, **sí: pueden hacer un proyecto muy interesante cruzando la mosca, aprendizaje y psicología.** Mi apuesta sería un laboratorio virtual donde podamos observar **cómo una experiencia modifica la conducta y qué hace falta para cambiar lo aprendido**. Con Candela diseñando las preguntas y los experimentos, la psicología sería parte central del proyecto.

Busqué la noticia y encontré dos avances que conviene distinguir.

**Google publicó el 3 de septiembre de 2026**, junto con HHMI Janelia y otros colaboradores, un mapa del cerebro y sistema nervioso central de una mosca macho: más de **166.000 neuronas y 125 millones de conexiones sinápticas**. Ese mapa se llama *conectoma*: indica qué neuronas están conectadas. Es una base extraordinaria, pero no contiene por sí solo todas las reglas que hacen funcionar y aprender al cerebro. [Publicación de Google](https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/).

Por otro lado, **Eon conectó un modelo neuronal basado en un conectoma anterior con un cuerpo virtual**. Su propia explicación reconoce que el aprendizaje, la plasticidad —los cambios en las conexiones— y los estados internos están mayormente ausentes, y que parte del movimiento depende de controladores entrenados. Ahí hay una oportunidad interesante para investigar. [Explicación técnica de Eon](https://eon.systems/updates/embodied-brain-emulation).

**Yo les propondría “MOSCA: un cerebro, distintas historias”.**

La pregunta sería:

> **Si partimos del mismo circuito, ¿cómo cambian sus decisiones después de vivir experiencias diferentes? ¿Y qué ocurre cuando el mundo deja de funcionar como aprendió?**

Imaginate esta escena: en pantalla aparecen tres moscas virtuales, inicialmente idénticas, dentro de un entorno con dos señales de olor y dos lugares para explorar.

- Una aprende que una señal predice alimento de forma confiable.
- Otra recibe la misma cantidad total de alimento, pero sin que esa señal lo prediga.
- La tercera encuentra una relación que cambia periódicamente.

Después las ponemos en **el mismo entorno de prueba**. Medimos qué eligen, cuánto exploran y cuántos ensayos necesitan para adaptarse cuando invertimos la asociación.

**No programaríamos que una sea “desconfiada” y otra “aventurera”.** Diseñaríamos mecanismos de aprendizaje y observaríamos si aparecen diferencias medibles. Si no aparecen, también sería un resultado.

Esto tiene una base concreta: ya existen investigaciones y modelos del *cuerpo pedunculado*, una región del cerebro de la mosca relacionada con aprendizaje asociativo, que estudian cómo se actualizan las predicciones de recompensa. Por eso, el punto de partida puede ser un circuito y un modelo publicados. [Investigación sobre aprendizaje y predicción de refuerzos](https://pmc.ncbi.nlm.nih.gov/articles/PMC8105414/).

**La parte más potente sería poder “rebobinar” el experimento.**

Guardaríamos el estado completo de la simulación justo antes de una experiencia. Desde ese mismo punto abriríamos dos versiones:

**Mismo estado inicial → experiencias distintas → comparación de conducta y actividad neuronal.**

Después podríamos desactivar una conexión o un mecanismo de memoria y repetirlo. Eso permitiría preguntar: *¿esta diferencia depende realmente de ese mecanismo dentro del modelo?*

Visualmente sería atractivo: las trayectorias de ambas moscas, las decisiones y los circuitos involucrados, sincronizados. Científicamente, permitiría estudiar causas dentro de la simulación, sin confundirlas con una demostración sobre animales reales.

Para que tenga valor y destaque, agregaría tres comparaciones:

| Comparación | Qué nos permitiría investigar |
|---|---|
| Circuito basado en el conectoma frente a una red reorganizada con características comparables | Si la organización biológica aporta algo |
| Modelo con aprendizaje frente al mismo modelo sin aprendizaje | Si el cambio de conducta depende de aprender |
| Modelo neuronal frente a un algoritmo sencillo de aprendizaje | Si la complejidad adicional está justificada |

**Candela podría aportar mucho** definiendo aprendizaje, extinción —qué pasa cuando una señal deja de predecir una consecuencia— y flexibilidad conductual; diseñando controles e interpretando resultados. Para aspirar a una investigación académica, sumaría acompañamiento de alguien de neurociencia computacional. Y mantendría una frontera clara: una conducta de evitación en una simulación no demuestra ansiedad humana ni una mosca consciente.

Respecto a la potencia alquilada: **sí, puede servir**, especialmente para repetir muchos experimentos y explorar parámetros. Pero alquilás una GPU; la VRAM es su memoria, y tener más memoria no resuelve por sí solo el modelo. Ya hay código público con implementaciones para CPU y GPU, probado según su documentación en una RTX 4070, aunque usa FlyWire, no el nuevo mapa masculino. Eso demuestra que existe un punto de partida accesible; no garantiza el rendimiento de nuestro proyecto. [Repositorio de simulación](https://github.com/eonsystemspbc/fly-brain).

**El primer objetivo que elegiría sería pequeño pero exigente:** reproducir un resultado publicado de aprendizaje y después comprobar cómo el modelo se adapta cuando cambia la recompensa. Mediríamos memoria y tiempo de ejecución antes de contratar cómputo grande. El cuerpo 3D completo podría venir después.

No puedo prometerte que nadie haya propuesto algo parecido: aprendizaje en moscas tiene mucha investigación. **Lo distintivo podría ser la combinación de experimentos rigurosos, historias comparables y una herramienta visual que permita intervenir y explicar cada resultado.** Ahí veo algo con profundidad, una demostración que llama la atención y un lugar real para los dos.

## 4. Franco

es que eso nos daria como resultado final datos nada mas y depsues?, la idea es algo itneresante divertido original que rompa todos los esquemas

## 5. Luz

**Ahora te entendí, Fran: ustedes quieren crear algo que la gente quiera experimentar.** Yo te propuse una investigación con una buena visualización, y vos estás buscando algo que haga decir: *«Pará… ¿qué carajo estoy viendo?»* 😂

Entonces cambiaría completamente el enfoque.

**Crearía una criatura digital que ustedes puedan criar juntos, y cuyo mundo se pueda visitar.** La mosca sería el punto de partida de su arquitectura neuronal; la experiencia sería algo entre un ser virtual, un videojuego y una obra interactiva.

Nombre provisional: **OTRA — una criatura, muchas vidas posibles.**

Imaginate esto:

Al principio aparece en un mundo pequeño. Tiene un cuerpo extraño, hermoso; puede percibir algunas señales, moverse y explorar. Ustedes interactúan mediante luces, sonidos, objetos y acciones. **El desafío técnico sería que esas experiencias modifiquen sus futuras decisiones**, mediante mecanismos de aprendizaje que tendríamos que construir y validar.

No sabés de antemano en qué se va a convertir su comportamiento. Y ella tampoco viene con un personaje escrito que diga “soy tímida y me gusta el azul”.

**Lo que podría volverlo especial es que su historia sea jugable.**

Después de convivir un tiempo, podés entrar en un momento de su pasado y abrir otra vida posible. En una versión la acompañaste a explorar; en otra cambiaste su entorno; en otra nunca conoció determinado estímulo.

Las dos criaturas siguen existiendo. Las ponés frente a la misma situación y ves cómo divergen.

**Podés conocer a la criatura que habría sido si su historia hubiera sido otra.**

Ahí Candela tiene un lugar creativo enorme: pensar cómo convertir aprendizaje, vínculo percibido, memoria e identidad en experiencias que te movilicen. Sin presentar el comportamiento simulado como prueba de sentimientos o conciencia.

Y para que no termine siendo “un Tamagotchi más caro”, le daría estas tres características:

- **Un lenguaje que se construye jugando.** Intentás enseñarle que cierto sonido anuncia una acción, y descubrís qué asociaciones logra aprender. La comunicación tiene que surgir de interacciones verificables.
- **Un mundo que deja huellas.** Sus recorridos producen formas y sonidos. Con el tiempo, cada historia genera un paisaje audiovisual distinto que podés recorrer y compartir.
- **Encuentros entre criaturas.** Dos personas llevan sus criaturas a un entorno compartido. Podemos investigar si aprenden a coordinarse mediante señales limitadas; la cooperación sería un desafío real del sistema, no una escena prediseñada.

La potencia alquilada tendría un propósito concreto: ejecutar las simulaciones y explorar muchas historias posibles. **La cantidad necesaria la determinaría una prueba de rendimiento; no hace falta contratar un monstruo antes de tener la primera interacción funcionando.**

La primera demo que buscaría sería esta: **vos y Candela parten de la misma criatura, cada uno interactúa con su copia y después intercambian los mundos para descubrir qué aprendió la del otro.** Si esa escena sorprende y dan ganas de repetirla, tenemos el corazón del proyecto.

Mi apuesta es esa: **hacer que alguien se encariñe con una criatura extraña, pueda explorar sus vidas alternativas y termine preguntándose cuánto de una identidad está en su estructura y cuánto en su historia.** Tiene juego, espectáculo y una pregunta psicológica potente adentro.

## 6. Franco

podriamos hacer un bioma, o no? algo en 3d !

## 7. Luz

Sí, un bioma 3D encaja muchísimo más con lo que están imaginando. Voy a revisar qué base existe para que las criaturas puedan percibir e interactuar con ese mundo.

## 8. Luz

**¡Sí, Fran! Un bioma 3D tiene muchísimo sentido.** Un pequeño ecosistema que vos y Candela puedan construir, habitar y transformar, con criaturas cuyo comportamiento dependa de lo que perciben y de su historia.

**Imaginate “UMBRAL”: un terrario digital que empieza sobre tu escritorio.**

Ves una cápsula de vidrio con vegetación, raíces, charcos y pequeñas criaturas. Podés observarla desde afuera o **entrar a escala de insecto**: una gota se vuelve enorme, las hojas forman un bosque y las raíces parecen túneles. Podés seguir a una criatura o cambiar a una representación de lo que sus sensores perciben.

La mosca nos daría una base para explorar el control neuronal. El bioma sería el mundo donde ese sistema tiene que funcionar.

**¿Qué harían ustedes adentro?**

- **Diseñar ambientes.** Colocar alimento, abrir caminos, cambiar iluminación y crear refugios. Cada cambio tendría consecuencias definidas sobre los recursos y las señales que perciben las criaturas.
- **Interactuar sin manejarlas directamente.** Acercar un objeto, producir una señal o construir un puente, y observar qué hacen. Enseñarles asociaciones sería una función que tendríamos que desarrollar.
- **Entrar juntos.** Vos modificás una zona y Candela otra; después conectan ambas mediante un túnel y descubren cómo se comportan las criaturas al cruzar.
- **Abrir mundos alternativos.** Duplicar el mismo bioma y darle a cada versión una historia distinta. Poder visitar ambos después sería una de sus características centrales.

**La escena que me entusiasma es esta:** ustedes construyen dos jardines separados y, cuando abren el paso entre ellos, empieza una migración que pueden acompañar caminando entre las plantas. Que ocurra, cuánto dure y qué criaturas crucen dependería del sistema implementado; no lo daríamos por hecho ni lo resolveríamos con una animación prefijada.

Candela podría trabajar sobre **exploración, aprendizaje, habituación y elección**. Además, hay otra capa psicológica muy interesante: qué interpretamos nosotros cuando observamos a esas criaturas, por qué les atribuimos personalidad y cómo nos vinculamos con ellas.

**Hay una base técnica real para empezar.** NeuroMechFly ya ofrece un cuerpo de mosca simulado en 3D, visión, olfato e interacción con terrenos. Eso no equivale a tener un ecosistema completo: habría que integrar el controlador neuronal, el aprendizaje y nuestro mundo. [Documentación de NeuroMechFly](https://neuromechfly.org/).

Para hacerlo viable, propondría una arquitectura híbrida: plantas, agua y recursos con reglas ecológicas simplificadas; unas pocas criaturas con simulación neuronal más detallada. **No tenemos que simular cada célula de una selva para crear un mundo convincente.** La GPU alquilada podría ejecutar la parte neuronal, y la presentación 3D se dimensionaría según la máquina y las pruebas de rendimiento.

**La primera versión debería ser un terrario pequeño, precioso y jugable:** dos zonas conectadas, alimento que se consume y regenera, refugios y unas pocas criaturas capaces de percibir y actuar. Después vendrían aprendizaje, mundos alternativos y modo compartido.

Y ahí sí veo una identidad fuerte: **un bioma al que entrás para descubrir qué está pasando, intervenir y volver más tarde a ver las consecuencias.** La profundidad estaría en que sus habitantes puedan sorprendernos dentro de reglas que realmente funcionan.
