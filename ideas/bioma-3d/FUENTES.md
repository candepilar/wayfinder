# Fuentes consultadas en la conversación

Consulta: 26 de septiembre de 2026. Estas referencias sustentan el contexto técnico; no prueban que UMBRAL, OTRA o MOSCA estén implementados. El texto completo de las propuestas está en [CONVERSACION.md](CONVERSACION.md).

## Google: mapa del sistema nervioso de la mosca macho

- [A connectomics milestone: Mapping the complete male fruit fly brain](https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/)
- Publicación: 3 de septiembre de 2026.
- Google, HHMI Janelia y colaboradores describen un mapa con más de 166.000 neuronas y 125 millones de conexiones sinápticas, incluyendo el cordón nervioso ventral.
- Alcance: mapa estructural disponible para investigación. No es por sí mismo una copia funcional completa de la mosca ni una prueba de conciencia.

## Eon: integración de cerebro simulado y cuerpo

- [How the Eon Team Produced a Virtual Embodied Fly](https://eon.systems/updates/embodied-brain-emulation)
- Publicación: 10 de marzo de 2026.
- Explica cómo integraron modelos publicados de cerebro y cuerpo, con un ciclo sensorial y motor.
- Límites declarados: pocas modalidades y conductas, aprendizaje y estados internos mayormente ausentes, interfaces simplificadas y controladores motores entrenados. No describe una simulación exhaustiva del animal.
- Esta demostración utiliza recursos anteriores; no debe atribuirse al nuevo mapa masculino anunciado por Google en septiembre.

## Código de simulación neuronal

- [eonsystemspbc/fly-brain](https://github.com/eonsystemspbc/fly-brain)
- Implementaciones documentadas para CPU y GPU, incluyendo Brian2, Brian2CUDA, PyTorch y otros motores.
- La documentación consultada utiliza datos FlyWire v783 y declara pruebas en RTX 4070.
- La disponibilidad del código y esos requisitos no validan el rendimiento, compatibilidad o funcionamiento del bioma propuesto. No se ejecutó este repositorio durante la conversación.
- Antes de reutilizar o distribuir código se deben revisar las licencias concretas de los componentes elegidos.

## Cuerpo, sensores y entorno 3D

- [NeuroMechFly / FlyGym — documentación oficial](https://neuromechfly.org/)
- [Repositorio NeLy-EPFL/flygym](https://github.com/NeLy-EPFL/flygym)
- Describe un modelo corporal con visión y olfato simulados e interacción física con terreno.
- Es una base para investigar control sensoriomotor; no entrega automáticamente un ecosistema, aprendizaje, multijugador ni un producto terminado.
- Sus cifras de rendimiento corresponden a sus propias condiciones de prueba, no al proyecto de Franco y Candela.

## Aprendizaje y memoria

- [Learning with reinforcement prediction errors in a model of the Drosophila mushroom body](https://pmc.ncbi.nlm.nih.gov/articles/PMC8105414/)
- Investigación utilizada para fundamentar que existen modelos de aprendizaje asociativo en circuitos de la mosca.
- No demuestra que esos mecanismos estén ya integrados en el cuerpo virtual o que se puedan transferir sin trabajo adicional al bioma.

## Lecturas adicionales localizadas

- [Recurrent architecture for adaptive regulation of learning in the insect brain](https://www.nature.com/articles/s41593-020-0607-9)
- [Dopamine-mediated interactions between short- and long-term memory dynamics](https://www.nature.com/articles/s41586-024-07819-w)
- [Whole-Brain Connectomic Graph Model Enables Whole-Body Locomotion Control in Fruit Fly](https://arxiv.org/abs/2602.17997)

Estas lecturas surgieron en la búsqueda exploratoria. No se realizó una revisión sistemática ni una certificación de novedad del proyecto.
