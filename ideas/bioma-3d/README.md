# Bioma 3D — exploración de Franco y Candela

Fecha de la conversación: 26 de septiembre de 2026.

**Estado: idea en exploración. No hay prototipo, simulación ejecutada, presupuesto aprobado ni GPU contratada para este proyecto.**

Franco pidió guardar toda la información de esta conversación en el repositorio compartido con Cande. Esta carpeta documenta una idea nueva; no cambia el proyecto Wayfinder, su implementación ni las decisiones del hackatón. No se ha decidido presentar el bioma al concurso.

## Leer primero

- [Conversación completa sobre el proyecto](CONVERSACION.md): mensajes de Franco y respuestas de Luz, conservados en orden, incluyendo las primeras propuestas y las correcciones de rumbo.
- [Fuentes y alcance de lo comprobado](FUENTES.md): enlaces consultados durante la conversación y límites de cada referencia.

## Qué están buscando

Franco quiere crear un proyecto con Candela, que estudia psicología, a partir de la noticia del mapa neuronal de la mosca. Consideró alquilar potencia de cómputo/GPU para hacer algo complejo, original, divertido y llamativo.

La corrección central de Franco fue que un proyecto cuyo resultado final fueran solamente datos no alcanzaba. Quiere una experiencia que la gente pueda disfrutar y explorar. Después propuso explícitamente: **“podriamos hacer un bioma, o no? algo en 3d !”**

La dirección más reciente es un pequeño ecosistema 3D interactivo, con criaturas, entornos modificables e historias distintas. Las funciones que siguen son propuestas de Luz para desarrollar esa dirección; no son un alcance completo aprobado por ambos ni capacidades ya implementadas.

## Concepto más reciente: UMBRAL

Nombre provisional sugerido por Luz: **UMBRAL — un terrario digital que empieza sobre tu escritorio**. No se eligió un nombre definitivo.

Un recipiente de vidrio contiene vegetación, raíces, charcos, alimento, refugios y pequeñas criaturas. Se puede observar desde afuera o entrar a escala de insecto: las gotas se vuelven enormes, las hojas forman un bosque y las raíces parecen túneles.

La experiencia propuesta permite seguir a una criatura o ver una representación de sus entradas sensoriales. El objetivo es que sus acciones dependan del entorno, su estado y, si se implementa aprendizaje, su experiencia previa.

### Interacciones propuestas

1. **Diseñar ambientes:** colocar alimento, abrir caminos, modificar iluminación, construir refugios y puentes. Las consecuencias sobre recursos y señales deben corresponder a reglas implementadas.
2. **Influir sin controlar directamente:** acercar objetos, producir señales y observar respuestas. Enseñar asociaciones requiere desarrollar un mecanismo de aprendizaje; no viene resuelto por cargar el conectoma.
3. **Construir juntos:** Franco modifica una zona y Candela otra; luego conectan ambas mediante un túnel. El modo compartido es una aspiración posterior, no una función existente.
4. **Abrir mundos alternativos:** duplicar el estado completo de un bioma, aplicar experiencias distintas y visitar ambas ramas de la historia.
5. **Volver a observar consecuencias:** explorar cómo cambiaron recursos, recorridos y decisiones. La persistencia y la ejecución mientras nadie está conectado todavía no se definieron.

### Escena central imaginada

Dos jardines separados se conectan. Los visitantes pueden acompañar a las criaturas a escala de insecto mientras estas exploran el paso. Una posible migración dependería de las reglas, las percepciones y los controladores; no se promete que ocurra espontáneamente.

La identidad buscada: **un bioma al que entrás para descubrir qué está pasando, intervenir y volver más tarde a ver las consecuencias**.

## Cómo evolucionó la idea

### 1. MOSCA — un cerebro, distintas historias

Primera propuesta de Luz: laboratorio virtual para estudiar cómo distintas experiencias modifican decisiones y adaptación a cambios.

- Copias inicialmente iguales reciben historias distintas: una señal predice alimento de forma confiable; otra no lo predice pese a recibir igual alimento total; otra cambia periódicamente su relación con el alimento.
- Después se comparan en un mismo entorno: elección, exploración y cantidad de ensayos necesarios para adaptarse al invertir la asociación.
- Se propuso guardar un estado, bifurcar experiencias e intervenir conexiones o mecanismos de memoria.
- Controles propuestos: circuito basado en conectoma frente a una red reorganizada comparable; aprendizaje activado frente a desactivado; modelo neuronal frente a un algoritmo sencillo.

**Respuesta de Franco:** obtener datos no era suficiente como producto final. La propuesta científica se conserva como posible base interna, pero la experiencia divertida y original pasa a ser central.

### 2. OTRA — una criatura, muchas vidas posibles

Segunda propuesta de Luz: criatura digital que dos personas pueden criar mediante interacción con luces, sonidos, objetos y acciones. Su historia puede bifurcarse para explorar qué habría ocurrido con otras experiencias.

Funciones sugeridas:

- Construir asociaciones que permitan una comunicación limitada mediante el juego.
- Convertir recorridos en formas y sonidos, generando paisajes audiovisuales diferentes por historia.
- Reunir criaturas de distintas personas e investigar coordinación mediante señales limitadas.
- Partir de la misma criatura, interactuar por separado e intercambiar los mundos para descubrir qué aprendió cada copia.

Estas ideas pueden alimentar el bioma, pero no todas fueron elegidas como requisitos.

### 3. Bioma 3D / UMBRAL

Franco propone el bioma 3D y Luz desarrolla el concepto de terrario explorable. Esta es la dirección más reciente de la charla.

## Psicología: lugar posible para Candela

Los temas propuestos son exploración, aprendizaje asociativo, habituación, elección, memoria, extinción de asociaciones y flexibilidad de conducta. Candela podría participar en las preguntas, las interacciones, los controles y la interpretación.

Existe también una capa centrada en el visitante: por qué atribuimos personalidad a las criaturas y cómo construimos un vínculo con ellas. No se definió un estudio con participantes ni se autorizó recolectar datos psicológicos.

No se deben presentar conductas simuladas como demostración de conciencia, sentimientos o trastornos humanos. Para una investigación académica se sugirió acompañamiento de alguien de neurociencia computacional. La originalidad absoluta y el valor científico todavía requieren una revisión específica.

## Base técnica discutida

### Qué aporta la noticia

Google y sus colaboradores publicaron un mapa del cerebro y sistema nervioso central de una mosca macho. Un conectoma describe conexiones, pero no determina por sí solo toda la dinámica, el aprendizaje o la conducta.

Eon mostró una integración entre un modelo neuronal basado en un conectoma anterior y un cuerpo virtual. Sus límites explícitos incluyen aprendizaje y estados internos mayormente ausentes, interfaces diseñadas a mano y controladores motores entrenados.

NeuroMechFly/FlyGym ofrece una base para cuerpo 3D, física, visión, olfato e interacción con el terreno. El código de simulación neuronal consultado utiliza FlyWire; no debe confundirse con una implementación del nuevo mapa masculino de Google.

### Arquitectura propuesta, aún no seleccionada ni probada

- Presentación 3D del terrario y navegación a escala de insecto.
- Recursos y ambiente con reglas ecológicas simplificadas.
- Unas pocas criaturas con simulación neuronal más detallada.
- Traducción entre señales del mundo, entradas neuronales y acciones corporales.
- Mecanismos explícitos de aprendizaje si se quieren cambios por experiencia.
- Guardado del estado del mundo, criaturas y generadores de azar para reanudar o bifurcar historias de forma controlada.

La arquitectura híbrida permite concentrar el cómputo en algunas criaturas sin simular cada célula de una selva. Es una propuesta de ingeniería, no una validación de rendimiento.

### GPU y VRAM

La idea es alquilar una GPU si las pruebas lo justifican; VRAM es su memoria. El costo también depende del simulador, cantidad de criaturas, física, duración, registro de actividad y exigencia de tiempo real.

Se mencionó ejecutar la simulación neuronal remotamente y dimensionar la presentación 3D según la máquina. No se eligió proveedor, motor gráfico, GPU, cantidad de VRAM, tarifa ni presupuesto. No se contrató ningún servicio.

El repositorio neuronal consultado declara pruebas en RTX 4070, lo cual no demuestra que el bioma propuesto funcione en tiempo real con esa placa.

## Primera versión sugerida

Un terrario pequeño, atractivo y jugable con:

- Dos zonas conectadas.
- Alimento que se consume y regenera.
- Refugios y caminos.
- Unas pocas criaturas que perciban señales y actúen en consecuencia.
- Cámara exterior y navegación a escala de insecto.

Aprendizaje, bifurcación completa de mundos y modo compartido se propusieron como expansiones. No se acordó un cronograma ni se empezó a programar.

La prueba técnica inicial debería medir el circuito completo percepción → controlador → movimiento → nueva percepción, además de memoria y tiempo de ejecución. La experiencia jugable debe evaluarse por lo que permite hacer y descubrir, no solo por una pantalla atractiva.

## Pendientes para continuar

- Elegir estética: naturalista, fantástica o una combinación.
- Definir el primer comportamiento y la interacción que harán divertida la demo.
- Decidir cuánto detalle neuronal aporta realmente al producto.
- Elegir una combinación compatible de datos, controlador, cuerpo y motor 3D.
- Medir rendimiento antes de presupuestar cómputo remoto.
- Acordar alcance, roles, nombre y siguientes pasos entre Franco y Candela.

**Alcance de esta entrega:** documentación de la conversación por pedido de Franco. No implica implementación, publicación de una aplicación ni reemplazo de Wayfinder.
