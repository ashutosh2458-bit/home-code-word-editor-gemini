import {
    ASTNode,
    AssignmentNode,
    MethodCallNode,
    IfNode,
    ForNode,
    SubNode,
    DimNode,
    ExprNode
} from './vba_parser';
import { DocumentEngineInstance } from '../types/wasm';
import { CommandRegistry } from '../core/CommandRegistry';

export class VBAInterpreter {
    private engine: DocumentEngineInstance;
    private registry?: CommandRegistry;
    private maxSteps: number;
    private stepCount: number = 0;
    private variables: Map<string, any> = new Map();
    private findParams: { findText: string; replaceWith: string } = { findText: '', replaceWith: '' };

    constructor(engine: DocumentEngineInstance, registry?: CommandRegistry, maxSteps: number = 10000) {
        this.engine = engine;
        this.registry = registry;
        this.maxSteps = maxSteps;
    }

    public executeAST(ast: ASTNode[]): void {
        this.stepCount = 0;
        this.variables.clear();
        for (const node of ast) {
            this.executeNode(node);
        }
    }

    private executeNode(node: ASTNode): void {
        this.checkStepLimit();

        switch (node.type) {
            case 'SubNode': {
                const sub = node as SubNode;
                for (const child of sub.body) {
                    this.executeNode(child);
                }
                break;
            }
            case 'DimNode': {
                const dim = node as DimNode;
                this.variables.set(dim.varName.toLowerCase(), dim.varType === 'Integer' ? 0 : '');
                break;
            }
            case 'AssignmentNode': {
                const assign = node as AssignmentNode;
                const val = this.evaluateExpr(assign.expression);
                this.handleAssignment(assign.target, val);
                break;
            }
            case 'MethodCallNode': {
                const call = node as MethodCallNode;
                const evaluatedArgs = call.arguments.map(arg => this.evaluateExpr(arg));
                this.handleMethodCall(call.target, evaluatedArgs);
                break;
            }
            case 'IfNode': {
                const ifNode = node as IfNode;
                if (this.evaluateCondition(ifNode.condition)) {
                    for (const child of ifNode.thenBody) {
                        this.executeNode(child);
                    }
                } else {
                    for (const child of ifNode.elseBody) {
                        this.executeNode(child);
                    }
                }
                break;
            }
            case 'ForNode': {
                const forNode = node as ForNode;
                const startVal = Number(this.evaluateExpr(forNode.start));
                const endVal = Number(this.evaluateExpr(forNode.end));
                const varKey = forNode.iterator.toLowerCase();

                for (let i = startVal; i <= endVal; i++) {
                    this.checkStepLimit();
                    this.variables.set(varKey, i);
                    for (const child of forNode.body) {
                        this.executeNode(child);
                    }
                }
                break;
            }
        }
    }

    private evaluateExpr(expr: ExprNode): any {
        switch (expr.kind) {
            case 'Literal':
                return expr.value;
            case 'Variable':
                return this.variables.get(expr.name.toLowerCase()) ?? '';
            case 'BinaryOp': {
                const l = this.evaluateExpr(expr.left);
                const r = this.evaluateExpr(expr.right);
                if (expr.op === '&') return String(l) + String(r);
                if (expr.op === '+') {
                    return typeof l === 'number' && typeof r === 'number' ? l + r : String(l) + String(r);
                }
                return '';
            }
            case 'FunctionCall': {
                const args = expr.args.map(a => this.evaluateExpr(a));
                switch (expr.name) {
                    case 'UCASE':
                        return String(args[0] ?? '').toUpperCase();
                    case 'LCASE':
                        return String(args[0] ?? '').toLowerCase();
                    case 'TRIM':
                        return String(args[0] ?? '').trim();
                    case 'REPLACE':
                        return String(args[0] ?? '').split(String(args[1] ?? '')).join(String(args[2] ?? ''));
                    default:
                        return '';
                }
            }
        }
    }

    private handleAssignment(target: string[], value: any): void {
        if (target.length === 1) {
            this.variables.set(target[0].toLowerCase(), value);
            return;
        }

        const path = target.map(t => t.toLowerCase()).join('.');
        if (path === 'selection.font.bold') {
            this.registry?.getCommand('format.bold')?.execute({ engine: this.engine });
            if (!this.registry) {
                this.engine.applyStyle(0, this.engine.getLength(), 'bold', value ? 'true' : 'false');
            }
        } else if (path === 'selection.font.italic') {
            this.engine.applyStyle(0, this.engine.getLength(), 'italic', value ? 'true' : 'false');
        } else if (path === 'selection.font.color') {
            this.engine.applyStyle(0, this.engine.getLength(), 'color', String(value));
        } else if (path === 'activedocument.content.find.text') {
            this.findParams.findText = String(value);
        } else if (path === 'activedocument.content.find.replacement.text') {
            this.findParams.replaceWith = String(value);
        }
    }

    private handleMethodCall(target: string[], args: any[]): void {
        const path = target.map(t => t.toLowerCase()).join('.');
        if (path === 'selection.typetext' && args.length > 0) {
            this.engine.insertText(this.engine.getLength(), String(args[0]));
        } else if (path === 'activedocument.content.find.execute') {
            if (this.findParams.findText) {
                this.engine.regexReplace(this.findParams.findText, this.findParams.replaceWith);
            }
        }
    }

    private evaluateCondition(condNodes: ExprNode[]): boolean {
        if (condNodes.length === 1) {
            return Boolean(this.evaluateExpr(condNodes[0]));
        }
        if (condNodes.length === 3 && condNodes[1].kind === 'Literal' && condNodes[1].value === '=') {
            return this.evaluateExpr(condNodes[0]) == this.evaluateExpr(condNodes[2]);
        }
        return false;
    }

    private checkStepLimit(): void {
        this.stepCount++;
        if (this.stepCount > this.maxSteps) {
            throw new Error(`Macro execution halted: Exceeded ${this.maxSteps} instruction limit.`);
        }
    }
}
