---
title: "El stack técnico: por qué uso estas herramientas y no otras"
date: 2026-00-00
tags: [herramientas, stack, meta]
draft: true
---

<!-- STUB — extraído de 2026-05-08-Abrazar-la-imposibilidad.md -->
<!-- Desarrollar y publicar como artículo independiente -->

## Borrador / material de partida

En el desarrollo del juego uso C++, Godot, Blender, Libresprite, Sprytile, Logseq, Audacity y, por supuesto, muchos scripts python como suerte de pegamento.

Empleo C++ para la implementación de todos los algoritmos y el núcleo del juego, ya que me permite exprimir mejor el rendimiento del equipo, además de gestionar por mi cuenta la memoria. Todo puntos importantes en mi caso, ya que soy muy consciente de los múltiples problemas de memoria y ancho de banda que genera una simulación tan compleja. Además, manteniendo el núcleo del proyecto en C++ y generando una librería, tengo más maniobrabilidad. Si en cinco años Godot desaparece o pivota en direcciones que no se alinean con las necesidades de mi proyecto, los algoritmos siguen siendo válidos. Puedo portarlos a otro motor o, en el peor caso, anclarme en una versión anterior de Godot o mantener un fork propio. Los shaders, los simuladores, la lógica principal todo es código que tengo bajo control.

Con ya bastantes años de experiencia en Unity y Unreal, emplear Godot puede parecer una decisión errónea. Pero lo prefiero porque es ligero, open source, estable, muy configurable, y tiene un forward renderer simple (perfecto para un juego que no necesita gráficos foto-realistas). GDScript es interpretado, no es C++, pero para la lógica de inputs, interfaz y shader dispatch es suficiente. La simulación core —física determinista, sistemas de eventos, gestión de estado— está en C++, compilada como plugins nativos. Así tengo ambos mundos: rapidez de desarrollo en scripting, velocidad y control en lo crítico.

Utilizo Blender para modelado 3D desde al menos Blender 2.36. Lo adoro. Es todo lo que necesito, y junto a Sprytile me sirve para modelar y texturizar todos los assets del juego.

En cuanto al pixel art para el juego, empleo Libresprite ya que es un fork mantenido de Aseprite, y sigue en desarrollo.

Para limpiar, editar y procesar audio, empleo Audacity. No sé hacer gran cosa, pero tengo previsto ahondar en la toma de samples, referencias y sfx a lo largo del año que viene.

Y, como ya he mencionado más veces, utilizo Logseq como knowledge graph y entorno de worldbuilding.

Todo lo anterior es bajo mi control. No dependo de licencias, de que una corporación pivote y abandone o boicotee su producto, ni de darme de bruces contra un bug sin poder revisar el código. Si algo muere, puedo seguir. Sé que gasto más tiempo ahora configurando diferentes herramientas, calibrándolas, e integrándolas entre sí. Pero el retorno es independencia a largo plazo.

---

## Ideas para desarrollar

- Profundizar en la arquitectura C++ + Godot: cómo se comunican la librería nativa y el engine
- Cómo se integra Logseq con el resto del stack (los hooks de commit, los scripts de python)
- Por qué Sprytile en lugar de otros flujos de texturizado
- El estado actual de Audacity para este uso: ¿es suficiente a largo plazo?
- Decisiones de las que me arrepiento o que revisaría
