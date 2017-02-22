// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: strong-supervisor
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

'use strict';

module.exports = printfReplacer;

function printfReplacer(template, replacements) {
  if (!(replacements instanceof Object)) {
    return template;
  }

  return template.replace(/%[^%]/mg, function(match, offset, string) {
    var char = match[1];
    var escaped = offset > 0 && string[offset - 1] === '%';
    if (!escaped && char in replacements) {
      match = replacements[char];
    }
    return match;
  });
}
