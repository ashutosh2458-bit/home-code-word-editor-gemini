export interface StyleSpan {
    start: number;
    length: number;
    bold: boolean;
    italic: boolean;
    fontFamily: string;
    fontColor: string;
    alignment: string;
}

export interface SearchResult {
    start: number;
    length: number;
}

export interface DocumentStats {
    length: number;
    pieces: number;
    styles: number;
    undoStack: number;
    redoStack: number;
}

export interface DocumentEngineInstance {
    insertText(position: number, text: string): void;
    deleteRange(position: number, length: number): void;
    getTextRange(position: number, length: number): string;
    getFullText(): string;
    getLength(): number;
    applyStyle(position: number, length: number, property: string, value: string): void;
    getStylesJson(position: number, length: number): string;
    regexSearchJson(pattern: string): string;
    regexReplace(pattern: string, replacement: string): number;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    getStats(): string;
}

export interface DocumentEngineModule {
    DocumentEngine: {
        new (): DocumentEngineInstance;
        new (initialText: string): DocumentEngineInstance;
    };
}

declare function DocumentCoreModule(moduleOverrides?: object): Promise<DocumentEngineModule>;
export default DocumentCoreModule;
