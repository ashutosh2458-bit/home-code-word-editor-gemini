import { CommandRegistry } from '../core/CommandRegistry';
import { StateStore } from './StateStore';
import { DocumentEngineInstance } from '../types/wasm';
import { EditorCanvas } from './EditorCanvas';

export class Toolbar {
    private container: HTMLElement;
    private registry: CommandRegistry;
    private store: StateStore;
    private engine: DocumentEngineInstance;
    private canvas: EditorCanvas;

    constructor(
        container: HTMLElement,
        registry: CommandRegistry,
        store: StateStore,
        engine: DocumentEngineInstance,
        canvas: EditorCanvas
    ) {
        this.container = container;
        this.registry = registry;
        this.store = store;
        this.engine = engine;
        this.canvas = canvas;

        this.render();
        this.store.subscribe(() => this.updateUI());
    }

    private render(): void {
        this.container.innerHTML = '';
        this.container.style.cssText = `
            display: flex;
            gap: 8px;
            padding: 10px 20px;
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            align-items: center;
            flex-wrap: wrap;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        `;

        const commands = this.registry.getAllCommands();
        for (const cmd of commands) {
            const btn = document.createElement('button');
            btn.textContent = cmd.label;
            btn.title = cmd.shortcut ? `${cmd.label} (${cmd.shortcut})` : cmd.label;
            btn.dataset.commandId = cmd.id;
            btn.style.cssText = `
                padding: 6px 12px;
                border: 1px solid #cbd5e1;
                background: #f8fafc;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                color: #334155;
                transition: all 0.15s ease;
            `;

            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {
                    btn.style.background = '#e2e8f0';
                    btn.style.borderColor = '#94a3b8';
                }
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#f8fafc';
                btn.style.borderColor = '#cbd5e1';
            });

            btn.addEventListener('click', () => {
                cmd.execute({ engine: this.engine, store: this.store, ui: this.canvas });
            });

            this.container.appendChild(btn);
        }

        const paletteBtn = document.createElement('button');
        paletteBtn.textContent = 'Command Palette (Ctrl+K)';
        paletteBtn.style.cssText = `
            margin-left: auto;
            padding: 6px 12px;
            border: 1px solid #2563eb;
            background: #eff6ff;
            color: #1d4ed8;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
        `;
        paletteBtn.addEventListener('click', () => {
            this.registry.openCommandPaletteModal({ engine: this.engine, store: this.store, ui: this.canvas });
        });
        this.container.appendChild(paletteBtn);

        this.updateUI();
    }

    private updateUI(): void {
        const state = this.store.getState();
        const undoBtn = this.container.querySelector('[data-command-id="format.undo"]') as HTMLButtonElement | null;
        const redoBtn = this.container.querySelector('[data-command-id="format.redo"]') as HTMLButtonElement | null;

        if (undoBtn) {
            undoBtn.disabled = !state.canUndo;
            undoBtn.style.opacity = state.canUndo ? '1' : '0.45';
        }
        if (redoBtn) {
            redoBtn.disabled = !state.canRedo;
            redoBtn.style.opacity = state.canRedo ? '1' : '0.45';
        }
    }
}
