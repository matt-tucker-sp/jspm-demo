/* */ 
"use strict";
const assert = require('assert');
const traverse = require('ordered-ast-traverse');
const is = require('simple-is');
module.exports = Lut;
function Lut(ast, src) {
  assert(this instanceof Lut);
  const sparseBegins = new Array(src.length);
  const begins = [];
  const sparseEnds = new Array(src.length);
  const ends = [];
  let p = 0;
  const t0 = Date.now();
  traverse(ast, {pre: function(node) {
      if (node.type === "Program") {
        return;
      }
      p = node.range[0];
      if (!sparseBegins[p]) {
        sparseBegins[p] = node;
      }
      p = node.range[1];
      if (!sparseEnds[p]) {
        sparseEnds[p] = node;
      }
    }});
  for (let i in sparseBegins) {
    begins.push(sparseBegins[i]);
  }
  for (let i in sparseEnds) {
    ends.push(sparseEnds[i]);
  }
  const t1 = Date.now();
  this.begins = begins;
  this.ends = ends;
}
Lut.prototype.findNodeFromPos = findNodeFromPos;
Lut.prototype.findNodeBeforePos = findNodeBeforePos;
function findNodeFromPos(pos) {
  const lut = this.begins;
  assert(is.finitenumber(pos) && pos >= 0);
  let left = 0;
  let right = lut.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    assert(mid >= 0 && mid < lut.length);
    if (pos > lut[mid].range[0]) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  if (left > right) {
    assert(last(lut).range[0] < pos);
    return null;
  }
  const found = left;
  const foundPos = lut[found].range[0];
  assert(foundPos >= pos);
  if (found >= 1) {
    const prevPos = lut[found - 1].range[0];
    assert(prevPos < pos);
  }
  return lut[found];
}
function findNodeBeforePos(pos) {
  const lut = this.ends;
  assert(is.finitenumber(pos) && pos >= 0);
  let left = 0;
  let right = lut.length - 1;
  while (left < right) {
    const mid = Math.ceil((left + right) / 2);
    assert(mid >= 0 && mid < lut.length);
    if (pos < lut[mid].range[1]) {
      right = mid - 1;
    } else {
      left = mid;
    }
  }
  if (left > right) {
    assert(lut[0].range[1] > pos);
    return null;
  }
  const found = left;
  const foundPos = lut[found].range[1];
  if (foundPos > pos) {
    return null;
  }
  if (found <= lut.length - 2) {
    const nextPos = lut[found + 1].range[1];
    assert(nextPos > pos);
  }
  return lut[found];
}
function last(arr) {
  return arr[arr.length - 1];
}
