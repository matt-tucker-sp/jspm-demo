/* */ 
"use strict";
var os = require('os');
var convertSourceMap = require('convert-source-map');
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var SourceMapGenerator = require('source-map').SourceMapGenerator;
var stableSort = require('stable');
function SourceMapper(src, nodePositions, fragments, inFile, sourceRoot) {
  this.generator = new SourceMapGenerator({sourceRoot: sourceRoot});
  this.src = src;
  this.nodePositions = stableSort(nodePositions, compareLoc);
  this.fragments = stableSort(fragments, function(a, b) {
    return a.start - b.start;
  });
  this.inFile = inFile;
  this.generator.setSourceContent(this.inFile, src);
}
SourceMapper.prototype.calculateMappings = function() {
  var self = this;
  var lineOffset = 0;
  var columnOffset = 0;
  var currentLine = 0;
  var frag = 0;
  var pos = 0;
  while (pos < self.nodePositions.length) {
    while (frag < self.fragments.length && compareLoc(self.fragments[frag].loc.start, self.nodePositions[pos]) < 1) {
      var fragmentLines = self.fragments[frag].str.split("\n");
      var addedNewlines = fragmentLines.length - 1;
      var replacedLines = self.fragments[frag].loc.end.line - self.fragments[frag].loc.start.line;
      var replacedColumns = self.fragments[frag].loc.end.column - self.fragments[frag].loc.start.column;
      lineOffset = lineOffset + addedNewlines - replacedLines;
      columnOffset = fragmentLines.length > 1 ? fragmentLines[fragmentLines.length - 1].length - self.fragments[frag].loc.end.column : columnOffset + self.fragments[frag].str.length - replacedColumns;
      currentLine = self.fragments[frag].loc.end.line;
      while (pos < self.nodePositions.length && compareLoc(self.fragments[frag].loc.end, self.nodePositions[pos]) > 0) {
        ++pos;
      }
      ++frag;
    }
    if (pos < self.nodePositions.length) {
      if (currentLine < self.nodePositions[pos].line)
        columnOffset = 0;
      self.addMapping(self.nodePositions[pos], {
        line: self.nodePositions[pos].line + lineOffset,
        column: self.nodePositions[pos].column + columnOffset
      });
      ++pos;
    }
  }
};
SourceMapper.prototype.addMapping = function(input, output) {
  this.generator.addMapping({
    source: this.inFile,
    original: input,
    generated: output
  });
};
SourceMapper.prototype.applySourceMap = function(consumer) {
  this.generator.applySourceMap(consumer);
};
SourceMapper.prototype.generate = function() {
  return this.generator.toString();
};
function compareLoc(a, b) {
  return (a.line - b.line) || (a.column - b.column);
}
module.exports = function generateSourcemap(result, src, nodePositions, fragments, mapOpts) {
  var existingMap = convertSourceMap.fromSource(src);
  var existingMapObject = existingMap && existingMap.toObject();
  var inFile = (existingMapObject && existingMapObject.file) || mapOpts.inFile || "source.js";
  var sourceRoot = (existingMapObject && existingMapObject.sourceRoot) || mapOpts.sourceRoot;
  src = convertSourceMap.removeMapFileComments(src);
  var mapper = new SourceMapper(src, nodePositions, fragments, inFile, sourceRoot);
  mapper.calculateMappings();
  if (mapOpts.inline) {
    if (existingMapObject)
      mapper.applySourceMap(new SourceMapConsumer(existingMapObject));
    result.src = convertSourceMap.removeMapFileComments(result.src) + os.EOL + convertSourceMap.fromJSON(mapper.generate()).toComment();
  } else {
    result.map = mapper.generate();
  }
};
