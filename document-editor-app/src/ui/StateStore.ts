import { DocumentEngineInstance } from '../types/wasm';

export interface AppState {
    cursorPosition: number;
    selectionLength: number;
    canUndo: boolean;
    canRedo: boolean;
    wordCount: number;
    characterCount: number;
}

type Listener = (state: AppState) => void;

export class StateStore {
    private state: AppState;
    private listeners: Set<Listener> = new Set();
    private engine: DocumentEngineInstance;
    private storageKey = 'document_editor_autosave_v1';

    constructor(engine: DocumentEngineInstance) {
        this.engine = engine;
        this.state = {
            cursorPosition: 0,
            selectionLength: 0,
            canUndo: false,
            canRedo: false,
            wordCount: 0,
            characterCount: 0
        };
        this.loadFromStorage();
    }

    public getState(): AppState {
        return { ...this.state };
    }

    public setState(partial: Partial<AppState>): void {
        this.state = { ...this.state, ...partial };
        this.notifyListeners();
        this.persistToStorage();
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener(this.getState());
        }
    }

    public updateEngineState(): void {
        const stats = JSON.parse(this.engine.getStats());
        const text = this.engine.getFullText().trim();
        const words = text ? text.split(/\s+/).length : 0;

        this.setState({
            canUndo: this.engine.canUndo(),
            canRedo: this.engine.canRedo(),
            characterCount: stats.length,
            wordCount: words
        });
    }

    private persistToStorage(): void {
        try {
            const text = this.engine.getFullText();
            localStorage.setItem(this.storageKey, JSON.stringify({
                text,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.warn('Auto-save storage quota exceeded or unavailable', err);
        }
    }

    private loadFromStorage(): void {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (typeof parsed.text === 'string' && parsed.text.length > 0 && this.engine.getLength() === 0) {
                    this.engine.insertText(0, parsed.text);
                }
            } catch (e) {
                console.error('Failed to recover auto-saved document state', e);
            }
        }
    }
}
