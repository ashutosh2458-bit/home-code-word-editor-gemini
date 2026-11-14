export enum TokenType {
    Sub = 'SUB',
    End = 'END',
    Dim = 'DIM',
    As = 'AS',
    If = 'IF',
    Then = 'THEN',
    Else = 'ELSE',
    EndIf = 'END_IF',
    For = 'FOR',
    To = 'TO',
    Next = 'NEXT',
    Identifier = 'IDENTIFIER',
    String = 'STRING',
    Number = 'NUMBER',
    Dot = 'DOT',
    Assign = 'ASSIGN',
    LParen = 'L_PAREN',
    RParen = 'R_PAREN',
    Comma = 'COMMA',
    Plus = 'PLUS',
    Ampersand = 'AMPERSAND',
    Newline = 'NEWLINE',
    EOF = 'EOF'
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
}

export class VBALexer {
    private input: string;
    private position: number = 0;
    private line: number = 1;
    private length: number;

    constructor(input: string) {
        this.input = input;
        this.length = input.length;
    }

    public tokenize(): Token[] {
        const tokens: Token[] = [];
        while (this.position < this.length) {
            const char = this.input[this.position];

            if (char === '\r' || char === '\n') {
                tokens.push({ type: TokenType.Newline, value: '\n', line: this.line });
                if (char === '\r' && this.input[this.position + 1] === '\n') {
                    this.position++;
                }
                this.line++;
                this.position++;
                continue;
            }

            if (char === ' ' || char === '\t') {
                this.position++;
                continue;
            }

            if (char === "'") {
                while (this.position < this.length && this.input[this.position] !== '\n') {
                    this.position++;
                }
                continue;
            }

            const singleCharTokens: Record<string, TokenType> = {
                '.': TokenType.Dot,
                '=': TokenType.Assign,
                '(': TokenType.LParen,
                ')': TokenType.RParen,
                ',': TokenType.Comma,
                '+': TokenType.Plus,
                '&': TokenType.Ampersand
            };

            if (singleCharTokens[char]) {
                tokens.push({ type: singleCharTokens[char], value: char, line: this.line });
                this.position++;
                continue;
            }

            if (char === '"') {
                let strVal = '';
                this.position++;
                while (this.position < this.length && this.input[this.position] !== '"') {
                    strVal += this.input[this.position];
                    this.position++;
                }
                this.position++;
                tokens.push({ type: TokenType.String, value: strVal, line: this.line });
                continue;
            }

            if (this.isAlpha(char)) {
                let ident = '';
                while (this.position < this.length && this.isAlphaNumeric(this.input[this.position])) {
                    ident += this.input[this.position];
                    this.position++;
                }

                const keywords: Record<string, TokenType> = {
                    SUB: TokenType.Sub,
                    END: TokenType.End,
                    DIM: TokenType.Dim,
                    AS: TokenType.As,
                    IF: TokenType.If,
                    THEN: TokenType.Then,
                    ELSE: TokenType.Else,
                    FOR: TokenType.For,
                    TO: TokenType.To,
                    NEXT: TokenType.Next
                };

                const upper = ident.toUpperCase();
                tokens.push({
                    type: keywords[upper] ?? TokenType.Identifier,
                    value: ident,
                    line: this.line
                });
                continue;
            }

            if (this.isDigit(char)) {
                let num = '';
                while (this.position < this.length && this.isDigit(this.input[this.position])) {
                    num += this.input[this.position];
                    this.position++;
                }
                tokens.push({ type: TokenType.Number, value: num, line: this.line });
                continue;
            }

            this.position++;
        }

        tokens.push({ type: TokenType.EOF, value: '', line: this.line });
        return this.handleMultiWordKeywords(tokens);
    }

    private handleMultiWordKeywords(tokens: Token[]): Token[] {
        const result: Token[] = [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type === TokenType.End && i + 1 < tokens.length && tokens[i + 1].type === TokenType.If) {
                result.push({ type: TokenType.EndIf, value: 'End If', line: tokens[i].line });
                i++;
            } else {
                result.push(tokens[i]);
            }
        }
        return result;
    }

    private isAlpha(c: string): boolean {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    }

    private isDigit(c: string): boolean {
        return c >= '0' && c <= '9';
    }

    private isAlphaNumeric(c: string): boolean {
        return this.isAlpha(c) || this.isDigit(c);
    }
}
