cmake_minimum_required(VERSION 3.20)
project(DocumentCore CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -flto -Wall -Wextra")

# Source files
set(CORE_SOURCES
    src/core/document_engine.cpp
    wasm/binding.cpp
)

add_executable(document_core ${CORE_SOURCES})

# Emscripten specific link flags
target_link_options(document_core PRIVATE
    -lembind
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sALLOW_MEMORY_GROWTH=1
    -sEXPORTED_RUNTIME_METHODS=['ccall','cwrap']
    -sENVIRONMENT=web,worker
    -flto
)

# Output directory and naming
set_target_properties(document_core PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/public/wasm"
    OUTPUT_NAME "document_core"
    SUFFIX ".js"
)
