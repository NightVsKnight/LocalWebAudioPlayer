cmake_minimum_required(VERSION 3.16)

project(QtWebEnginePrototype VERSION 0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 6.4 COMPONENTS Widgets WebEngineWidgets WebChannel REQUIRED)

qt_add_executable(QtWebEnginePrototype
  main.cpp
)

target_link_libraries(QtWebEnginePrototype
  PRIVATE
    Qt6::Widgets
    Qt6::WebEngineWidgets
    Qt6::WebChannel
)

if(APPLE)
  set(_qt_sdk "${CMAKE_OSX_SYSROOT}")
  if(_qt_sdk AND EXISTS "${_qt_sdk}/usr/include/c++/v1")
    target_include_directories(QtWebEnginePrototype
      SYSTEM BEFORE
      PRIVATE
        "${_qt_sdk}/usr/include/c++/v1"
    )
  endif()
endif()

configure_file(index.html index.html COPYONLY)
