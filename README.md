[![Build Status](https://travis-ci.org/chikeichan/Trio.svg?branch=dev)](https://travis-ci.org/chikeichan/Trio)
# Trio

## Main Classes
- Factory reference Resource(id/s)
- Service defines interactions between factory and component
- Component renders UI/UX, register custom element

## Singletons
- Resources interacts with BE and cache results.
- Modules controls import and export of js files, cache results.
- Stylizer compiles CSS, stores variable and mixins
- Renderer compiles HTML, stores templates and helper funnctions

## Design principles
- Less setting and getting
- Small, reusable components
- Less subclassing
- Event-based Data-binding
