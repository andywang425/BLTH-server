var readline = require('readline');
var chalk = require('chalk');

//const success = chalk.keyword('green');
const warning = chalk.keyword('orange');
//const error = chalk.bold.red;

(function () {
  var _exports = {
    ___cmdList: {},
    __deepClone: function (initalObj, finalObj) {
      var obj = finalObj || {};
      for (var i in initalObj) {
        var prop = initalObj[i];
        // 避免相互引用对象导致死循环，如initalObj.a = initalObj的情况
        if (prop === obj) {
          continue;
        }
        if (typeof prop === 'object') {
          obj[i] = (prop.constructor === Array) ? [] : {};
          arguments.callee(prop, obj[i]);
        } else {
          obj[i] = prop;
        }
      }
      return obj;
    },
    logOutput: function (...arg) {
      console.log('>>', ...arg);
    },
    setCommand: function (obj) {
      _exports.__cmdList = this.__deepClone(obj);
      process.env.__cmdList ? process.env.__cmdList.push(..._exports.__cmdList) : process.env.__cmdList = _exports.__cmdList;
    },
    cmd: async function cmd() {
      var command = await new Promise(function (resolve, reject) {
        var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.on('line', (input) => {
          rl.close();
          resolve(input);
        });
      });
      if (command === '') {
        this.logOutput('Please input command');
        return this.cmd();
      }
      var list = command.split(' ');
      var main = list[0];
      if (!this.__cmdList.hasOwnProperty(main)) {
        if (!process.env.__cmdList.hasOwnProperty(main)) {
          this.logOutput(warning('Unknown command', main));
        }
        return this.cmd();
      }
      if (list.length === 1) {
        if (typeof this.__cmdList[main] === 'function') {
          this.__cmdList[main]();
        } else {
          this.logOutput(warning('Command', main, ': no code and parameter'));
        }
        return this.cmd();
      }
      var lastCode;
      var nextIsParam = false;
      for (var i = 1; i < list.length; i++) {
        if (list[i].charAt(0) === '-') {
          // code
          if (nextIsParam) {
            this.logOutput(warning('Command', main, ': code', lastCode || list[i].split('-')[1], 'needs parameter'));
            return this.cmd();
          }
          lastCode = list[i].split('-')[1];
          if (!this.__cmdList[main].hasOwnProperty(lastCode)) {
            this.logOutput(warning('Command', main, ': unknown code', lastCode));
            return this.cmd();
          }
          if (this.__cmdList[main][lastCode].hasParam) {
            nextIsParam = true;
            continue;
          }
          else this.__cmdList[main][lastCode].fn();
        } else {
          // param
          if (!lastCode) {
            this.logOutput(warning('Command', main, ': no code'));
            return this.cmd();
          } else {
            nextIsParam = false;
            this.__cmdList[main][lastCode].fn(list[i]);
          }
        }
      }
      if (nextIsParam) {
        this.logOutput(warning('Command', main, ': code', lastCode || list[i].split('-')[1], 'needs parameter'));
      }
      return this.cmd();
    }
  };

  module.exports = _exports;
}
)()
