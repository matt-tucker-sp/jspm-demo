/* */ 
"use strict";
const assert = require('assert');
const stringmap = require('stringmap');
const stringset = require('stringset');
const is = require('simple-is');
const fmt = require('simple-fmt');
function Scope(args) {
  assert(is.someof(args.kind, ["hoist", "block", "catch-block"]));
  assert(is.object(args.node));
  assert(args.parent === null || is.object(args.parent));
  this.kind = args.kind;
  this.node = args.node;
  this.parent = args.parent;
  this.children = [];
  this.decls = stringmap();
  this.propagates = (this.kind === "hoist" ? stringset() : null);
  if (this.parent) {
    this.parent.children.push(this);
  }
}
Scope.prototype.print = function(indent) {
  indent = indent || 0;
  const scope = this;
  const names = this.decls.keys().map(function(name) {
    return fmt("{0} [{1}]", name, scope.decls.get(name).kind);
  }).join(", ");
  const propagates = this.propagates ? this.propagates.items().join(", ") : "";
  console.log(fmt("{0}{1}: {2}. propagates: {3}", fmt.repeat(" ", indent), this.node.type, names, propagates));
  this.children.forEach(function(c) {
    c.print(indent + 2);
  });
};
Scope.prototype.add = function(name, kind, node, referableFromPos) {
  assert(is.someof(kind, ["fun", "param", "var", "caught", "const", "let"]));
  function isConstLet(kind) {
    return is.someof(kind, ["const", "let"]);
  }
  let scope = this;
  if (is.someof(kind, ["fun", "param", "var"])) {
    while (scope.kind !== "hoist") {
      scope = scope.parent;
    }
  }
  const declaration = {
    kind: kind,
    node: node
  };
  if (referableFromPos) {
    assert(is.someof(kind, ["var", "const", "let"]));
    declaration.from = referableFromPos;
  }
  scope.decls.set(name, declaration);
};
Scope.prototype.getKind = function(name) {
  assert(is.string(name));
  const decl = this.decls.get(name);
  return decl ? decl.kind : null;
};
Scope.prototype.getNode = function(name) {
  assert(is.string(name));
  const decl = this.decls.get(name);
  return decl ? decl.node : null;
};
Scope.prototype.getFromPos = function(name) {
  assert(is.string(name));
  const decl = this.decls.get(name);
  return decl ? decl.from : null;
};
Scope.prototype.hasOwn = function(name) {
  return this.decls.has(name);
};
Scope.prototype.remove = function(name) {
  return this.decls.remove(name);
};
Scope.prototype.doesPropagate = function(name) {
  return this.propagates.has(name);
};
Scope.prototype.markPropagates = function(name) {
  this.propagates.add(name);
};
Scope.prototype.closestHoistScope = function() {
  let scope = this;
  while (scope.kind !== "hoist") {
    scope = scope.parent;
  }
  return scope;
};
Scope.prototype.lookup = function(name) {
  for (let scope = this; scope; scope = scope.parent) {
    if (scope.decls.has(name)) {
      return scope;
    } else if (scope.kind === "hoist") {
      scope.propagates.add(name);
    }
  }
  return null;
};
module.exports = Scope;
