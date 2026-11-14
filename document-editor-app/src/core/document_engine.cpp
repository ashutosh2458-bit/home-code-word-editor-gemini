#include "document_engine.hpp"
#include <sstream>
#include <algorithm>

namespace DocEngine {

class Command {
public:
    virtual ~Command() = default;
    virtual void execute(DocumentEngine& engine) = 0;
    virtual void undo(DocumentEngine& engine) = 0;
};

class InsertCommand : public Command {
    size_t position_;
    std::string text_;
public:
    InsertCommand(size_t pos, std::string text) : position_(pos), text_(std::move(text)) {}
    void execute(DocumentEngine& engine) override {
        engine.rawInsertText(position_, text_);
    }
    void undo(DocumentEngine& engine) override {
        engine.rawDeleteRange(position_, text_.length());
    }
};

class DeleteCommand : public Command {
    size_t position_;
    std::string deleted_text_;
public:
    DeleteCommand(size_t pos, std::string text) : position_(pos), deleted_text_(std::move(text)) {}
    void execute(DocumentEngine& engine) override {
        engine.rawDeleteRange(position_, deleted_text_.length());
    }
    void undo(DocumentEngine& engine) override {
        engine.rawInsertText(position_, deleted_text_);
    }
};

class StyleCommand : public Command {
    StyleSpan span_;
public:
    explicit StyleCommand(StyleSpan span) : span_(std::move(span)) {}
    void execute(DocumentEngine& engine) override {
        engine.rawApplyStyle(span_);
    }
    void undo(DocumentEngine& engine) override {
        engine.removeLastStyle();
    }
};

DocumentEngine::DocumentEngine() {
    original_buffer_ = "";
}

DocumentEngine::DocumentEngine(const std::string& initial_text)
    : original_buffer_(initial_text) {
    if (!initial_text.empty()) {
        pieces_.push_back(Piece{BufferType::Original, 0, initial_text.length()});
    }
}

size_t DocumentEngine::getLength() const {
    size_t total = 0;
    for (const auto& p : pieces_) {
        total += p.length;
    }
    return total;
}

std::string DocumentEngine::getFullText() const {
    return getTextRange(0, getLength());
}

std::string DocumentEngine::getTextRange(size_t position, size_t length) const {
    size_t total_len = getLength();
    if (length == 0 || position >= total_len) return "";

    size_t clamped_len = std::min(length, total_len - position);
    std::string result;
    result.reserve(clamped_len);

    size_t current_pos = 0;
    size_t chars_collected = 0;

    for (const auto& p : pieces_) {
        if (chars_collected >= clamped_len) break;
        size_t p_len = p.length;

        if (position < current_pos + p_len) {
            size_t offset_in_piece = (position > current_pos) ? (position - current_pos) : 0;
            size_t avail_in_piece = p_len - offset_in_piece;
            size_t take = std::min(avail_in_piece, clamped_len - chars_collected);

            const std::string& buf = (p.buffer_type == BufferType::Original) ? original_buffer_ : add_buffer_;
            result.append(buf, p.start + offset_in_piece, take);
            chars_collected += take;
        }
        current_pos += p_len;
    }
    return result;
}

size_t DocumentEngine::findPieceIndex(size_t char_offset, size_t& out_piece_offset) const {
    size_t accumulated = 0;
    for (size_t i = 0; i < pieces_.size(); ++i) {
        if (accumulated + pieces_[i].length >= char_offset) {
            out_piece_offset = char_offset - accumulated;
            return i;
        }
        accumulated += pieces_[i].length;
    }
    out_piece_offset = pieces_.empty() ? 0 : pieces_.back().length;
    return pieces_.empty() ? 0 : pieces_.size() - 1;
}

void DocumentEngine::insertText(size_t position, const std::string& text) {
    if (text.empty()) return;
    size_t clamped_pos = std::min(position, getLength());
    executeCommand(std::make_unique<InsertCommand>(clamped_pos, text));
}

void DocumentEngine::deleteRange(size_t position, size_t length) {
    size_t total_len = getLength();
    if (length == 0 || position >= total_len) return;
    size_t clamped_len = std::min(length, total_len - position);
    std::string target_text = getTextRange(position, clamped_len);
    executeCommand(std::make_unique<DeleteCommand>(position, std::move(target_text)));
}

void DocumentEngine::applyStyle(size_t position, size_t length, const std::string& property, const std::string& value) {
    StyleSpan span{position, length};
    if (property == "bold") span.bold = (value == "true");
    else if (property == "italic") span.italic = (value == "true");
    else if (property == "font") span.font_family = value;
    else if (property == "color") span.font_color = value;
    else if (property == "alignment") span.alignment = value;

    executeCommand(std::make_unique<StyleCommand>(std::move(span)));
}

void DocumentEngine::rawInsertText(size_t position, const std::string& text) {
    if (text.empty()) return;

    size_t add_start = add_buffer_.length();
    add_buffer_.append(text);
    Piece new_piece{BufferType::Add, add_start, text.length()};

    if (pieces_.empty()) {
        pieces_.push_back(new_piece);
        return;
    }

    size_t piece_offset = 0;
    size_t idx = findPieceIndex(position, piece_offset);

    if (piece_offset == 0) {
        pieces_.insert(pieces_.begin() + static_cast<ptrdiff_t>(idx), new_piece);
    } else if (piece_offset == pieces_[idx].length) {
        pieces_.insert(pieces_.begin() + static_cast<ptrdiff_t>(idx + 1), new_piece);
    } else {
        Piece target = pieces_[idx];
        pieces_[idx] = Piece{target.buffer_type, target.start, piece_offset};
        Piece right_piece{target.buffer_type, target.start + piece_offset, target.length - piece_offset};

        pieces_.insert(pieces_.begin() + static_cast<ptrdiff_t>(idx + 1), new_piece);
        pieces_.insert(pieces_.begin() + static_cast<ptrdiff_t>(idx + 2), right_piece);
    }
}

void DocumentEngine::rawDeleteRange(size_t position, size_t length) {
    if (length == 0 || position >= getLength()) return;

    size_t remaining_to_delete = length;
    size_t piece_offset = 0;
    size_t idx = findPieceIndex(position, piece_offset);

    while (remaining_to_delete > 0 && idx < pieces_.size()) {
        Piece& p = pieces_[idx];
        size_t available = p.length - piece_offset;

        if (remaining_to_delete >= available) {
            p.length = piece_offset;
            remaining_to_delete -= available;
            if (p.length == 0) {
                pieces_.erase(pieces_.begin() + static_cast<ptrdiff_t>(idx));
            } else {
                idx++;
            }
            piece_offset = 0;
        } else {
            Piece right_piece{
                p.buffer_type,
                p.start + piece_offset + remaining_to_delete,
                p.length - piece_offset - remaining_to_delete
            };
            p.length = piece_offset;
            if (p.length == 0) {
                pieces_[idx] = right_piece;
            } else {
                pieces_.insert(pieces_.begin() + static_cast<ptrdiff_t>(idx + 1), right_piece);
            }
            break;
        }
    }
}

void DocumentEngine::rawApplyStyle(const StyleSpan& span) {
    styles_.push_back(span);
}

void DocumentEngine::removeLastStyle() {
    if (!styles_.empty()) {
        styles_.pop_back();
    }
}

std::vector<StyleSpan> DocumentEngine::getStylesInRange(size_t position, size_t length) const {
    std::vector<StyleSpan> matches;
    for (const auto& s : styles_) {
        if (!(s.start + s.length <= position || s.start >= position + length)) {
            matches.push_back(s);
        }
    }
    return matches;
}

std::string DocumentEngine::getStylesJson(size_t position, size_t length) const {
    auto matches = getStylesInRange(position, length);
    std::ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < matches.size(); ++i) {
        const auto& s = matches[i];
        if (i > 0) ss << ",";
        ss << "{\"start\":" << s.start
           << ",\"length\":" << s.length
           << ",\"bold\":" << (s.bold ? "true" : "false")
           << ",\"italic\":" << (s.italic ? "true" : "false")
           << ",\"fontFamily\":\"" << escapeJson(s.font_family) << "\""
           << ",\"fontColor\":\"" << escapeJson(s.font_color) << "\""
           << ",\"alignment\":\"" << escapeJson(s.alignment) << "\"}";
    }
    ss << "]";
    return ss.str();
}

std::vector<SearchResult> DocumentEngine::regexSearch(const std::string& pattern) const {
    std::vector<SearchResult> results;
    std::string full = getFullText();
    try {
        std::regex rx(pattern);
        auto begin = std::sregex_iterator(full.begin(), full.end(), rx);
        auto end = std::sregex_iterator();
        for (auto it = begin; it != end; ++it) {
            results.push_back(SearchResult{
                static_cast<size_t>(it->position()),
                static_cast<size_t>(it->length())
            });
        }
    } catch (...) {}
    return results;
}

std::string DocumentEngine::regexSearchJson(const std::string& pattern) const {
    auto results = regexSearch(pattern);
    std::ostringstream ss;
    ss << "[";
    for (size_t i = 0; i < results.size(); ++i) {
        if (i > 0) ss << ",";
        ss << "{\"start\":" << results[i].start << ",\"length\":" << results[i].length << "}";
    }
    ss << "]";
    return ss.str();
}

size_t DocumentEngine::regexReplace(const std::string& pattern, const std::string& replacement) {
    std::string full = getFullText();
    try {
        std::regex rx(pattern);
        auto matches = regexSearch(pattern);
        if (matches.empty()) return 0;

        std::string new_text = std::regex_replace(full, rx, replacement);
        rawDeleteRange(0, full.length());
        rawInsertText(0, new_text);
        return matches.size();
    } catch (...) {
        return 0;
    }
}

void DocumentEngine::executeCommand(std::unique_ptr<Command> cmd) {
    cmd->execute(*this);
    undo_stack_.push_back(std::move(cmd));
    redo_stack_.clear();
}

void DocumentEngine::undo() {
    if (!canUndo()) return;
    auto cmd = std::move(undo_stack_.back());
    undo_stack_.pop_back();
    cmd->undo(*this);
    redo_stack_.push_back(std::move(cmd));
}

void DocumentEngine::redo() {
    if (!canRedo()) return;
    auto cmd = std::move(redo_stack_.back());
    redo_stack_.pop_back();
    cmd->execute(*this);
    undo_stack_.push_back(std::move(cmd));
}

bool DocumentEngine::canUndo() const { return !undo_stack_.empty(); }
bool DocumentEngine::canRedo() const { return !redo_stack_.empty(); }

std::string DocumentEngine::getStatsJson() const {
    std::ostringstream ss;
    ss << "{\"length\":" << getLength()
       << ",\"pieces\":" << pieces_.size()
       << ",\"styles\":" << styles_.size()
       << ",\"undoStack\":" << undo_stack_.size()
       << ",\"redoStack\":" << redo_stack_.size() << "}";
    return ss.str();
}

std::string DocumentEngine::escapeJson(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        switch (c) {
            case '"': o << "\\\""; break;
            case '\\': o << "\\\\"; break;
            case '\b': o << "\\b"; break;
            case '\f': o << "\\f"; break;
            case '\n': o << "\\n"; break;
            case '\r': o << "\\r"; break;
            case '\t': o << "\\t"; break;
            default: o << c; break;
        }
    }
    return o.str();
}

} // namespace DocEngine
