var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var _export = {
  salt1: process.myconfig.apikey.salt1,
  salt2: process.myconfig.apikey.salt2,
  verify_level: process.myconfig.apikey.verify_level,
  hash: function (str) {
    return crypto.createHash('md5').update(this.salt1 + str + this.salt2).digest("hex");
  },
  /**
 * 强校验：读取 apikeys.json 并校验 apikey 是否正确
 */
  strictVerifyApikey: function (apikey, uid) {
    var result = this.hash(uid);
    var filePath = path.join(path.resolve(__dirname, '..'), 'apikey', 'apikeys.json');
    return new Promise(function (resolve, reject) {
      fs.readFile(filePath, 'utf8', function (err, data) {
        if (err || data.length === 0) {
          console.log('read ./apikey/apikeys.json')
          resolve(false)
        } else {
          var apikeys = JSON.parse(data);
          if (result === apikey && result == apikeys[uid]) resolve(true);
          else resolve(false);
        }
      });
    })
  },
  /**
  * 弱校验：仅校验 apikey 是否正确 
  */
  weakVerifyApikey: function (apikey, uid) {
    var result = this.hash(uid);
    return new Promise(function (resolve, reject) {
      if (result === apikey) resolve(true);
      else resolve(false);
    });
  },
  /**
   * 无校验，全部通过
   */
  allPass: function (apikey, uid) {
    return new Promise(function (resolve, reject) {
      resolve(true);
    });
  },
  /**
   * 无校验，全部拒绝
   */
  allReject: function (apikey, uid) {
    return new Promise(function (resolve, reject) {
      resolve(false);
    });
  },
  verify: function (apikey, uid) {
    switch (this.verify_level) {
      case -1: return this.allReject(apikey, uid);
      case 0: return this.allPass(apikey, uid);
      case 1: return this.weakVerifyApikey(apikey, uid);
      case 2: return this.strictVerifyApikey(apikey, uid);
      default: return this.allReject(apikey.uid);
    }
  }
}

module.exports = _export;
