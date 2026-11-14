import json
import re
from collections import Counter


def count_syllables(word: str) -> int:
    word = word.lower()
    if len(word) <= 3:
        return 1
    word = re.sub(r'(?:[^laeiouy]|ed|es|e)$', '', word)
    word = re.sub(r'^y', '', word)
    syllables = len(re.findall(r'[aeiouy]{1,2}', word))
    return max(1, syllables)


def analyze_readability(text: str) -> dict:
    if not text.strip():
        return {
            "flesch_reading_ease": 0.0,
            "grade_level": 0.0,
            "reading_time_minutes": 0.0,
            "syllable_count": 0,
            "word_count": 0,
            "sentence_count": 0
        }

    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    sentence_count = max(1, len(sentences))

    words = re.findall(r'\b[a-zA-Z]+\b', text)
    word_count = max(1, len(words))

    syllable_count = sum(count_syllables(w) for w in words)

    fre = 206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (syllable_count / word_count)
    fkgl = 0.39 * (word_count / sentence_count) + 11.8 * (syllable_count / word_count) - 15.59
    reading_time = word_count / 200.0

    return {
        "flesch_reading_ease": round(fre, 2),
        "grade_level": round(fkgl, 2),
        "reading_time_minutes": round(reading_time, 2),
        "syllable_count": syllable_count,
        "word_count": word_count,
        "sentence_count": sentence_count
    }


def extract_keywords(text: str, top_n: int = 8) -> list:
    stop_words = {
        "the", "and", "to", "a", "of", "in", "is", "that", "it", "for", "on",
        "with", "as", "this", "was", "at", "by", "an", "be", "from", "or",
        "are", "which", "have", "has", "had", "not", "but", "can", "will"
    }
    words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', text) if w.lower() not in stop_words]
    counts = Counter(words)
    return [{"word": word, "frequency": freq} for word, freq in counts.most_common(top_n)]


def detect_passive_voice(text: str) -> list:
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    passive_pattern = re.compile(
        r'\b(is|are|was|were|been|be|being)\s+([a-zA-Z]+ed|ridden|written|taken|driven|chosen|hidden|fallen|grown|known|shown|thrown)\b',
        re.IGNORECASE
    )

    matches = []
    for idx, sentence in enumerate(sentences):
        if passive_pattern.search(sentence):
            matches.append({"sentence_index": idx, "text": sentence})
    return matches


def generate_tone_suggestions(text: str) -> list:
    suggestions = []
    informal_markers = {
        "gonna": "going to",
        "wanna": "want to",
        "kids": "children",
        "stuff": "materials",
        "a lot of": "numerous",
        "really good": "exceptional"
    }
    wordy_phrases = {
        "in order to": "to",
        "due to the fact that": "because",
        "at this point in time": "now",
        "in the event that": "if"
    }

    lower_text = text.lower()
    for informal, formal in informal_markers.items():
        if informal in lower_text:
            suggestions.append({
                "type": "formal_tone",
                "original": informal,
                "replacement": formal,
                "reason": "Use formal register for executive or academic documents."
            })

    for wordy, concise in wordy_phrases.items():
        if wordy in lower_text:
            suggestions.append({
                "type": "concise_tone",
                "original": wordy,
                "replacement": concise,
                "reason": "Tighten phrasing for conciseness."
            })

    return suggestions


def summarize_text(text: str, max_sentences: int = 3) -> str:
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    if len(sentences) <= max_sentences:
        return text

    stop_words = {"the", "and", "to", "a", "of", "in", "is", "that", "it", "for", "on", "with", "as", "this"}
    word_freq = Counter()
    for s in sentences:
        words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', s) if w.lower() not in stop_words]
        word_freq.update(words)

    scored_sentences = []
    for idx, s in enumerate(sentences):
        words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', s)]
        score = sum(word_freq[w] for w in words if w in word_freq) / max(1, len(words))
        scored_sentences.append((score, idx, s))

    scored_sentences.sort(key=lambda x: (x[0], -x[1]), reverse=True)
    top_selected = sorted(scored_sentences[:max_sentences], key=lambda x: x[1])
    return ". ".join([s[2] for s in top_selected]) + "."


def process_document(payload_json: str) -> str:
    data = json.loads(payload_json)
    text = data.get("text", "")

    result = {
        "readability": analyze_readability(text),
        "keywords": extract_keywords(text),
        "passive_voice": detect_passive_voice(text),
        "tone_suggestions": generate_tone_suggestions(text),
        "summary": summarize_text(text)
    }
    return json.dumps(result)
