import { DocumentEngineInstance, StyleSpan } from '../types/wasm';
import { StateStore } from './StateStore';

export class EditorCanvas {
    private container: HTMLElement;
    private canvasElement: HTMLDivElement;
    private cursorElement: HTMLDivElement;
    private engine: DocumentEngineInstance;
    private store?: StateStore;
    private cursorPosition: number = 0;
    private isFocused: boolean = false;

    constructor(container: HTMLElement, engine: DocumentEngineInstance, store?: StateStore) {
        this.container = container;
        this.engine = engine;
        this.store = store;

        this.canvasElement = document.createElement('div');
        this.cursorElement = document.createElement('div');

        this.initDOM();
        this.attachEventListeners();
        this.render();
    }

    private initDOM(): void {
        this.container.style.position = 'relative';
        this.container.style.outline = 'none';
        this.container.tabIndex = 0;

        this.canvasElement.style.cssText = `
            white-space: pre-wrap;
            word-break: break-word;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            padding: 32px;
            min-height: 100%;
            box-sizing: border-box;
            outline: none;
            color: #1e293b;
        `;

        this.cursorElement.style.cssText = `
            position: absolute;
            width: 2px;
            background-color: #2563eb;
            display: none;
            pointer-events: none;
            animation: docCursorBlink 1s infinite;
        `;

        this.container.appendChild(this.canvasElement);
        this.container.appendChild(this.cursorElement);

        if (!document.getElementById('doc-cursor-keyframes')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'doc-cursor-keyframes';
            styleSheet.innerText = `
                @keyframes docCursorBlink {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }

    private attachEventListeners(): void {
        this.container.addEventListener('focus', () => {
            this.isFocused = true;
            this.cursorElement.style.display = 'block';
            this.updateCursorPosition();
        });

        this.container.addEventListener('blur', () => {
            this.isFocused = false;
            this.cursorElement.style.display = 'none';
        });

        this.container.addEventListener('keydown', (e: KeyboardEvent) => {
            if (!this.isFocused) return;
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return;

            let mutated = false;

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) this.engine.redo();
                else this.engine.undo();
                this.cursorPosition = Math.min(this.cursorPosition, this.engine.getLength());
                mutated = true;
            } else if (e.key === 'ArrowLeft') {
                if (this.cursorPosition > 0) this.cursorPosition--;
            } else if (e.key === 'ArrowRight') {
                if (this.cursorPosition < this.engine.getLength()) this.cursorPosition++;
            } else if (e.key === 'Home') {
                this.cursorPosition = 0;
            } else if (e.key === 'End') {
                this.cursorPosition = this.engine.getLength();
            } else if (e.key === 'Backspace') {
                if (this.cursorPosition > 0) {
                    this.engine.deleteRange(this.cursorPosition - 1, 1);
                    this.cursorPosition--;
                    mutated = true;
                }
            } else if (e.key === 'Delete') {
                if (this.cursorPosition < this.engine.getLength()) {
                    this.engine.deleteRange(this.cursorPosition, 1);
                    mutated = true;
                }
            } else if (e.key === 'Enter') {
                this.engine.insertText(this.cursorPosition, '\n');
                this.cursorPosition++;
                mutated = true;
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                this.engine.insertText(this.cursorPosition, e.key);
                this.cursorPosition++;
                mutated = true;
            }

            if (mutated) {
                this.store?.updateEngineState();
            }
            this.render();
            e.preventDefault();
        });

        this.canvasElement.addEventListener('click', () => {
            this.container.focus();
            this.cursorPosition = this.engine.getLength();
            this.render();
        });
    }

    public render(): void {
        const fullText = this.engine.getFullText();
        const totalLen = fullText.length;

        this.canvasElement.innerHTML = '';
        if (totalLen === 0) {
            this.updateCursorPosition();
            return;
        }

        let styles: StyleSpan[] = [];
        try {
            styles = JSON.parse(this.engine.getStylesJson(0, totalLen));
        } catch {
            styles = [];
        }

        const span = document.createElement('span');
        span.textContent = fullText;

        for (const s of styles) {
            if (s.bold) span.style.fontWeight = '700';
            if (s.italic) span.style.fontStyle = 'italic';
            if (s.fontFamily) span.style.fontFamily = s.fontFamily;
            if (s.fontColor) span.style.color = s.fontColor;
            if (s.alignment) this.canvasElement.style.textAlign = s.alignment;
        }

        this.canvasElement.appendChild(span);
        this.updateCursorPosition();
    }

    private updateCursorPosition(): void {
        const textUpToCursor = this.engine.getTextRange(0, this.cursorPosition);
        const lines = textUpToCursor.split('\n');
        const currentLineText = lines[lines.length - 1] || '';

        const measureSpan = document.createElement('span');
        const computedStyle = window.getComputedStyle(this.canvasElement);
        measureSpan.style.font = computedStyle.font;
        measureSpan.style.whiteSpace = 'pre';
        measureSpan.textContent = currentLineText;

        this.container.appendChild(measureSpan);
        const textWidth = measureSpan.getBoundingClientRect().width;
        measureSpan.remove();

        const paddingLeft = 32;
        const paddingTop = 32;
        const lineHeight = 25.6;

        this.cursorElement.style.left = `${paddingLeft + textWidth}px`;
        this.cursorElement.style.top = `${paddingTop + (lines.length - 1) * lineHeight}px`;
        this.cursorElement.style.height = `${lineHeight}px`;
    }
}
