/* */ 
(function(process) {
  "use strict";
  var fmt = require('simple-fmt');
  var is = require('simple-is');
  var alter = require('alter');
  var traverse = require('ordered-ast-traverse');
  var EOL = require('os').EOL;
  var assert = require('assert');
  var ngInject = require('./nginject');
  var generateSourcemap = require('./generate-sourcemap');
  var Lut = require('./lut');
  var scopeTools = require('./scopetools');
  var stringmap = require('stringmap');
  var optionalAngularDashboardFramework = require('./optionals/angular-dashboard-framework');
  var require_acorn_t0 = Date.now();
  var parser = require('acorn').parse;
  var require_acorn_t1 = Date.now();
  var chainedRouteProvider = 1;
  var chainedUrlRouterProvider = 2;
  var chainedStateProvider = 3;
  var chainedRegular = 4;
  function match(node, ctx, matchPlugins) {
    var isMethodCall = (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.computed === false);
    var matchMethodCalls = (isMethodCall && (matchInjectorInvoke(node) || matchProvide(node, ctx) || matchRegular(node, ctx) || matchNgRoute(node) || matchMaterialShowModalOpen(node) || matchNgUi(node) || matchHttpProvider(node)));
    return matchMethodCalls || (matchPlugins && matchPlugins(node)) || matchDirectiveReturnObject(node) || matchProviderGet(node);
  }
  function matchMaterialShowModalOpen(node) {
    var callee = node.callee;
    var obj = callee.object;
    var method = callee.property;
    var args = node.arguments;
    if (obj.type === "Identifier" && ((obj.name === "$modal" && method.name === "open") || (is.someof(obj.name, ["$mdDialog", "$mdToast", "$mdBottomSheet"]) && method.name === "show")) && args.length === 1 && args[0].type === "ObjectExpression") {
      var props = args[0].properties;
      var res = [matchProp("controller", props)];
      res.push.apply(res, matchResolve(props));
      return res.filter(Boolean);
    }
    return false;
  }
  function matchDirectiveReturnObject(node) {
    return limit("directive", node.type === "ReturnStatement" && node.argument && node.argument.type === "ObjectExpression" && matchProp("controller", node.argument.properties));
  }
  function limit(name, node) {
    if (node && !node.$limitToMethodName) {
      node.$limitToMethodName = name;
    }
    return node;
  }
  function matchProviderGet(node) {
    var memberExpr;
    var self;
    return limit("provider", (node.type === "AssignmentExpression" && (memberExpr = node.left).type === "MemberExpression" && memberExpr.property.name === "$get" && ((self = memberExpr.object).type === "ThisExpression" || (self.type === "Identifier" && is.someof(self.name, ["self", "that"]))) && node.right) || (node.type === "ObjectExpression" && matchProp("$get", node.properties)));
  }
  function matchNgRoute(node) {
    var callee = node.callee;
    var obj = callee.object;
    if (!(obj.$chained === chainedRouteProvider || (obj.type === "Identifier" && obj.name === "$routeProvider"))) {
      return false;
    }
    node.$chained = chainedRouteProvider;
    var method = callee.property;
    if (method.name !== "when") {
      return false;
    }
    var args = node.arguments;
    if (args.length !== 2) {
      return false;
    }
    var configArg = last(args);
    if (configArg.type !== "ObjectExpression") {
      return false;
    }
    var props = configArg.properties;
    var res = [matchProp("controller", props)];
    res.push.apply(res, matchResolve(props));
    var filteredRes = res.filter(Boolean);
    return (filteredRes.length === 0 ? false : filteredRes);
  }
  function matchNgUi(node) {
    var callee = node.callee;
    var obj = callee.object;
    var method = callee.property;
    var args = node.arguments;
    if (obj.$chained === chainedUrlRouterProvider || (obj.type === "Identifier" && obj.name === "$urlRouterProvider")) {
      node.$chained = chainedUrlRouterProvider;
      if (method.name === "when" && args.length >= 1) {
        return last(args);
      }
      return false;
    }
    if (!(obj.$chained === chainedStateProvider || (obj.type === "Identifier" && is.someof(obj.name, ["$stateProvider", "stateHelperProvider"])))) {
      return false;
    }
    node.$chained = chainedStateProvider;
    if (is.noneof(method.name, ["state", "setNestedState"])) {
      return false;
    }
    if (!(args.length >= 1 && args.length <= 2)) {
      return false;
    }
    var configArg = (method.name === "state" ? last(args) : args[0]);
    var res = [];
    recursiveMatch(configArg);
    var filteredRes = res.filter(Boolean);
    return (filteredRes.length === 0 ? false : filteredRes);
    function recursiveMatch(objectExpressionNode) {
      if (!objectExpressionNode || objectExpressionNode.type !== "ObjectExpression") {
        return false;
      }
      var properties = objectExpressionNode.properties;
      matchStateProps(properties, res);
      var childrenArrayExpression = matchProp("children", properties);
      var children = childrenArrayExpression && childrenArrayExpression.elements;
      if (!children) {
        return;
      }
      children.forEach(recursiveMatch);
    }
    function matchStateProps(props, res) {
      var simple = [matchProp("controller", props), matchProp("controllerProvider", props), matchProp("templateProvider", props), matchProp("onEnter", props), matchProp("onExit", props)];
      res.push.apply(res, simple);
      res.push.apply(res, matchResolve(props));
      var viewObject = matchProp("views", props);
      if (viewObject && viewObject.type === "ObjectExpression") {
        viewObject.properties.forEach(function(prop) {
          if (prop.value.type === "ObjectExpression") {
            res.push(matchProp("controller", prop.value.properties));
            res.push(matchProp("controllerProvider", prop.value.properties));
            res.push(matchProp("templateProvider", prop.value.properties));
            res.push.apply(res, matchResolve(prop.value.properties));
          }
        });
      }
    }
  }
  function matchInjectorInvoke(node) {
    var callee = node.callee;
    var obj = callee.object;
    var method = callee.property;
    return method.name === "invoke" && obj.type === "Identifier" && obj.name === "$injector" && node.arguments.length >= 1 && node.arguments;
  }
  function matchHttpProvider(node) {
    var callee = node.callee;
    var obj = callee.object;
    var method = callee.property;
    return (method.name === "push" && obj.type === "MemberExpression" && !obj.computed && obj.object.name === "$httpProvider" && is.someof(obj.property.name, ["interceptors", "responseInterceptors"]) && node.arguments.length >= 1 && node.arguments);
  }
  function matchProvide(node, ctx) {
    var callee = node.callee;
    var obj = callee.object;
    var method = callee.property;
    var args = node.arguments;
    var target = obj.type === "Identifier" && obj.name === "$provide" && is.someof(method.name, ["decorator", "service", "factory", "provider"]) && args.length === 2 && args[1];
    if (target) {
      target.$methodName = method.name;
      if (ctx.rename) {
        return args;
      }
    }
    return target;
  }
  function matchRegular(node, ctx) {
    var callee = node.callee;
    var obj = callee.object;
    var method = callee.property;
    if (obj.name === "angular" && method.name === "module") {
      var args$0 = node.arguments;
      if (args$0.length >= 2) {
        node.$chained = chainedRegular;
        return last(args$0);
      }
    }
    var matchAngularModule = (obj.$chained === chainedRegular || isReDef(obj, ctx) || isLongDef(obj)) && is.someof(method.name, ["provider", "value", "constant", "bootstrap", "config", "factory", "directive", "filter", "run", "controller", "service", "animation", "invoke", "store"]);
    if (!matchAngularModule) {
      return false;
    }
    node.$chained = chainedRegular;
    if (is.someof(method.name, ["value", "constant", "bootstrap"])) {
      return false;
    }
    var args = node.arguments;
    var target = (is.someof(method.name, ["config", "run"]) ? args.length === 1 && args[0] : args.length === 2 && args[0].type === "Literal" && is.string(args[0].value) && args[1]);
    if (target) {
      target.$methodName = method.name;
    }
    if (ctx.rename && args.length === 2 && target) {
      var somethingNameLiteral = args[0];
      return [somethingNameLiteral, target];
    }
    return target;
  }
  function isReDef(node, ctx) {
    return ctx.re.test(ctx.srcForRange(node.range));
  }
  function isLongDef(node) {
    return node.callee && node.callee.object && node.callee.object.name === "angular" && node.callee.property && node.callee.property.name === "module";
  }
  function last(arr) {
    return arr[arr.length - 1];
  }
  function matchProp(name, props) {
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      if ((prop.key.type === "Identifier" && prop.key.name === name) || (prop.key.type === "Literal" && prop.key.value === name)) {
        return prop.value;
      }
    }
    return null;
  }
  function matchResolve(props) {
    var resolveObject = matchProp("resolve", props);
    if (resolveObject && resolveObject.type === "ObjectExpression") {
      return resolveObject.properties.map(function(prop) {
        return prop.value;
      });
    }
    return [];
  }
  ;
  function renamedString(ctx, originalString) {
    if (ctx.rename) {
      return ctx.rename.get(originalString) || originalString;
    }
    return originalString;
  }
  function stringify(ctx, arr, quot) {
    return "[" + arr.map(function(arg) {
      return quot + renamedString(ctx, arg.name) + quot;
    }).join(", ") + "]";
  }
  function parseExpressionOfType(str, type) {
    var node = parser(str).body[0].expression;
    assert(node.type === type);
    return node;
  }
  function replaceNodeWith(node, newNode) {
    var done = false;
    var parent = node.$parent;
    var keys = Object.keys(parent);
    keys.forEach(function(key) {
      if (parent[key] === node) {
        parent[key] = newNode;
        done = true;
      }
    });
    if (done) {
      return;
    }
    keys.forEach(function(key) {
      if (Array.isArray(parent[key])) {
        var arr = parent[key];
        for (var i = 0; i < arr.length; i++) {
          if (arr[i] === node) {
            arr[i] = newNode;
            done = true;
          }
        }
      }
    });
    assert(done);
  }
  function insertArray(ctx, functionExpression, fragments, quot) {
    var args = stringify(ctx, functionExpression.params, quot);
    fragments.push({
      start: functionExpression.range[0],
      end: functionExpression.range[0],
      str: args.slice(0, -1) + ", ",
      loc: {
        start: functionExpression.loc.start,
        end: functionExpression.loc.start
      }
    });
    fragments.push({
      start: functionExpression.range[1],
      end: functionExpression.range[1],
      str: "]",
      loc: {
        start: functionExpression.loc.end,
        end: functionExpression.loc.end
      }
    });
  }
  function replaceArray(ctx, array, fragments, quot) {
    var functionExpression = last(array.elements);
    if (functionExpression.params.length === 0) {
      return removeArray(array, fragments);
    }
    var args = stringify(ctx, functionExpression.params, quot);
    fragments.push({
      start: array.range[0],
      end: functionExpression.range[0],
      str: args.slice(0, -1) + ", ",
      loc: {
        start: array.loc.start,
        end: functionExpression.loc.start
      }
    });
  }
  function removeArray(array, fragments) {
    var functionExpression = last(array.elements);
    fragments.push({
      start: array.range[0],
      end: functionExpression.range[0],
      str: "",
      loc: {
        start: array.loc.start,
        end: functionExpression.loc.start
      }
    });
    fragments.push({
      start: functionExpression.range[1],
      end: array.range[1],
      str: "",
      loc: {
        start: functionExpression.loc.end,
        end: array.loc.end
      }
    });
  }
  function renameProviderDeclarationSite(ctx, literalNode, fragments) {
    fragments.push({
      start: literalNode.range[0] + 1,
      end: literalNode.range[1] - 1,
      str: renamedString(ctx, literalNode.value),
      loc: {
        start: {
          line: literalNode.loc.start.line,
          column: literalNode.loc.start.column + 1
        },
        end: {
          line: literalNode.loc.end.line,
          column: literalNode.loc.end.column - 1
        }
      }
    });
  }
  function judgeSuspects(ctx) {
    var mode = ctx.mode;
    var fragments = ctx.fragments;
    var quot = ctx.quot;
    var blocked = ctx.blocked;
    var suspects = makeUnique(ctx.suspects, 1);
    for (var n = 0; n < 42; n++) {
      propagateModuleContextAndMethodName(suspects);
      if (!setChainedAndMethodNameThroughIifesAndReferences(suspects)) {
        break;
      }
    }
    var finalSuspects = makeUnique(suspects.map(function(target) {
      var jumped = jumpOverIife(target);
      var jumpedAndFollowed = followReference(jumped) || jumped;
      if (target.$limitToMethodName && target.$limitToMethodName !== "*never*" && findOuterMethodName(target) !== target.$limitToMethodName) {
        return null;
      }
      if (blocked.indexOf(jumpedAndFollowed) >= 0) {
        return null;
      }
      return jumpedAndFollowed;
    }).filter(Boolean), 2);
    finalSuspects.forEach(function(target) {
      if (target.$chained !== chainedRegular) {
        return;
      }
      if (mode === "rebuild" && isAnnotatedArray(target)) {
        replaceArray(ctx, target, fragments, quot);
      } else if (mode === "remove" && isAnnotatedArray(target)) {
        removeArray(target, fragments);
      } else if (is.someof(mode, ["add", "rebuild"]) && isFunctionExpressionWithArgs(target)) {
        insertArray(ctx, target, fragments, quot);
      } else if (isGenericProviderName(target)) {
        renameProviderDeclarationSite(ctx, target, fragments);
      } else {
        judgeInjectArraySuspect(target, ctx);
      }
    });
    function propagateModuleContextAndMethodName(suspects) {
      suspects.forEach(function(target) {
        if (target.$chained !== chainedRegular && isInsideModuleContext(target)) {
          target.$chained = chainedRegular;
        }
        if (!target.$methodName) {
          var methodName = findOuterMethodName(target);
          if (methodName) {
            target.$methodName = methodName;
          }
        }
      });
    }
    function findOuterMethodName(node) {
      for (; node && !node.$methodName; node = node.$parent) {}
      return node ? node.$methodName : null;
    }
    function setChainedAndMethodNameThroughIifesAndReferences(suspects) {
      var modified = false;
      suspects.forEach(function(target) {
        var jumped = jumpOverIife(target);
        if (jumped !== target) {
          if (target.$chained === chainedRegular && jumped.$chained !== chainedRegular) {
            modified = true;
            jumped.$chained = chainedRegular;
          }
          if (target.$methodName && !jumped.$methodName) {
            modified = true;
            jumped.$methodName = target.$methodName;
          }
        }
        var jumpedAndFollowed = followReference(jumped) || jumped;
        if (jumpedAndFollowed !== jumped) {
          if (jumped.$chained === chainedRegular && jumpedAndFollowed.$chained !== chainedRegular) {
            modified = true;
            jumpedAndFollowed.$chained = chainedRegular;
          }
          if (jumped.$methodName && !jumpedAndFollowed.$methodName) {
            modified = true;
            jumpedAndFollowed.$methodName = jumped.$methodName;
          }
        }
      });
      return modified;
    }
    function isInsideModuleContext(node) {
      var $parent = node.$parent;
      for (; $parent && $parent.$chained !== chainedRegular; $parent = $parent.$parent) {}
      return Boolean($parent);
    }
    function makeUnique(suspects, val) {
      return suspects.filter(function(target) {
        if (target.$seen === val) {
          return false;
        }
        target.$seen = val;
        return true;
      });
    }
  }
  function followReference(node) {
    if (!scopeTools.isReference(node)) {
      return null;
    }
    var scope = node.$scope.lookup(node.name);
    if (!scope) {
      return null;
    }
    var parent = scope.getNode(node.name).$parent;
    var kind = scope.getKind(node.name);
    if (!parent) {
      return null;
    }
    var ptype = parent.type;
    if (is.someof(kind, ["const", "let", "var"])) {
      assert(ptype === "VariableDeclarator");
      return parent;
    } else if (kind === "fun") {
      assert(ptype === "FunctionDeclaration" || ptype === "FunctionExpression");
      return parent;
    }
    return null;
  }
  function posToLine(pos, src) {
    if (pos >= src.length) {
      pos = src.length - 1;
    }
    if (pos <= -1) {
      return -1;
    }
    var line = 1;
    for (var i = 0; i < pos; i++) {
      if (src[i] === "\n") {
        ++line;
      }
    }
    return line;
  }
  function judgeInjectArraySuspect(node, ctx) {
    if (node.type === "VariableDeclaration") {
      if (node.declarations.length !== 1) {
        return;
      }
      node = node.declarations[0];
    }
    var onode = null;
    var declaratorName = null;
    if (node.type === "VariableDeclarator") {
      onode = node.$parent;
      declaratorName = node.id.name;
      node = node.init;
    } else {
      onode = node;
    }
    if (!node || !onode.$parent || is.noneof(onode.$parent.type, ["Program", "BlockStatement"])) {
      return;
    }
    var insertPos = {
      pos: onode.range[1],
      loc: onode.loc.end
    };
    var isSemicolonTerminated = (ctx.src[insertPos.pos - 1] === ";");
    node = jumpOverIife(node);
    if (ctx.isFunctionExpressionWithArgs(node)) {
      assert(declaratorName);
      addRemoveInjectArray(node.params, isSemicolonTerminated ? insertPos : {
        pos: node.range[1],
        loc: node.loc.end
      }, declaratorName);
    } else if (ctx.isFunctionDeclarationWithArgs(node)) {
      addRemoveInjectArray(node.params, insertPos, node.id.name);
    } else if (node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" && ctx.isFunctionExpressionWithArgs(node.expression.right)) {
      var name = ctx.srcForRange(node.expression.left.range);
      addRemoveInjectArray(node.expression.right.params, isSemicolonTerminated ? insertPos : {
        pos: node.expression.right.range[1],
        loc: node.expression.right.loc.end
      }, name);
    } else if (node = followReference(node)) {
      judgeInjectArraySuspect(node, ctx);
    }
    function getIndent(pos) {
      var src = ctx.src;
      var lineStart = src.lastIndexOf("\n", pos - 1) + 1;
      var i = lineStart;
      for (; src[i] === " " || src[i] === "\t"; i++) {}
      return src.slice(lineStart, i);
    }
    function addRemoveInjectArray(params, posAfterFunctionDeclaration, name) {
      var indent = getIndent(posAfterFunctionDeclaration.pos);
      var foundSuspectInBody = false;
      var existingExpressionStatementWithArray = null;
      var troublesomeReturn = false;
      onode.$parent.body.forEach(function(bnode) {
        if (bnode === onode) {
          foundSuspectInBody = true;
        }
        if (hasInjectArray(bnode)) {
          if (existingExpressionStatementWithArray) {
            throw fmt("conflicting inject arrays at line {0} and {1}", posToLine(existingExpressionStatementWithArray.range[0], ctx.src), posToLine(bnode.range[0], ctx.src));
          }
          existingExpressionStatementWithArray = bnode;
        }
        if (!foundSuspectInBody && bnode.type === "ReturnStatement") {
          troublesomeReturn = bnode;
        }
      });
      assert(foundSuspectInBody);
      if (troublesomeReturn && !existingExpressionStatementWithArray) {
        posAfterFunctionDeclaration = skipPrevNewline(troublesomeReturn.range[0], troublesomeReturn.loc.start);
      }
      function hasInjectArray(node) {
        var lvalue;
        var assignment;
        return (node && node.type === "ExpressionStatement" && (assignment = node.expression).type === "AssignmentExpression" && assignment.operator === "=" && (lvalue = assignment.left).type === "MemberExpression" && ((lvalue.computed === false && ctx.srcForRange(lvalue.object.range) === name && lvalue.property.name === "$inject") || (lvalue.computed === true && ctx.srcForRange(lvalue.object.range) === name && lvalue.property.type === "Literal" && lvalue.property.value === "$inject")));
      }
      function skipPrevNewline(pos, loc) {
        var prevLF = ctx.src.lastIndexOf("\n", pos);
        if (prevLF === -1) {
          return {
            pos: pos,
            loc: loc
          };
        }
        if (prevLF >= 1 && ctx.src[prevLF - 1] === "\r") {
          --prevLF;
        }
        if (/\S/g.test(ctx.src.slice(prevLF, pos - 1))) {
          return {
            pos: pos,
            loc: loc
          };
        }
        return {
          pos: prevLF,
          loc: {
            line: loc.line - 1,
            column: prevLF - ctx.src.lastIndexOf("\n", prevLF) - 1
          }
        };
      }
      if (ctx.mode === "rebuild" && existingExpressionStatementWithArray) {
        var strNoWhitespace = fmt("{2}.$inject = {3};", null, null, name, ctx.stringify(ctx, params, ctx.quot));
        ctx.fragments.push({
          start: existingExpressionStatementWithArray.range[0],
          end: existingExpressionStatementWithArray.range[1],
          str: strNoWhitespace,
          loc: {
            start: existingExpressionStatementWithArray.loc.start,
            end: existingExpressionStatementWithArray.loc.end
          }
        });
      } else if (ctx.mode === "remove" && existingExpressionStatementWithArray) {
        var start = skipPrevNewline(existingExpressionStatementWithArray.range[0], existingExpressionStatementWithArray.loc.start);
        ctx.fragments.push({
          start: start.pos,
          end: existingExpressionStatementWithArray.range[1],
          str: "",
          loc: {
            start: start.loc,
            end: existingExpressionStatementWithArray.loc.end
          }
        });
      } else if (is.someof(ctx.mode, ["add", "rebuild"]) && !existingExpressionStatementWithArray) {
        var str = fmt("{0}{1}{2}.$inject = {3};", EOL, indent, name, ctx.stringify(ctx, params, ctx.quot));
        ctx.fragments.push({
          start: posAfterFunctionDeclaration.pos,
          end: posAfterFunctionDeclaration.pos,
          str: str,
          loc: {
            start: posAfterFunctionDeclaration.loc,
            end: posAfterFunctionDeclaration.loc
          }
        });
      }
    }
  }
  function jumpOverIife(node) {
    var outerfn;
    if (!(node.type === "CallExpression" && (outerfn = node.callee).type === "FunctionExpression")) {
      return node;
    }
    var outerbody = outerfn.body.body;
    for (var i = 0; i < outerbody.length; i++) {
      var statement = outerbody[i];
      if (statement.type === "ReturnStatement") {
        return statement.argument;
      }
    }
    return node;
  }
  function addModuleContextDependentSuspect(target, ctx) {
    ctx.suspects.push(target);
  }
  function addModuleContextIndependentSuspect(target, ctx) {
    target.$chained = chainedRegular;
    ctx.suspects.push(target);
  }
  function isAnnotatedArray(node) {
    if (node.type !== "ArrayExpression") {
      return false;
    }
    var elements = node.elements;
    if (elements.length === 0 || last(elements).type !== "FunctionExpression") {
      return false;
    }
    for (var i = 0; i < elements.length - 1; i++) {
      var n = elements[i];
      if (n.type !== "Literal" || !is.string(n.value)) {
        return false;
      }
    }
    return true;
  }
  function isFunctionExpressionWithArgs(node) {
    return node.type === "FunctionExpression" && node.params.length >= 1;
  }
  function isFunctionDeclarationWithArgs(node) {
    return node.type === "FunctionDeclaration" && node.params.length >= 1;
  }
  function isGenericProviderName(node) {
    return node.type === "Literal" && is.string(node.value);
  }
  function uniqifyFragments(fragments) {
    var map = Object.create(null);
    for (var i = 0; i < fragments.length; i++) {
      var frag = fragments[i];
      var str = JSON.stringify({
        start: frag.start,
        end: frag.end,
        str: frag.str
      });
      if (map[str]) {
        fragments.splice(i, 1);
        i--;
      } else {
        map[str] = true;
      }
    }
  }
  var allOptionals = {"angular-dashboard-framework": optionalAngularDashboardFramework};
  module.exports = function ngAnnotate(src, options) {
    if (options.list) {
      return {list: Object.keys(allOptionals).sort()};
    }
    var mode = (options.add && options.remove ? "rebuild" : options.remove ? "remove" : options.add ? "add" : null);
    if (!mode) {
      return {src: src};
    }
    var quot = options.single_quotes ? "'" : '"';
    var re = (options.regexp ? new RegExp(options.regexp) : /^[a-zA-Z0-9_\$\.\s]+$/);
    var rename = new stringmap();
    if (options.rename) {
      options.rename.forEach(function(value) {
        rename.set(value.from, value.to);
      });
    }
    var ast;
    var stats = {};
    var lf = src.lastIndexOf("\n");
    if (lf >= 1) {
      EOL = (src[lf - 1] === "\r" ? "\r\n" : "\n");
    }
    var comments = [];
    try {
      stats.parser_require_t0 = require_acorn_t0;
      stats.parser_require_t1 = require_acorn_t1;
      stats.parser_parse_t0 = Date.now();
      ast = parser(src, {
        ecmaVersion: 6,
        locations: true,
        ranges: true,
        onComment: comments
      });
      stats.parser_parse_t1 = Date.now();
    } catch (e) {
      return {errors: ["error: couldn't process source due to parse error", e.message]};
    }
    ast.body.push({
      type: "DebuggerStatement",
      range: [ast.range[1], ast.range[1]],
      loc: {
        start: ast.loc.end,
        end: ast.loc.end
      }
    });
    var fragments = [];
    var suspects = [];
    var blocked = [];
    var nodePositions = [];
    var lut = new Lut(ast, src);
    scopeTools.setupScopeAndReferences(ast);
    var ctx = {
      mode: mode,
      quot: quot,
      src: src,
      srcForRange: function(range) {
        return src.slice(range[0], range[1]);
      },
      re: re,
      rename: rename,
      comments: comments,
      fragments: fragments,
      suspects: suspects,
      blocked: blocked,
      lut: lut,
      isFunctionExpressionWithArgs: isFunctionExpressionWithArgs,
      isFunctionDeclarationWithArgs: isFunctionDeclarationWithArgs,
      isAnnotatedArray: isAnnotatedArray,
      addModuleContextDependentSuspect: addModuleContextDependentSuspect,
      addModuleContextIndependentSuspect: addModuleContextIndependentSuspect,
      stringify: stringify,
      nodePositions: nodePositions,
      matchResolve: matchResolve,
      matchProp: matchProp,
      last: last
    };
    var optionals = options.enable || [];
    for (var i = 0; i < optionals.length; i++) {
      var optional = String(optionals[i]);
      if (!allOptionals.hasOwnProperty(optional)) {
        return {errors: ["error: found no optional named " + optional]};
      }
    }
    var optionalsPlugins = optionals.map(function(optional) {
      return allOptionals[optional];
    });
    var plugins = [].concat(optionalsPlugins, options.plugin || []);
    function matchPlugins(node, isMethodCall) {
      for (var i = 0; i < plugins.length; i++) {
        var res = plugins[i].match(node, isMethodCall);
        if (res) {
          return res;
        }
      }
      return false;
    }
    var matchPluginsOrNull = (plugins.length === 0 ? null : matchPlugins);
    ngInject.inspectComments(ctx);
    plugins.forEach(function(plugin) {
      plugin.init(ctx);
    });
    traverse(ast, {
      pre: function(node) {
        ngInject.inspectNode(node, ctx);
      },
      post: function(node) {
        ctx.nodePositions.push(node.loc.start);
        var targets = match(node, ctx, matchPluginsOrNull);
        if (!targets) {
          return;
        }
        if (!is.array(targets)) {
          targets = [targets];
        }
        for (var i = 0; i < targets.length; i++) {
          addModuleContextDependentSuspect(targets[i], ctx);
        }
      }
    });
    try {
      judgeSuspects(ctx);
    } catch (e) {
      return {errors: ["error: " + e]};
    }
    uniqifyFragments(ctx.fragments);
    var out = alter(src, fragments);
    var result = {
      src: out,
      _stats: stats
    };
    if (options.map) {
      if (typeof(options.map) !== 'object')
        options.map = {};
      stats.sourcemap_t0 = Date.now();
      generateSourcemap(result, src, nodePositions, fragments, options.map);
      stats.sourcemap_t1 = Date.now();
    }
    return result;
  };
})(require('process'));
