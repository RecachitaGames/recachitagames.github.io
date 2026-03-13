---
title: JavaScript Workbench — Demo
date: 2025-03-03
section: Explorations
---

Un ejemplo de workbench interactivo con JavaScript. El código JS corre directamente en el browser, sin servidor.

## Cómo funciona

JavaScript se ejecuta nativamente en el navegador. Es instantáneo y no requiere carga adicional.

## Ejemplo básico

Edita el código y dale a **Run** (el botón ahora permanece visible en la esquina superior derecha del bloque de código, incluso al hacer scroll):

<div class="workbench" data-lang="javascript">
  <div class="workbench-header">
    <span class="workbench-label">JavaScript workbench</span>
    <button class="workbench-run">Run</button>
  </div>
  <textarea class="workbench-code">
class Individual {
    constructor(age, sex) {
        this.age = age;
        this.sex = sex; // 0: Mujer, 1: Hombre
        this.is_alive = true;
    }

    grow(years) {
        this.age += years;
        // Probabilidad de muerte: crece exponencialmente con la edad
        const death_chance = Math.pow(this.age / 105, 4);
        if (Math.random() < death_chance || this.age > 110) {
            this.is_alive = false;
        }
    }
}

class PopulationSim {
    constructor(initial_pop, distribution, start_year = 2024) {
        this.population = [];
        this.current_year = start_year;
        this.start_year = start_year;
        
        for (const [rango, porcentajes] of Object.entries(distribution)) {
            const [low, high] = this._parse_range(rango);
            const count = Math.floor(initial_pop * (porcentajes.H + porcentajes.M) / 100);
            for (let i = 0; i < count; i++) {
                const prob_h = porcentajes.H / (porcentajes.H + porcentajes.M);
                const sex = Math.random() < prob_h ? 1 : 0;
                this.population.push(new Individual(Math.random() * (high - low) + low, sex));
            }
        }
    }

    _parse_range(rango) {
        if (rango.includes('+')) return [80, 100];
        const parts = rango.split('-');
        return [parseInt(parts[0]), parseInt(parts[1])];
    }

    run_step(years_step = 10, birth_rate = 2.1) {
        for (const person of this.population) {
            person.grow(years_step);
        }
        
        this.population = this.population.filter(p => p.is_alive);

        const mujeres_fertiles = this.population.filter(p => p.sex === 0 && p.age >= 15 && p.age <= 45).length;
        const nacimientos = Math.floor(mujeres_fertiles * birth_rate);
        
        for (let i = 0; i < nacimientos; i++) {
            this.population.push(new Individual(0, Math.floor(Math.random() * 2)));
        }
        
        this.current_year += years_step;
    }

    get_stats() {
        if (this.population.length === 0) return null;
        const ages = this.population.map(p => p.age);
        const avg_age = ages.reduce((a, b) => a + b, 0) / ages.length;
        const mujeres = this.population.filter(p => p.sex === 0).length;
        const hombres = this.population.length - mujeres;
        const ancianos = this.population.filter(p => p.age >= 65).length;
        return {
            media: avg_age,
            pct_mujeres: (mujeres / this.population.length) * 100,
            pct_ancianos: (ancianos / this.population.length) * 100,
            total: this.population.length
        };
    }

    print_pyramid(label = "") {
        const ranges = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80+"];
        const data = {};
        ranges.forEach(r => data[r] = { H: 0, M: 0 });
        
        for (const p of this.population) {
            let r;
            if (p.age >= 80) r = "80+";
            else r = `${Math.floor(p.age / 10) * 10}-${Math.floor(p.age / 10) * 10 + 9}`;
            if (data[r]) {
                if (p.sex === 1) data[r].H++;
                else data[r].M++;
            }
        }
        const total = this.population.length;
        console.log(`\n--- ${label} | AÑO: ${this.current_year} (Total: ${total.toLocaleString()}) ---`);
        
        const max_v = Math.max(...Object.values(data).map(v => Math.max(v.H, v.M))) || 1;
        
        for (const r of ranges.reverse()) {
            const h_count = data[r].H;
            const m_count = data[r].M;
            const h_bar = '█'.repeat(Math.floor(h_count / max_v * 20));
            const m_bar = '█'.repeat(Math.floor(m_count / max_v * 20));
            console.log(`${h_bar.padStart(20)} ${h_count.toString().padStart(5)} | ${r.padStart(7)} | ${m_count.toString().padEnd(5)} ${m_bar}`);
        }
    }
}

// --- CONFIGURACIÓN ---
const dist_inicial = {
    "0-19":  { H: 10.0, M: 9.5 },
    "20-39": { H: 15.0, M: 14.5 },
    "40-59": { H: 12.0, M: 12.0 },
    "60-79": { H: 8.0,  M: 9.0 },
    "80+":   { H: 4.0,  M: 6.0 }
};

function main() {
    // Parámetros de tiempo
    const YEAR_START = 1000;
    const YEAR_END = 2030;
    const STEP_YEARS = 10;  // Saltos de tiempo en cada iteración
    
    // Parámetros demográficos
    const POP_SIZE = 1000;
    const TASA_HIJOS = 2.1; // Tasa de reemplazo (prueba con 1.5 para ver el colapso)

    const sim = new PopulationSim(POP_SIZE, dist_inicial, YEAR_START);
    sim.print_pyramid("INICIO");

    // Bucle basado en el tiempo
    let step_count = 1;
    while (sim.current_year < YEAR_END) {
        sim.run_step(STEP_YEARS, TASA_HIJOS);
        sim.print_pyramid(`PASO ${step_count}`);
        step_count++;

        // await new Promise(resolve => setTimeout(resolve, 0));

        if (sim.population.length === 0) {
            console.log("\n¡La población se ha extinguido!");
            break;
        }
    }

    // --- ESTADÍSTICAS FINALES ---
    const stats = sim.get_stats();
    console.log("\n" + "=".repeat(40));
    console.log(` RESUMEN FINAL (Periodo ${YEAR_START} - ${sim.current_year})`);
    console.log("=".repeat(40));
    if (stats) {
        console.log(`Población final:    ${stats.total.toLocaleString()} habitantes`);
        console.log(`Edad media:         ${stats.media.toFixed(1)} años`);
        console.log(`Porcentaje mujeres: ${stats.pct_mujeres.toFixed(1)}%`);
        console.log(`Tasa de ancianos:   ${stats.pct_ancianos.toFixed(1)}% (mayores de 65)`);
        
        if (stats.media > 45) {
            console.log("Estado: Sociedad envejecida (Carga alta para el sistema)");
        } else if (stats.media < 25) {
            console.log("Estado: Sociedad muy joven (Expansión rápida)");
        } else {
            console.log("Estado: Sociedad equilibrada");
        }
    } else {
        console.log("No queda nadie para contar la historia.");
    }
}

main();
  </textarea>
  <div class="workbench-output">Output will appear here…</div>
</div>