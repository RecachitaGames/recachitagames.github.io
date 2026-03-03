# Fluid simulation en Godot con compute shaders

Devlog del sistema de simulación de fluidos GPU para redes de tuberías en Godot 4, usando C++ GDExtensions y compute shaders con almacenamiento en texturas.

## El problema

Necesitaba simular el flujo de fluido a través de miles de segmentos de tubería en tiempo real. La CPU no escala. La solución: mover toda la simulación a la GPU.

## Arquitectura

### Almacenamiento en texturas

Cada segmento de tubería ocupa un pixel en una textura RGBA32F. Los canales almacenan:

- `R` — presión
- `G` — velocidad
- `B` — densidad
- `A` — flags (abierto/cerrado, tipo de válvula)

```glsl
// compute shader — un invocation por segmento
layout(local_size_x = 64) in;

layout(set = 0, binding = 0, rgba32f) uniform image2D pipe_state;
layout(set = 0, binding = 1) uniform PipeParams {
    float dt;
    float viscosity;
    int pipe_count;
};
```

### El GDExtension en C++

```cpp
void FluidSim::_process(double delta) {
    rd->compute_list_begin();
    rd->compute_list_bind_compute_pipeline(compute_list, pipeline);
    rd->compute_list_bind_uniform_set(compute_list, uniform_set, 0);
    rd->compute_list_dispatch(compute_list, 
        Math::ceil(pipe_count / 64.0), 1, 1);
    rd->compute_list_end();
}
```

## Resultados

Con 8192 segmentos, el frame budget del shader es ~0.3ms en una RTX 3070. CPU side practice es insignificante.

## Problemas encontrados

### Sincronización de barriers

El mayor headache fue asegurar que las escrituras de un frame fueran visibles en el siguiente. Godot 4's RenderingDevice maneja esto con `barrier()` después del dispatch, pero la documentación no es clara sobre cuándo es necesario.

### Precisión floating point

Con tuberías de longitud muy diferente, los gradientes de presión producían artefactos numéricos. Solución: normalizar las longitudes al preprocesar la red y trabajar en espacio normalizado.

## Próximos pasos

- Soporte para fluidos no-newtonianos
- Visualización en tiempo real de la red (actualmente solo debug overlay)
- Exportar estado a CSV para análisis offline