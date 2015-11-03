/* */ 
"use strict";
const assert = require('assert');
const traverse = require('ordered-ast-traverse');
const Scope = require('./scope');
const is = require('simple-is');
module.exports = {
  setupScopeAndReferences: setupScopeAndReferences,
  isReference: isReference
};
function setupScopeAndReferences(root) {
  traverse(root, {pre: createScopes});
  createTopScope(root.$scope);
}
function createScopes(node, parent) {
  node.$parent = parent;
  node.$scope = parent ? parent.$scope : null;
  if (isNonFunctionBlock(node, parent)) {
    node.$scope = new Scope({
      kind: "block",
      node: node,
      parent: parent.$scope
    });
  } else if (node.type === "VariableDeclaration") {
    node.declarations.forEach(function(declarator) {
      const name = declarator.id.name;
      node.$scope.add(name, node.kind, declarator.id, declarator.range[1]);
    });
  } else if (isFunction(node)) {
    node.$scope = new Scope({
      kind: "hoist",
      node: node,
      parent: parent.$scope
    });
    if (node.id) {
      if (node.type === "FunctionDeclaration") {
        parent.$scope.add(node.id.name, "fun", node.id, null);
      } else if (node.type === "FunctionExpression") {
        node.$scope.add(node.id.name, "fun", node.id, null);
      } else {
        assert(false);
      }
    }
    node.params.forEach(function(param) {
      node.$scope.add(param.name, "param", param, null);
    });
  } else if (isForWithConstLet(node) || isForInOfWithConstLet(node)) {
    node.$scope = new Scope({
      kind: "block",
      node: node,
      parent: parent.$scope
    });
  } else if (node.type === "CatchClause") {
    const identifier = node.param;
    node.$scope = new Scope({
      kind: "catch-block",
      node: node,
      parent: parent.$scope
    });
    node.$scope.add(identifier.name, "caught", identifier, null);
    node.$scope.closestHoistScope().markPropagates(identifier.name);
  } else if (node.type === "Program") {
    node.$scope = new Scope({
      kind: "hoist",
      node: node,
      parent: null
    });
  }
}
function createTopScope(programScope) {
  function inject(obj) {
    for (let name in obj) {
      const writeable = obj[name];
      const kind = (writeable ? "var" : "const");
      if (topScope.hasOwn(name)) {
        topScope.remove(name);
      }
      topScope.add(name, kind, {loc: {start: {line: -1}}}, -1);
    }
  }
  const topScope = new Scope({
    kind: "hoist",
    node: {},
    parent: null
  });
  const complementary = {
    undefined: false,
    Infinity: false,
    console: false
  };
  inject(complementary);
  programScope.parent = topScope;
  topScope.children.push(programScope);
  return topScope;
}
function isConstLet(kind) {
  return kind === "const" || kind === "let";
}
function isNonFunctionBlock(node, parent) {
  return node.type === "BlockStatement" && parent.type !== "FunctionDeclaration" && parent.type !== "FunctionExpression";
}
function isForWithConstLet(node) {
  return node.type === "ForStatement" && node.init && node.init.type === "VariableDeclaration" && isConstLet(node.init.kind);
}
function isForInOfWithConstLet(node) {
  return isForInOf(node) && node.left.type === "VariableDeclaration" && isConstLet(node.left.kind);
}
function isForInOf(node) {
  return node.type === "ForInStatement" || node.type === "ForOfStatement";
}
function isFunction(node) {
  return node.type === "FunctionDeclaration" || node.type === "FunctionExpression";
}
function isReference(node) {
  const parent = node.$parent;
  return node.$refToScope || node.type === "Identifier" && !(parent.type === "VariableDeclarator" && parent.id === node) && !(parent.type === "MemberExpression" && parent.computed === false && parent.property === node) && !(parent.type === "Property" && parent.key === node) && !(parent.type === "LabeledStatement" && parent.label === node) && !(parent.type === "CatchClause" && parent.param === node) && !(isFunction(parent) && parent.id === node) && !(isFunction(parent) && is.someof(node, parent.params)) && true;
}
