var fs = require('fs');

/**
 * 设置 config
 */
function setConfig() {
  try {
    process.myconfig = JSON.parse(fs.readFileSync('./config/config.json'));
  } catch (e) {
    console.log('设置config失败', e);
  }
}

module.exports = setConfig;