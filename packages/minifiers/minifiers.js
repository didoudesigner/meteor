UglifyJSMinify = Npm.require('uglify-js').minify;

var cssParse = Npm.require('css-parse');
var cssStringify = Npm.require('css-stringify');

CssTools = {
  parseCss: cssParse,
  stringifyCss: cssStringify,
  minifyCss: function (cssText) {
    return CssTools.minifyCssAst(cssParse(cssText));
  },
  minifyCssAst: function (cssAst) {
    return MinifyAst(cssAst);
  },
  concatenateCssAsts: function (cssAsts, warnCb) {
    var rulesPredicate = function (rules) {
      if (! _.isArray(rules))
        rules = [rules];
      return function (node) {
        return _.contains(rules, node.type);
      }
    };

    // The straight-forward concatenation of CSS files would break @import rules
    // located in the beginning of a file. Before concatenation, pull them to
    // the beginning of a new syntax tree so they always precede other rules.
    var newAst = {
      type: 'stylesheet',
      stylesheet: { rules: [] }
    };

    _.each(cssAsts, function (ast) {
      // Pick only the imports from the beginning of file ignoring @charset
      // rules as Meteor assumes every file is in utf-8.
      if (_.any(ast.stylesheet.rules, rulesPredicate("charset"))) {
        warnCb(ast.filename, "@charset rules in this file will be ignored as Meteor supports only utf-8 at the moment.");
      }

      ast.stylesheet.rules = _.reject(ast.stylesheet.rules,
                                      rulesPredicate("charset"));
      var importCount = 0;
      for (var i = 0; i < ast.stylesheet.rules.length; i++)
        if (!rulesPredicate(["import", "comment"])(ast.stylesheet.rules[i])) {
          importCount = i;
          break;
        }

      var imports = ast.stylesheet.rules.splice(0, importCount);
      newAst.stylesheet.rules = newAst.stylesheet.rules.concat(imports);

      // if there are imports left in the middle of file, warn user as it might
      // be a potential bug (imports are valid only in the beginning of file).
      if (_.any(ast.stylesheet.rules, rulesPredicate("import"))) {
        warnCb(ast.filename, "warn: there are some @import rules those are not taking effect as they are required to be in the beginning of the file.");
      }

    });

    // Now we can put the rest of CSS rules into new AST
    _.each(cssAsts, function (ast) {
      newAst.stylesheet.rules =
        newAst.stylesheet.rules.concat(ast.stylesheet.rules);
    });

    return newAst;
  }
};

