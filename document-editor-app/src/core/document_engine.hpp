#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <regex>

namespace DocEngine {

enum class BufferType { Original, Add };

struct Piece {
    BufferType buffer_type;
    size_t start;
    size_t length;
};

struct StyleSpan {
    size_t start;
    size_t length;
    bool bold = false;
    bool italic = false;
    std::string font_family = "Inter";
    std::string font_color = "#000000";
    std::string alignment = "left";
};

struct SearchResult {
    size_t start;
    size_t length;
};

class Command; // Forward declaration for Command pattern (Undo/Redo tree)

class DocumentEngine {
public:
    DocumentEngine();
    explicit DocumentEngine(const std::string& initial_text);
    ~DocumentEngine() = default;

    // Public API (records commands for undo/redo)
    void insertText(size_t position, const std::string& text);
    void deleteRange(size_t position, size_t length);
    void applyStyle(size_t position, size_t length, const std::string& property, const std::string& value);

    // Raw buffer mutations used internally by Command objects
    void rawInsertText(size_t position, const std::string& text);
    void rawDeleteRange(size_t position, size_t length);
    void rawApplyStyle(const StyleSpan& span);
    void removeLastStyle();

    // Query Operations
    std::string getTextRange(size_t position, size_t length) const;
    std::string getFullText() const;
    size_t getLength() const;
    std::vector<StyleSpan> getStylesInRange(size_t position, size_t length) const;
    std::string getStylesJson(size_t position, size_t length) const;

    // Search & Replace
    std::vector<SearchResult> regexSearch(const std::string& pattern) const;
    std::string regexSearchJson(const std::string& pattern) const;
    size_t regexReplace(const std::string& pattern, const std::string& replacement);

    // Undo / Redo Command Tree
    void undo();
    void redo();
    bool canUndo() const;
    bool canRedo() const;

    // Telemetry / Stats
    std::string getStatsJson() const;

private:
    std::string original_buffer_;
    std::string add_buffer_;
    std::vector<Piece> pieces_;
    std::vector<StyleSpan> styles_;

    std::vector<std::unique_ptr<Command>> undo_stack_;
    std::vector<std::unique_ptr<Command>> redo_stack_;

    void executeCommand(std::unique_ptr<Command> cmd);
    size_t findPieceIndex(size_t char_offset, size_t& out_piece_offset) const;
    static std::string escapeJson(const std::string& s);
};

} // namespace DocEngine
