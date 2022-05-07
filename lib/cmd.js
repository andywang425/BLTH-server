var readline = require('readline');
var chalk = require('./chalk');

(function () {
  var _exports = {
    logOutput: function (...arg) {
      console.log('>>', ...arg);
    },
    setCommand: function (obj) {
      if (!process.__cmdList) process.__cmdList = {};
      Object.assign(process.__cmdList, obj);
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
      if (!process.__cmdList.hasOwnProperty(main)) {
        this.logOutput(chalk.warning('Unknown command', main));
        return this.cmd();
      }
      if (list.length === 1) {
        if (typeof process.__cmdList[main] === 'function') {
          process.__cmdList[main]();
        } else {
          this.logOutput(chalk.warning('Command', main, ': no code and parameter'));
        }
        return this.cmd();
      }
      var lastCode;
      var nextIsParam = false;
      for (var i = 1; i < list.length; i++) {
        if (list[i].charAt(0) === '-') {
          // code
          lastCode = list[i].split('-')[1];
          if (nextIsParam) {
            this.logOutput(chalk.warning('Command', main, ': code', lastCode, 'needs parameter'));
            break;
          }
          if (!process.__cmdList[main].hasOwnProperty(lastCode)) {
            this.logOutput(chalk.warning('Command', main, ': unknown code', lastCode));
            break;
          }
          if (process.__cmdList[main][lastCode].hasParam) {
            nextIsParam = true;
            if (i === list.length - 1) {
              this.logOutput(chalk.warning('Command', main, ': code', lastCode, 'needs parameter'));
              break;
            }
            continue;
          }
          else process.__cmdList[main][lastCode].fn();
        } else {
          // param
          if (!lastCode) {
            this.logOutput(chalk.warning('Command', main, ': no code'));
            break;
          } else {
            nextIsParam = false;
            process.__cmdList[main][lastCode].fn(list[i]);
          }
        }
      }
      return this.cmd();
    }
  };

  module.exports = _exports;
}
)()
