import { Token, TokenType } from './vba_lexer';

export interface ASTNode {
    type: string;
}

export interface SubNode extends ASTNode {
    type: 'SubNode';
    name: string;
    body: ASTNode[];
}

export interface DimNode extends ASTNode {
    type: 'DimNode';
    varName: string;
    varType: string;
}

export interface AssignmentNode extends ASTNode {
    type: 'AssignmentNode';
    target: string[];
    expression: ExprNode;
}

export interface MethodCallNode extends ASTNode {
    type: 'MethodCallNode';
    target: string[];
    arguments: ExprNode[];
}

export interface IfNode extends ASTNode {
    type: 'IfNode';
    condition: ExprNode[];
    thenBody: ASTNode[];
    elseBody: ASTNode[];
}

export interface ForNode extends ASTNode {
    type: 'ForNode';
    iterator: string;
    start: ExprNode;
    end: ExprNode;
    body: ASTNode[];
}

export type ExprNode =
    | { kind: 'Literal'; value: string | number | boolean }
    | { kind: 'Variable'; name: string }
    | { kind: 'FunctionCall'; name: string; args: ExprNode[] }
    | { kind: 'BinaryOp'; op: string; left: ExprNode; right: ExprNode };

export class VBAParser {
    private tokens: Token[];
    private current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): ASTNode[] {
        const statements: ASTNode[] = [];
        while (!this.isAtEnd()) {
            if (this.match(TokenType.Newline)) continue;
            const stmt = this.parseStatement();
            if (stmt) statements.push(stmt);
        }
        return statements;
    }

    private parseStatement(): ASTNode | null {
        if (this.match(TokenType.Sub)) {
            const nameToken = this.consume(TokenType.Identifier, 'Expect Sub name.');
            if (this.match(TokenType.LParen)) {
                this.consume(TokenType.RParen, 'Expect ) after Sub parameters.');
            }
            this.consumeNewlines();
            const body: ASTNode[] = [];
            while (!this.isAtEnd() && !this.check(TokenType.End)) {
                if (this.match(TokenType.Newline)) continue;
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            }
            this.consume(TokenType.End, 'Expect End Sub.');
            this.match(TokenType.Sub);
            return { type: 'SubNode', name: nameToken.value, body } as SubNode;
        }

        if (this.match(TokenType.Dim)) {
            const varName = this.consume(TokenType.Identifier, 'Expect variable name.').value;
            let varType = 'Variant';
            if (this.match(TokenType.As)) {
                varType = this.consume(TokenType.Identifier, 'Expect type name after As.').value;
            }
            return { type: 'DimNode', varName, varType } as DimNode;
        }

        if (this.match(TokenType.If)) {
            const condition: ExprNode[] = [];
            while (!this.isAtEnd() && !this.check(TokenType.Then) && !this.check(TokenType.Newline)) {
                if (this.match(TokenType.Assign)) {
                    condition.push({ kind: 'Literal', value: '=' });
                } else {
                    condition.push(this.parsePrimaryExpression());
                }
            }
            this.consume(TokenType.Then, 'Expect Then after If condition.');
            this.consumeNewlines();
            const thenBody: ASTNode[] = [];
            const elseBody: ASTNode[] = [];
            let inElse = false;

            while (!this.isAtEnd() && !this.check(TokenType.EndIf)) {
                if (this.match(TokenType.Newline)) continue;
                if (this.match(TokenType.Else)) {
                    inElse = true;
                    continue;
                }
                const stmt = this.parseStatement();
                if (stmt) {
                    if (inElse) elseBody.push(stmt);
                    else thenBody.push(stmt);
                }
            }
            this.consume(TokenType.EndIf, 'Expect End If.');
            return { type: 'IfNode', condition, thenBody, elseBody } as IfNode;
        }

        if (this.match(TokenType.For)) {
            const iterator = this.consume(TokenType.Identifier, 'Expect loop counter variable.').value;
            this.consume(TokenType.Assign, 'Expect = in For loop.');
            const start = this.parseExpression();
            this.consume(TokenType.To, 'Expect To in For loop.');
            const end = this.parseExpression();
            this.consumeNewlines();

            const body: ASTNode[] = [];
            while (!this.isAtEnd() && !this.check(TokenType.Next)) {
                if (this.match(TokenType.Newline)) continue;
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            }
            this.consume(TokenType.Next, 'Expect Next to close For loop.');
            if (this.check(TokenType.Identifier)) {
                this.advance();
            }
            return { type: 'ForNode', iterator, start, end, body } as ForNode;
        }

        if (this.check(TokenType.Identifier)) {
            const target: string[] = [this.advance().value];
            while (this.match(TokenType.Dot)) {
                target.push(this.consume(TokenType.Identifier, 'Expect member after dot.').value);
            }

            if (this.match(TokenType.Assign)) {
                const expression = this.parseExpression();
                return { type: 'AssignmentNode', target, expression } as AssignmentNode;
            } else if (this.match(TokenType.LParen)) {
                const args: ExprNode[] = [];
                if (!this.check(TokenType.RParen)) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(TokenType.Comma));
                }
                this.consume(TokenType.RParen, 'Expect ) after arguments.');
                return { type: 'MethodCallNode', target, arguments: args } as MethodCallNode;
            } else {
                const args: ExprNode[] = [];
                if (!this.check(TokenType.Newline) && !this.isAtEnd()) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(TokenType.Comma));
                }
                return { type: 'MethodCallNode', target, arguments: args } as MethodCallNode;
            }
        }

        this.advance();
        return null;
    }

    private parseExpression(): ExprNode {
        let left = this.parsePrimaryExpression();
        while (this.match(TokenType.Plus) || this.match(TokenType.Ampersand)) {
            const op = this.previous().value;
            const right = this.parsePrimaryExpression();
            left = { kind: 'BinaryOp', op, left, right };
        }
        return left;
    }

    private parsePrimaryExpression(): ExprNode {
        if (this.match(TokenType.String)) {
            return { kind: 'Literal', value: this.previous().value };
        }
        if (this.match(TokenType.Number)) {
            return { kind: 'Literal', value: Number(this.previous().value) };
        }
        if (this.check(TokenType.Identifier)) {
            const name = this.advance().value;
            const upper = name.toUpperCase();
            if (upper === 'TRUE') return { kind: 'Literal', value: true };
            if (upper === 'FALSE') return { kind: 'Literal', value: false };

            if (this.match(TokenType.LParen)) {
                const args: ExprNode[] = [];
                if (!this.check(TokenType.RParen)) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(TokenType.Comma));
                }
                this.consume(TokenType.RParen, 'Expect ) after function call.');
                return { kind: 'FunctionCall', name: upper, args };
            }

            return { kind: 'Variable', name };
        }
        return { kind: 'Literal', value: '' };
    }

    private consumeNewlines(): void {
        while (this.match(TokenType.Newline)) {}
    }

    private match(type: TokenType): boolean {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        throw new Error(`Parser Error: ${message} at line ${this.peek().line}`);
    }
}
