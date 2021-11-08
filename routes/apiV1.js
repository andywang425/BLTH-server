var express = require('express');
var router = express.Router();
var axios = require('axios');
var fs = require("fs");
var chalk = require('../lib/chalk');
var getFilesPath = require('../lib/getFilesPath');

const cq_access_token = process.myconfig.go_cqhttp.access_token;
const refreshTime = 60 * 60 * 1000; // 60 min
const anchor_max_room = 50;
var dbJson = {
  temp_notice: null,
  notice: null,
  BLTH: null,
  anchor: {
    roomList: null
  }
};
var lastVersion = "0";

/**
 * 比较版本号大小
 * @returns ver1 > ver2: 1; ver1 < ver2: -1; ver1 = ver2: 0
 */
function versionStringCompare(ver1 = '0', ver2 = '0') {
  function changeVersion2Num(ver) {
    return ver.match(/\d.*/)[0].split('.').reduce((total, value, index) => total + (0.01 ** index) * Number(value), 0);
  }
  const verNum1 = changeVersion2Num(ver1),
    verNum2 = changeVersion2Num(ver2);
  if (verNum1 > verNum2) return 1
  else if (verNum1 < verNum2) return -1
  else return 0;
}


/**
 * 返回时间字符串
 */
function timeString() {
  return new Date().toLocaleDateString() + new Date().toLocaleTimeString() + ": "
}

/**
 * 合并请求参数
 */
function keySign(obj) {
  let keys = Object.keys(obj).sort();
  let p = [];
  for (let key of keys) {
    p.push(`${key}=${encodeURIComponent(obj[key])}`);
  }
  return p.join('&');
}
/**
 * 向 go-cqhttp 发起请求
 */
function reqCqhttp(obj) {
  var api = obj.api;
  delete obj.api;
  obj.access_token = cq_access_token;
  var params = keySign(obj);
  // console.log('req url:', `http://localhost:5700/${api}?${params}`);
  return axios.get(`http://localhost:5700/${api}?${params}`).then(res => {
    console.log(timeString(), chalk.success("reqCqhttp end. "), res.data);
    var re = res.data;
    if (re.retcode === 0) return re;
    else throw re
  }).catch(e => {
    console.log(chalk.error('reqCqhttp ERROR: '), e.code);
    throw e.code;
  })
}

/**
 * 从jsdelivr请求notice.json（自执行）
 */
(function reqJson() {
  axios.get("https://cdn.jsdelivr.net/gh/andywang425/BLTH@master/assets/json/notice.min.json").then(res => {
      console.log(timeString(), chalk.success("notice https.get end. "));
      setTimeout(reqJson, refreshTime);
      if (versionStringCompare(res.data.version, lastVersion) === 1) {
        lastVersion = res.data.version;
        dbJson.temp_notice = res.data;
        reqBLTH();
      }
    }).catch(e => {
      console.log(chalk.error('ERROR: '), e);
      setTimeout(reqJson, refreshTime);
    });
})();

/**
 * 从jsdelivr请求 B站直播间挂机助手.js（ reqJson成功后若有新版本则执行 ）
 */
function reqBLTH() {
  axios.get("https://cdn.jsdelivr.net/gh/andywang425/BLTH@master/B%E7%AB%99%E7%9B%B4%E6%92%AD%E9%97%B4%E6%8C%82%E6%9C%BA%E5%8A%A9%E6%89%8B.user.js").then(res => {
      dbJson.BLTH = res.data;
      dbJson.notice = dbJson.temp_notice;
      console.log(timeString(), chalk.success("BLTH https.get end. "));
      fs.writeFile(getFilesPath('BLTH.js'), String(dbJson.BLTH), function (err) {
        if (err) console.log(chalk.error('write BLTH.js failed: '), err);
      });
      fs.writeFile(getFilesPath('notice.json'), JSON.stringify(dbJson.notice), function (err) {
        if (err) console.log(chalk.error('write notice.json failed: '), err);
      });
    }).catch(e => {
      console.log(chalk.error('ERROR: '), e.code);
      setTimeout(reqBLTH, refreshTime);
    });
};


/**
 * 获取notice.json
 * @returns {Promise} 字符串 
 */
function getJson() {
  var json = dbJson.notice;
  if (json) {
    console.log("notice: cache from db");
    return new Promise(function (resolve, reject) { resolve(json) });
  } else if (json === null) {
    var filePath = getFilesPath('notice.json');
    return new Promise(function (resolve, reject) {
      fs.readFile(filePath, 'utf8', function (err, data) {
        if (err || data.length === 0) {
          reject(err);
        } else {
          dbJson.notice = JSON.parse(data);
          resolve(dbJson.notice);
        }
      });
    });
  } else {
    return new Promise(function (resolve, reject) { reject("notice json is undefined") });
  }
}

/**
 * 获取 BLTH 脚本
 */
function getBLTH() {
  var scriptStr = dbJson.BLTH;
  if (scriptStr) {
    return new Promise(function (resolve, reject) { resolve(scriptStr) });
  } else if (scriptStr === null) {
    var filePath = getFilesPath('BLTH.js');
    return new Promise(function (resolve, reject) {
      fs.readFile(filePath, 'utf8', function (err, data) {
        if (err || data.length === 0) {
          reject(err);
        } else {
          dbJson.BLTH = data;
          resolve(data);
        }
      });
    });
  } else {
    return new Promise(function (resolve, reject) { reject("BLTH script is undefined") });
  }
}

/**
 * 获取天选时刻房间号列表
 */
function getAnchorRoomList(num) {
  var roomList = dbJson.anchor.roomList;
  if (roomList) {
    return new Promise(function (resolve, reject) { resolve(roomList.slice(0, num)) });
  } else if (roomList === null) {
    var filePath = getFilesPath('anchor_room_list.txt');
    return new Promise(function (resolve, reject) {
      fs.readFile(filePath, 'utf8', function (err, data = '') {
        if (err || data.length === 0) {
          reject(err);
        } else {
          dbJson.anchor.roomList = data.split(',');
          resolve(dbJson.anchor.roomList.slice(0, num));
        }
      });
    });
  } else {
    return new Promise(function (resolve, reject) { reject("AnchorRoomList is undefined") });
  }
}

router.get('/notice', function (req, res, next) {
  getJson().then(function (json) {
    res.send({ code: 0, data: json, msg: 'ok' });
  }).catch(function (error) {
    console.log(chalk.error('500 error: '), error);
    res.send({ code: 500, msg: 'Error: get notice json failed' });
  });
});


router.get('/BLTH.user.js', function (req, res, next) {
  getBLTH().then(function (str) {
    res.send(str);
  }).catch(function (error) {
    console.log(chalk.error('500 chalk.error: '), chalk.error);
    res.send("Error: get BLTH script failed");
  });
});

router.get('/anchor/getroomlist', function (req, res, next) {
  var num = Number(req.query['num']) || 100;
  if (num <= 0 || num > 100) num = 100;
  getAnchorRoomList(num).then(function (arr) {
    res.send({ code: 0, data: [...arr], msg: 'ok' });
  }).catch(function (error) {
    console.log(chalk.error('500 chalk.error: '), error);
    res.send({ code: 500, msg: 'get anchor roomlist failed' });
  })
});

router.post('/anchor/updateroomlist', function (req, res, next) {
  if (!req.body.roomList) return res.send({ code: 1, msg: 'no roomList' });
  var roomArray = req.body.roomList.split(',').filter(i => i.length > 0).filter(i => !isNaN(Number(i)));
  if (roomArray.length === 0) return res.send({ code: 1, msg: 'no valid rooms' });
  const filePath = getFilesPath('anchor_room_list.txt');
  fs.readFile(filePath, 'utf8', function (err, data = '') {
    if (err !== null && err.errno !== -4058) {
      console.log(chalk.error('file chalk.error'), err);
      return res.send({ code: 2, msg: 'read file error' });
    } else {
      var fileArray = data.split(",");
      var finalArray = [...new Set([...roomArray, ...fileArray])].splice(0, anchor_max_room);
      fs.writeFile(filePath, String(finalArray), function (err) {
        if (err) {
          console.log(chalk.error('write anchor_room_list.txt failed: '), err);
          return res.send({ code: 2, msg: 'write file error' });
        }
        else {
          res.send({ code: 0, msg: 'success' });
        }
      });
    }
  });
});

router.get('/qq/send_private_msg', function (req, res, next) {
  // example: https://andywang.top:3001/api/v1/qq/send_private_msg?user_id=2111097182&message=hello
  if (!req.query['user_id'] || !req.query['message']) return res.send({ code: 1, msg: 'user_id or message required' });
  var user_id = Number(req.query['user_id'])
  var message = req.query['message'];
  var auto_escape = true;
  var reqObj = {
    api: 'send_private_msg',
    user_id: user_id,
    message: message,
    auto_escape: auto_escape
  }
  reqCqhttp(reqObj).then(re => res.send({ code: 0, data: re, msg: 'success' }))
    .catch(e => res.send({ code: 2, data: e, msg: 'req go-cqhttp failed' }));
});

router.get('/qq/send_group_msg', function (req, res, next) {
  if (!req.query['group_id'] || !req.query['message'] || !req.query['super_key']) return res.send({ code: 1, msg: 'group_id or message required' });
  var group_id = Number(req.query['group_id']);
  var message = req.query['message'];
  var super_key = req.query['super_key'];
  if (process.myconfig.super_key !== super_key) {
    console.log(chalk.error('invalid super_key: super_key'))
    return res.send({ code: 2, msg: 'invalid super_key' });
  }
  var auto_escape = true;
  var reqObj = {
    api: 'send_group_msg',
    group_id: group_id,
    message: message,
    auto_escape: auto_escape
  };
  reqCqhttp(reqObj).then(re => res.send({ code: 0, data: re, msg: 'success' }))
    .catch(e => res.send({ code: 2, data: e, msg: 'req go-cqhttp failed' }));
})

module.exports = router;
