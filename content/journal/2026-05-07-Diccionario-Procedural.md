---
title: "Diccionario Procedural: Creando un consultor del Idioma Bala"
date: 2026-05-07
tags: lenguaje, bala, herramientas, worldbuilding, conlang
---

- ## Contexto
  
  Llevo semanas expandiendo Bala, el idioma de la isla. Hoy he decidido el nombre de la lengua en sí, y me pareció gracioso que se llamara Bala, como una versión suavizada de Fala/habla. Uno necesita también sus bromas internas durante el desarrollo.
  He pensado en cómo expandir el vocabulario sin que suponga una tarea específica, y he llegado a la decisión de que las propias entradas de worlbuilding fabriquen el diccionario. Cada entrada en Enciclopedia —un animal, una planta, una región, un concepto económico, una técnica artesanal— ahora lleva su `bala::` junto con notas sobre sonoridad y decisiones etimológicas. La distribución es orgánica: la palabra vive donde el concepto vive, dispersa en cientos de archivos markdown.
  
  Eso es bueno para mantener el worldbuilding coherente. Cada elemento jugable, cada especie, cada región... todo tiene su palabra. Pero cuando empiece a generar cartelería, diálogos, mensajes de UI del juego, y entrelazar cada vez más información, necesitaré consultar términos rápidamente. "¿Cómo se dice olivar?" "¿Esa palabra tiene derivados cortos?" "¿Cómo se escribe en Bala el nombre de esa región?"
  
  Bucear en cientos de archivos cada vez no es ideal. Creo que el lenguaje necesita una interfaz de consulta centralizada. Logseq como knowledge graph me está sirviendo mucho, pero no me imagino buscando vocabulario de forma ágil en su interfaz ni con las queries.
- ## Herramientas
  
  Así que me estoy fabricando un pequeño ecosistema de herramientas a medida para explorar y expandir Bala.
  
  Primero está **multilingual_transcriber.html**, una herramienta standalone (html autocontenido sin servidor) que preparé hace ya unos meses. Toma cualquier palabra en inglés o español y la transcribe a los fonemas válidos de Bala, siguiendo una serie de reglas de transcripción de consonantes, fonemas, diptongos etc. Por ejemplo, sustituye consonantes fuertes (T, K, J, H aspirada...) por sus equivalentes suaves en Bala, y respeta las reglas fonológicas del lenguaje. La uso con asiduidad, es mi forma rápida de explorar si una palabra "suena Bala" antes de validarla o documentarla en la Enciclopedia.
  
  También consulto constantemente en el traductor de Google la transcripción fonética de términos en árabe, que en ocasiones uso como base para ampliar vocabulario.
  
  Y ahora he preparado un script python de extractor de diccionario. Este script escanea todos los archivos markdown en Enciclopedia/ y Juego/, extrae las propiedades `bala::`, `es::`, `en::`, `notes::` de cada uno que tenga el tag `#diccionario`, y genera un diccionario actualizado con todas las entradas. De esta forma el diccionario no se queda atrás con ediciones en el knowledge graph.
  
  ```python
  """
  Barre Enciclopedia/, Juego/, Diccionario/ buscando archivos con propiedades inline:
  - es:: palabra en español
  - bala:: palabra_en_idioma_isla (opcional)
  - notes:: notas (opcional)
  - tags:: incluir #diccionario para ser indexada en el diccionario
  Genera Diccionario-generado.md con tabla ordenada alfabéticamente.
  """
  
  import re
  from pathlib import Path
  from collections import OrderedDict
  
  def parse_yaml_frontmatter(content):
    """Extrae propiedades del bloque YAML ---..."""
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return {}
    
    yaml_block = match.group(1)
    props = {}
    
    for line in yaml_block.split('\n'):
        if '::' in line:
            key, val = line.split('::', 1)
            props[key.strip()] = val.strip().strip('"\'')
    
    return props
  
  def has_diccionario_tag(tags_str):
    """Verifica si tiene tag #diccionario."""
    return '#diccionario' in tags_str.lower()
  
  def scan_all_directories(root):
    """Barre Enciclopedia/, Juego/, Lenguaje/Diccionario/ buscando propiedades de diccionario."""
    words = OrderedDict()
    
    scan_dirs = [
        root / 'Enciclopedia' / 'Lenguaje' / 'Diccionario',
        root / 'Enciclopedia',
        root / 'Juego'
    ]
    
    for scan_dir in scan_dirs:
        if not scan_dir.exists():
            continue
        
        for md_file in sorted(scan_dir.rglob('*.md')):
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                props = parse_yaml_frontmatter(content)
                
                # Requiere: es, en, y tag #diccionario
                if (props.get('es', '').strip() and
                    props.get('en', '').strip() and
                    has_diccionario_tag(props.get('tags', ''))):
                    
                    word = md_file.stem  # sin .md
                    
                    # Evita duplicados (Diccionario/ prevalece)
                    if word not in words:
                        words[word] = {
                            'es': props['es'],
                            'en': props['en'],
                            'bala': props.get('bala', ''),
                            'notes': props.get('notes', ''),
                            'tags': props.get('tags', ''),
                            'source': str(md_file.relative_to(root))
                        }
            except Exception as e:
                pass  # Ignora errores silenciosamente
    
    return words
  
  def generate_table(words, output_path):
    """Genera tabla Markdown con columnas: Palabra, Español, English, Bala, Notas, Tags."""
    md = "# Diccionario — Generado\n\n"
    md += "| Palabra | Español | English | Bala | Notas | Tags |\n"
    md += "|---------|---------|---------|------|-------|------|\n"
    
    for word, props in words.items():
        notes = props['notes'].replace('|', '\\|')
        tags = props['tags'].replace('|', '\\|')
        bala = props['bala'].replace('|', '\\|')
        
        md += f"| **{word}** | {props['es']} | {props['en']} | {bala} | {notes} | {tags} |\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md)
    
    return len(words)
  
  if __name__ == '__main__':
    root = Path('.')
    
    words = scan_all_directories(root)
    count = generate_table(words, root / 'Diccionario-generado.md')
    
    print(f"[OK] {count} palabras en Diccionario-generado.md")
  ```
- ## El diccionario como interfaz
  
  Lo importante no es solo centralizar las palabras, sino que el diccionario sirva como la interfaz entre el worldbuilding y la producción del juego. Cuando escriba un cartel en la plaza, un diálogo de NPC, un mensaje de tutorial, consulto el diccionario. Es el puente entre "la isla existe con su lógica lingüística" y "los jugadores ven y leen el idioma de la isla en pantalla".
  
  El flujo es: escribo en la Enciclopedia (una región, un animal, una técnica), agrego su palabra en Bala con `bala::`, subo los cambios al repositorio, y se lanza un hook que ejecuta extract-dict.py. Tras esto la palabra ya está disponible en el consultor. Cada actualización sincroniza automáticamente.
- ## Siguientes pasos
  
  Tengo pendiente preparar una versión web interactiva del diccionario. Algo que me permita hacer búsqueda en tiempo real, filtrar por categoría (animal, planta, verbo, sustantivo, geografía, técnica, concepto...) y que pueda abrir en el navegador mientras desarrollo, sin tener que volver al terminal.
  
  Después, tocará trabajo más en profundidad. Ahora mismo Bala suena rígido: demasiado regular, como un "japonés mediterráneo" con pocas sílabas y fonemas predecibles. Necesita varios pases: decisiones de sonoridad que se eliden en contexto, terminaciones flexibles según fluidez, gramática simplificada para que no sean frases larguísimas. El transcriber y el diccionario son herramientas para mapear ese espacio de decisiones. Cada palabra, cada elección de consonante, cada sonido omitido o modificado, suma coherencia y hará el lenguaje más vivo.