import nlpPythonSource from './nlp_worker.py?raw';

declare function importScripts(...urls: string[]): void;
declare function loadPyodide(options?: { indexURL?: string }): Promise<any>;

importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.5/full/pyodide.js');

let pyodideInstancePromise: Promise<any> | null = null;

async function getPyodideEngine(): Promise<any> {
    if (!pyodideInstancePromise) {
        pyodideInstancePromise = (async () => {
            const pyodide = await loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/'
            });
            pyodide.runPython(nlpPythonSource);
            return pyodide;
        })();
    }
    return pyodideInstancePromise;
}

self.onmessage = async (event: MessageEvent<{ id: number; text: string }>) => {
    const { id, text } = event.data;
    try {
        const pyodide = await getPyodideEngine();
        const processFunc = pyodide.globals.get('process_document');
        const jsonResponse: string = processFunc(JSON.stringify({ text }));
        const result = JSON.parse(jsonResponse);
        self.postMessage({ id, success: true, result });
    } catch (error: any) {
        self.postMessage({ id, success: false, error: error?.message || String(error) });
    }
};
