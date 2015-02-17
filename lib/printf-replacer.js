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
