import * as acorn from 'acorn';

export function parse(code) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest' });
  // find first function in code
  const firstFunc = ast.body.find(n => n.type === 'FunctionDeclaration');
  // extract args and body
  const args = firstFunc.params.map(p => p.name);
  const body = code.substring(firstFunc.body.start + 1, firstFunc.body.end - 1);
  return { args, body };
}

// keep that just in case...
// // from https://github.com/moagrius/stripcomments
// var SLASH = '/';
// var BACK_SLASH = '\\';
// var STAR = '*';
// var DOUBLE_QUOTE = '"';
// var SINGLE_QUOTE = "'";
// var NEW_LINE = '\n';
// var CARRIAGE_RETURN = '\r';

// const commentStripper = {
//   string: '',
//   length: 0,
//   position: 0,
//   output: null,

//   getCurrentCharacter: function () {
//     return this.string.charAt(this.position);
//   },

//   getPreviousCharacter: function () {
//     return this.string.charAt(this.position - 1);
//   },

//   getNextCharacter: function () {
//     return this.string.charAt(this.position + 1);
//   },

//   add: function () {
//     this.output.push(this.getCurrentCharacter());
//   },

//   next: function () {
//     this.position++;
//   },

//   atEnd: function () {
//     return this.position >= this.length;
//   },

//   isEscaping: function () {
//     if (this.getPreviousCharacter() == BACK_SLASH) {
//       var offset = 1;
//       var escaped = true;
//       while ((this.position - offset) > 0) {
//         escaped = !escaped;
//         var current = this.position - offset;
//         if (this.string.charAt(current) != BACK_SLASH) {
//           return escaped;
//         }
//         offset++;
//       }
//       return escaped;
//     }
//     return false;
//   },

//   processSingleQuotedString: function () {
//     if (this.getCurrentCharacter() == SINGLE_QUOTE) {
//       this.add();
//       this.next();
//       while (!this.atEnd()) {
//         if (this.getCurrentCharacter() == SINGLE_QUOTE && !this.isEscaping()) {
//           return;
//         }
//         this.add();
//         this.next();
//       }
//     }
//   },

//   processDoubleQuotedString: function () {
//     if (this.getCurrentCharacter() == DOUBLE_QUOTE) {
//       this.add();
//       this.next();
//       while (!this.atEnd()) {
//         if (this.getCurrentCharacter() == DOUBLE_QUOTE && !this.isEscaping()) {
//           return;
//         }
//         this.add();
//         this.next();
//       }
//     }
//   },

//   processSingleLineComment: function () {
//     if (this.getCurrentCharacter() == SLASH) {
//       if (this.getNextCharacter() == SLASH) {
//         this.next();
//         while (!this.atEnd()) {
//           this.next();
//           if (this.getCurrentCharacter() == NEW_LINE || this.getCurrentCharacter() == CARRIAGE_RETURN) {
//             return;
//           }
//         }
//       }
//     }
//   },

//   processMultiLineComment: function () {
//     if (this.getCurrentCharacter() == SLASH) {
//       if (this.getNextCharacter() == STAR) {
//         this.next();
//         while (!this.atEnd()) {
//           this.next();
//           if (this.getCurrentCharacter() == STAR) {
//             if (this.getNextCharacter() == SLASH) {
//               this.next();
//               this.next();
//               return;
//             }
//           }
//         }
//       }
//     }
//   },

//   processRegex: function () {
//     if (this.getCurrentCharacter() == SLASH) {
//       if (this.getNextCharacter() != STAR && this.getNextCharacter() != SLASH) {
//         while (!this.atEnd()) {
//           this.add();
//           this.next();
//           if (this.getCurrentCharacter() == SLASH && !this.isEscaping()) {
//             return;
//           }
//         }
//       }
//     }
//   },

//   process: function () {
//     while (!this.atEnd()) {
//       this.processRegex();
//       this.processDoubleQuotedString();
//       this.processSingleQuotedString();
//       this.processSingleLineComment();
//       this.processMultiLineComment();
//       if (!this.atEnd()) {
//         this.add();
//         this.next();
//       }
//     }
//   },

//   reset: function () {
//     this.string = '';
//     this.length = 0;
//     this.position = 0;
//     this.output = [];
//   },

//   strip: function (string) {
//     this.reset();
//     this.string = string;
//     this.length = this.string.length;
//     this.process();
//     return this.output.join('');
//   }
// };

// export function stripComments(code) {
//   return commentStripper.strip(code);
// }

// const ARGUMENT_NAMES_REGEXP = /.*function\s*\w*\s*\(([$_\w\s,]*)\).*/;
// // @note: this allows some syntax error `function(a,, b) {}` => ['a', 'b']
// export function getArgs(code) {
//   let matches = ARGUMENT_NAMES_REGEXP.exec(code);
//   const result = matches[1]
//     .split(',')
//     .map(s => s.trim())     // does seem needed, but not a big deal
//     .filter(s => s !== ''); // for functions without any arguments

//   return result;
// }

// const BODY_REGEXP = /.*function\s*\w*\s*\([$_\w\s,]*\)\s*{([\w\W]*?)}$/;
// // cf. https://github.com/nulltask/function-body-regex
// export function getBody(code) {
//   const values = BODY_REGEXP.exec(code);
//   return values[1].trim();
// }
