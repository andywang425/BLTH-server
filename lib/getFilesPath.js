var path = require('path');

/**
 * 获取 files 文件夹内文件路径
 */
 function getFilesPath(fileName) {
  return path.join(path.resolve(__dirname, '..'), 'files', fileName);
}

module.exports = getFilesPath;
