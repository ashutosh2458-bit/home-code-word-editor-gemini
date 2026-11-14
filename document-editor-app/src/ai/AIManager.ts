export interface ReadabilityMetrics {
    flesch_reading_ease: number;
    grade_level: number;
    reading_time_minutes: number;
    syllable_count: number;
    word_count: number;
    sentence_count: number;
}

export interface KeywordFrequency {
    word: string;
    frequency: number;
}

export interface PassiveVoiceMatch {
    sentence_index: number;
    text: string;
}

export interface ToneSuggestion {
    type: 'formal_tone' | 'concise_tone';
    original: string;
    replacement: string;
    reason: string;
}

export interface NLPAnalysisResult {
    readability: ReadabilityMetrics;
    keywords: KeywordFrequency[];
    passive_voice: PassiveVoiceMatch[];
    tone_suggestions: ToneSuggestion[];
    summary: string;
}

export class AIManager {
    private worker: Worker;
    private requestIdCounter: number = 0;
    private pendingRequests: Map<number, { resolve: (val: NLPAnalysisResult) => void; reject: (err: Error) => void }> = new Map();

    constructor(worker?: Worker) {
        this.worker = worker ?? new Worker(new URL('./ai_worker_runner.ts', import.meta.url));
        this.worker.onmessage = (event: MessageEvent) => {
            const { id, success, result, error } = event.data;
            const pending = this.pendingRequests.get(id);
            if (pending) {
                if (success) {
                    pending.resolve(result as NLPAnalysisResult);
                } else {
                    pending.reject(new Error(error));
                }
                this.pendingRequests.delete(id);
            }
        };
    }

    public analyzeDocument(text: string): Promise<NLPAnalysisResult> {
        const id = ++this.requestIdCounter;
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ id, text });
        });
    }

    public terminate(): void {
        this.worker.terminate();
        this.pendingRequests.clear();
    }
}
