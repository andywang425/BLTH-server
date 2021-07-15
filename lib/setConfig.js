var path = require('path');
var fs = require('fs');

/**
 * 设置 config
 */
function setConfig(dir) {
  try {
    const config_path = path.join(dir, 'config', 'config.json');
    var config = JSON.parse(fs.readFileSync(config_path));
    process.myconfig = config;
  } catch (e) {
    console.log('设置config失败', e);
  }
}

module.exports = setConfig;