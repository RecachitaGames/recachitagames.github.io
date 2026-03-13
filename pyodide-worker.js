// pyodide-worker.js
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.mjs";

let pyodide = null;
let interruptBuffer = null;
let inputResolve = null;

async function initPyodide() {
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
  });
  console.log("Pyodide listo en el worker");
}

initPyodide();

self.onmessage = async (event) => {
  if (event.data.type === 'init') {
    interruptBuffer = event.data.interruptBuffer;
    if (pyodide) {
      pyodide.setInterruptBuffer(interruptBuffer);
    }
    return;
  }

  if (event.data.type === 'input_response') {
    if (inputResolve) {
      inputResolve(event.data.value);
      inputResolve = null;
    }
    return;
  }

  const { id, code, packages } = event.data;

  if (!pyodide) {
    self.postMessage({ id, error: "Pyodide no está listo" });
    return;
  }

  try {
    // Cargar paquetes
    if (packages && packages.length > 0) {
      await pyodide.loadPackage(packages);
    }

    // Definir input function
    await pyodide.runPythonAsync(`
import builtins
import js

async def _input(prompt=''):
    if prompt:
        print(prompt, end='', flush=True)
    js.self.postMessage({'type': 'input_request', 'prompt': ''})
    value = await js.input_wait()
    print(value)
    return value

builtins.input = _input

async def input_wait():
    pass  # This will be overridden
`);

    // Override input_wait
    pyodide.globals.set('input_wait', async () => {
      return new Promise(resolve => {
        inputResolve = resolve;
      });
    });

    // Ejecutar código envuelto en async con captura de stdout
    const wrappedCode = `
import asyncio
import sys
import io

_cap = io.StringIO()
sys.stdout = _cap

async def _main():
${code}

await _main()

_cap.getvalue()
`;

    const result = await pyodide.runPythonAsync(wrappedCode);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};