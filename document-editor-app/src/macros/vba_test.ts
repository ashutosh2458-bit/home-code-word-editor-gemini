import { VBALexer } from './vba_lexer';
import { VBAParser } from './vba_parser';
import { VBAInterpreter } from './vba_interpreter';
import { DocumentEngineInstance } from '../types/wasm';

class MockDocumentEngine implements DocumentEngineInstance {
    private text: string = '';
    public styles: Array<{ position: number; length: number; property: string; value: string }> = [];

    insertText(position: number, text: string): void {
        this.text = this.text.slice(0, position) + text + this.text.slice(position);
    }

    deleteRange(position: number, length: number): void {
        this.text = this.text.slice(0, position) + this.text.slice(position + length);
    }

    getTextRange(position: number, length: number): string {
        return this.text.slice(position, position + length);
    }

    getFullText(): string {
        return this.text;
    }

    getLength(): number {
        return this.text.length;
    }

    applyStyle(position: number, length: number, property: string, value: string): void {
        this.styles.push({ position, length, property, value });
    }

    getStylesJson(): string {
        return JSON.stringify(this.styles);
    }

    regexSearchJson(): string {
        return '[]';
    }

    regexReplace(pattern: string, replacement: string): number {
        const regex = new RegExp(pattern, 'g');
        const matches = this.text.match(regex);
        this.text = this.text.replace(regex, replacement);
        return matches ? matches.length : 0;
    }

    undo(): void {}
    redo(): void {}
    canUndo(): boolean { return false; }
    canRedo(): boolean { return false; }
    getStats(): string {
        return JSON.stringify({ length: this.text.length, styles: this.styles.length });
    }
}

export function runVBATests(): boolean {
    const vbaMacro = `
        Sub FormatExecutiveReport()
            Dim header As String
            Dim i As Integer
            header = UCase(Trim("  quarterly financial summary  "))
            Selection.TypeText header
            Selection.Font.Bold = True

            For i = 1 To 2
                Selection.TypeText " [Section " & i & "]"
            Next i

            If True Then
                ActiveDocument.Content.Find.Text = "FINANCIAL"
                ActiveDocument.Content.Find.Replacement.Text = "PERFORMANCE"
                ActiveDocument.Content.Find.Execute
            End If
        End Sub
    `;

    const lexer = new VBALexer(vbaMacro);
    const tokens = lexer.tokenize();
    const parser = new VBAParser(tokens);
    const ast = parser.parse();

    const mockEngine = new MockDocumentEngine();
    const interpreter = new VBAInterpreter(mockEngine);
    interpreter.executeAST(ast);

    const expected = 'QUARTERLY PERFORMANCE SUMMARY [Section 1] [Section 2]';
    const actual = mockEngine.getFullText();

    if (actual !== expected) {
        throw new Error(`VBA Test Failed! Expected "${expected}", got "${actual}"`);
    }
    if (mockEngine.styles.length === 0 || mockEngine.styles[0].property !== 'bold') {
        throw new Error('VBA Test Failed! Expected bold style span to be applied.');
    }

    return true;
}
