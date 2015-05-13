/*jshint node:true */
/*
* Includes gulp-csslint
* https://github.com/lazd/gulp-csslint
*
* Copyright (c) 2013 Larry Davis
* Released under the MIT.
*/

'use strict';

var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var c = gutil.colors;
var SourceMapConsumer = require('source-map').SourceMapConsumer;

function isDirectory(name){
  try {
    return fs.statSync(name).isDirectory();
  } catch (ex) {
    return false;
  }
}

function getFiles(dir){
  var files = [];

  try {
    fs.statSync(dir);
  } catch (ex){
    return [];
  }

  function traverse(dir, stack){
    stack.push(dir);
    fs.readdirSync(stack.join("/")).forEach(function(file){
      var path = stack.concat([file]).join("/"),
        stat = fs.statSync(path);

      if (file[0] === ".") {
        return;
      } else if (stat.isFile() && /(\.css|\.less)$/.test(file)){
        files.push(path);
      } else if (stat.isDirectory()){
        traverse(file, stack);
      }
    });
    stack.pop();
  }

  traverse(dir, []);

  return files;
}

function isFileAllowed(file, excludeList) {
  var excludeFiles = [];
  if (excludeList) {
    // Build up the exclude list, expanding any directory exclusions that were passed in
    excludeList.forEach(function(value){
      if (isDirectory(value)) {
        excludeFiles = excludeFiles.concat(getFiles(value));
      } else {
        excludeFiles.push(value);
      }
    });

    // return whether file is allowed or excluded
    return excludeFiles.every(function(value){
      if (file.indexOf(value) > -1) {
        return false;
      }
      return true;
    });
  }

  return true;
}

var sourcemapReporter = function(excludeList) {
  excludeList = [].concat(excludeList);

  return function (file) {
    var errorCount = file.csslint.errorCount;
    var plural = errorCount === 1 ? '' : 's';
    var errors = [];

    file.csslint.results.forEach(function (result) {
      var message = result.error;

      var lineNum, colNum;
      if (file.sourceMap !== 'undefined') {
        var sourceMapConsumer = new SourceMapConsumer(file.sourceMap);
        var originalPos = sourceMapConsumer.originalPositionFor({
          line: message.line,
          column: message.col
        });
        lineNum = originalPos.line;
        colNum = originalPos.column;

        if (!isFileAllowed(
          path.normalize(originalPos.source),
          excludeList
        )) {
          return;
        }
      }
      else {
        lineNum = message.line;
        colNum = message.col;
      }

      var msgInfo = message.message + ' ' + message.rule.desc + ' (' + message.rule.id + ')';

      var locInfo = c.red('(') + c.yellow(path.relative(process.cwd(), originalPos.source) + ':');
      if (typeof message.line !== 'undefined') {
        locInfo += c.yellow(lineNum) + c.red(':') + c.yellow(colNum);
      } else {
        locInfo += c.yellow('GENERAL');
      }
      locInfo += c.red(')');

      errors.push({msg: msgInfo, loc: locInfo});
    });

    if (errors.length) {
      gutil.log(c.cyan(errors.length) + ' error' + plural + ' found in ' + c.magenta(file.path));

      errors.forEach(function(error) {
        console.log(error.msg, error.loc, '\n');
      });
    }
  };
};

module.exports = sourcemapReporter;
