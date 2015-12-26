[![Build Status](https://travis-ci.org/trio-dev/Trio.svg?branch=dev)](https://travis-ci.org/trio-dev/Trio)
[![Coverage Status](https://coveralls.io/repos/trio-dev/Trio/badge.svg?branch=dev&service=github)](https://coveralls.io/github/trio-dev/Trio?branch=dev)
[![Stories in Ready](https://badge.waffle.io/trio-dev/Trio.svg?label=ready&title=Ready)](http://waffle.io/trio-dev/Trio)
# Trio

A framework for building structure, efficient application with web component.

## Documentation
See Trio's Documentation in the [Wiki](https://github.com/trio-dev/Trio/wiki)

## Using Trio
You can acquire Trio using npm:
```bash
npm install trio
```
or simply download it from [here][files] and insert it as a script tag.
[files]: https://github.com/trio-dev/Trio/tree/release-0.2.0/dist

## Developing for Trio
### Installing dependencies (from within root directory)
```bash
npm install
```

### Testing
```bash
gulp test
```

### Building
```bash
# Build once
gulp build --env [development or production]

# Build continuously
gulp watch --env [development or production]
```
