#include <emscripten/bind.h>
#include "../src/core/document_engine.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(DocumentEngineModule) {
    class_<DocEngine::DocumentEngine>("DocumentEngine")
        .constructor<>()
        .constructor<std::string>()
        .function("insertText", &DocEngine::DocumentEngine::insertText)
        .function("deleteRange", &DocEngine::DocumentEngine::deleteRange)
        .function("getTextRange", &DocEngine::DocumentEngine::getTextRange)
        .function("getFullText", &DocEngine::DocumentEngine::getFullText)
        .function("getLength", &DocEngine::DocumentEngine::getLength)
        .function("applyStyle", &DocEngine::DocumentEngine::applyStyle)
        .function("getStylesJson", &DocEngine::DocumentEngine::getStylesJson)
        .function("regexSearchJson", &DocEngine::DocumentEngine::regexSearchJson)
        .function("regexReplace", &DocEngine::DocumentEngine::regexReplace)
        .function("undo", &DocEngine::DocumentEngine::undo)
        .function("redo", &DocEngine::DocumentEngine::redo)
        .function("canUndo", &DocEngine::DocumentEngine::canUndo)
        .function("canRedo", &DocEngine::DocumentEngine::canRedo)
        .function("getStats", &DocEngine::DocumentEngine::getStatsJson);
}
