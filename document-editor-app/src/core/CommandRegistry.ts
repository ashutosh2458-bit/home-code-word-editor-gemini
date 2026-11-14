import { DocumentEngineInstance } from '../types/wasm';

export type CommandTier = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4';

export interface CommandContext {
    engine?: DocumentEngineInstance;
    store?: any;
    ui?: any;
}

export interface Command {
    id: string;
    label: string;
    category: string;
    tier: CommandTier;
    icon?: string;
    shortcut?: string;
    execute: (context: CommandContext) => void;
}

export class CommandRegistry {
    private commands: Map<string, Command> = new Map();

    public register(command: Command): void {
        this.commands.set(command.id, command);
    }

    public registerBatch(commands: Command[]): void {
        for (const cmd of commands) {
            this.register(cmd);
        }
    }

    public unregister(id: string): void {
        this.commands.delete(id);
    }

    public getCommand(id: string): Command | undefined {
        return this.commands.get(id);
    }

    public getAllCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    public getCommandsByTier(tier: CommandTier): Command[] {
        return this.getAllCommands().filter(cmd => cmd.tier === tier);
    }

    public search(query: string): Command[] {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return this.getAllCommands();

        return this.getAllCommands().filter(cmd =>
            cmd.label.toLowerCase().includes(lowerQuery) ||
            cmd.category.toLowerCase().includes(lowerQuery) ||
            cmd.id.toLowerCase().includes(lowerQuery)
        );
    }

    public bindCommandPaletteShortcut(contextProvider: () => CommandContext): void {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.openCommandPaletteModal(contextProvider());
            }
        });
    }

    public openCommandPaletteModal(context: CommandContext): void {
        const existing = document.getElementById('doc-command-palette-overlay');
        if (existing) {
            existing.remove();
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'doc-command-palette-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
            display: flex; align-items: flex-start; justify-content: center;
            padding-top: 12vh; z-index: 9999; backdrop-filter: blur(2px);
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 560px; max-width: 92vw; background: #ffffff; border-radius: 10px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15); overflow: hidden;
            border: 1px solid #e2e8f0; font-family: 'Inter', system-ui, sans-serif;
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Search 300+ document commands (formatting, tables, export, AI)...';
        input.style.cssText = `
            width: 100%; padding: 14px 18px; border: none; border-bottom: 1px solid #e2e8f0;
            font-size: 15px; outline: none; box-sizing: border-box;
        `;

        const resultsList = document.createElement('div');
        resultsList.style.cssText = `max-height: 340px; overflow-y: auto;`;

        const renderItems = (items: Command[]) => {
            resultsList.innerHTML = '';
            for (const item of items) {
                const row = document.createElement('div');
                row.style.cssText = `
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 10px 18px; cursor: pointer; border-bottom: 1px solid #f8fafc;
                `;
                row.innerHTML = `
                    <div>
                        <div style="font-size:14px;font-weight:500;color:#1e293b;">${item.label}</div>
                        <div style="font-size:11px;color:#64748b;">${item.category} • ${item.tier.toUpperCase()}</div>
                    </div>
                    <span style="font-size:11px;background:#f1f5f9;padding:3px 7px;border-radius:4px;color:#475569;">
                        ${item.shortcut || item.id}
                    </span>
                `;
                row.addEventListener('mouseenter', () => { row.style.background = '#f1f5f9'; });
                row.addEventListener('mouseleave', () => { row.style.background = '#ffffff'; });
                row.addEventListener('click', () => {
                    item.execute(context);
                    overlay.remove();
                });
                resultsList.appendChild(row);
            }
        };

        input.addEventListener('input', () => renderItems(this.search(input.value)));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        modal.appendChild(input);
        modal.appendChild(resultsList);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        renderItems(this.getAllCommands());
        input.focus();
    }
}

export const globalCommandRegistry = new CommandRegistry();

// Tier 1: Basic Formatting, Lists, Alignment, History
globalCommandRegistry.registerBatch([
    {
        id: 'format.undo',
        label: 'Undo',
        category: 'History',
        tier: 'tier-1',
        shortcut: 'Ctrl+Z',
        execute: ({ engine, store, ui }) => {
            engine?.undo();
            store?.updateEngineState();
            ui?.render();
        }
    },
    {
        id: 'format.redo',
        label: 'Redo',
        category: 'History',
        tier: 'tier-1',
        shortcut: 'Ctrl+Shift+Z',
        execute: ({ engine, store, ui }) => {
            engine?.redo();
            store?.updateEngineState();
            ui?.render();
        }
    },
    {
        id: 'format.bold',
        label: 'Bold Text',
        category: 'Formatting',
        tier: 'tier-1',
        shortcut: 'Ctrl+B',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                const len = engine.getLength();
                engine.applyStyle(0, len, 'bold', 'true');
                store?.updateEngineState();
                ui?.render();
            }
        }
    },
    {
        id: 'format.italic',
        label: 'Italic Text',
        category: 'Formatting',
        tier: 'tier-1',
        shortcut: 'Ctrl+I',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                const len = engine.getLength();
                engine.applyStyle(0, len, 'italic', 'true');
                store?.updateEngineState();
                ui?.render();
            }
        }
    },
    {
        id: 'format.align.center',
        label: 'Align Center',
        category: 'Alignment',
        tier: 'tier-1',
        shortcut: 'Ctrl+E',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                engine.applyStyle(0, engine.getLength(), 'alignment', 'center');
                store?.updateEngineState();
                ui?.render();
            }
        }
    },
    {
        id: 'insert.bulletList',
        label: 'Insert Bullet List Item',
        category: 'Lists',
        tier: 'tier-1',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                engine.insertText(engine.getLength(), '\n• ');
                store?.updateEngineState();
                ui?.render();
            }
        }
    }
]);

// Tier 2: Tables, Images, Headers/Footers, TOC
globalCommandRegistry.registerBatch([
    {
        id: 'insert.table',
        label: 'Insert Markdown/Grid Table',
        category: 'Structure',
        tier: 'tier-2',
        shortcut: 'Ctrl+Alt+T',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                engine.insertText(engine.getLength(), '\n| Column A | Column B |\n| --- | --- |\n| Cell 1 | Cell 2 |\n');
                store?.updateEngineState();
                ui?.render();
            }
        }
    },
    {
        id: 'insert.toc',
        label: 'Insert Table of Contents',
        category: 'Structure',
        tier: 'tier-2',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                engine.insertText(0, 'TABLE OF CONTENTS\n1. Executive Summary\n2. Architecture\n\n');
                store?.updateEngineState();
                ui?.render();
            }
        }
    },
    {
        id: 'insert.headerFooter',
        label: 'Insert Document Header',
        category: 'Page Layout',
        tier: 'tier-2',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                engine.insertText(0, '[HEADER: CONFIDENTIAL DOCUMENT]\n');
                store?.updateEngineState();
                ui?.render();
            }
        }
    }
]);

// Tier 3: Diffing, Encryption, Citations, PDF Export
globalCommandRegistry.registerBatch([
    {
        id: 'export.pdf',
        label: 'Print / Export Document to PDF',
        category: 'Document Management',
        tier: 'tier-3',
        shortcut: 'Ctrl+P',
        execute: () => window.print()
    },
    {
        id: 'insert.citation',
        label: 'Insert APA Citation Placeholder',
        category: 'References',
        tier: 'tier-3',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                engine.insertText(engine.getLength(), ' (Author, 2026)');
                store?.updateEngineState();
                ui?.render();
            }
        }
    },
    {
        id: 'security.redact',
        label: 'Redact Sensitive Numbers (Regex)',
        category: 'Security & Compliance',
        tier: 'tier-3',
        execute: ({ engine, store, ui }) => {
            if (engine) {
                engine.regexReplace('\\b\\d{4,}\\b', '[REDACTED]');
                store?.updateEngineState();
                ui?.render();
            }
        }
    }
]);

// Tier 4: AI Triggers
globalCommandRegistry.registerBatch([
    {
        id: 'ai.summarize',
        label: 'AI: Extractive Summary & Readability Analysis',
        category: 'Artificial Intelligence',
        tier: 'tier-4',
        shortcut: 'Ctrl+Space',
        execute: ({ engine }) => {
            if (engine) {
                window.dispatchEvent(new CustomEvent('doc-ai-analyze', { detail: { text: engine.getFullText() } }));
            }
        }
    },
    {
        id: 'ai.passiveCheck',
        label: 'AI: Detect Passive Voice & Tone Issues',
        category: 'Artificial Intelligence',
        tier: 'tier-4',
        execute: ({ engine }) => {
            if (engine) {
                window.dispatchEvent(new CustomEvent('doc-ai-analyze', { detail: { text: engine.getFullText() } }));
            }
        }
    }
]);
