var express = require('express');
var expressWs = require('express-ws');
var pako = require('pako');
var axios = require('axios');
var chalk = require('../lib/chalk');
var crc32 = require('../lib/crc').crc32;
var fs = require("fs");
var iconv = require('iconv-lite');
var WebSocket = require('ws');
var axios = require('axios');
var cmd = require('../lib/cmd');
var getFilesPath = require('../lib/getFilesPath');

var keyCheck = require('../lib/verifyApikey');

var router = express.Router();
expressWs(router);

// 写运行信息间隔
var writeInfoInterval = 30e3;
// 忽略的分区
const IGNORE_AREA = ['大事件', '学习', '生活'];
// 最大轮询每个分区的用户数量
const POLLING_AREA_MAX_USERS = 8;
// 最大轮询分区每一页的用户数量
const AREA_PAGE_MAX_USERS = 1;
// 最大各分区检查房间数量
const AREA_ROOM_MAX_SIZE = 50;
// 心跳超时时间 （ 客户端为 30e3 ）
const heartBeatTimeout = 45e3;

// 请求头
var myheader = {
  'Host': 'api.live.bilibili.com',
  'Connection': 'keep-alive',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache',
  'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'sec-ch-ua-mobile': '?0',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36',
  'Origin': 'https://live.bilibili.com',
  'Sec-Fetch-Site': 'same-site',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  'Referer': 'https://live.bilibili.com/',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7'
}

// 储存控制台指令的 json
const cmdList = {
  log: {
    pr: {
      hasParam: false,
      fn: printRunningInfo
    },
    i: {
      hasParam: true,
      fn: function (i) {
        if (isNaN(i)) {
          cmd.logOutput(chalk.warning('Command log :', 'interval NaN'));
        } else {
          writeInfoInterval = Number(i);
          cmd.logOutput('writeInfoInterval is set:', writeInfoInterval);
        }
      }
    }
  }
}
/**
 * 明天凌晨0点运行
 */
function runExactMidnight(callback, msg) {
  const t = new Date();
  t.setMinutes(t.getMinutes());
  t.setDate(t.getDate() + 1);
  t.setHours(0, 0, 0, 0);
  t.setMinutes(t.getMinutes());
  setTimeout(callback, t - Date.now());
  console.log(`将在${t}执行任务: `, chalk.success(msg));
}

/**
 * 清空天选 id 和 data 列表
 */
function clearAnchorList() {
  // 会导致统计不准确
  anchorIdList = [...anchorIdList.slice(0, 100)];
  anchorDataList = [...anchorDataList.slice(0, 100)];
  runExactMidnight(clearAnchorList, '清空天选 id 和 data 列表');
}

/**
 * 查找数组中的元素
 */
function findVal(arr, val) {
  try {
    if (!Array.isArray(arr)) return -1;
    return arr.findIndex(v => v == val); // 类型不必相同
  } catch (e) {
    console.log(chalk.error("findVal 出错"), arr, val, e);
  }
}

/**
 * 检查提交的天选数据是否正确
    @param {
      { id: number, gift_id?: number, gift_num?: number, roomid: number, award_name: string, time: number, require_type: number, joinPrice: number, uid: undefined}
    } obj
 */
function verfifyAnchordata(obj) {
  if (typeof obj !== 'object') return false;
  const propertyList = ['award_name', 'id', 'require_type', 'room_id', 'time'];
  for (const i of propertyList) {
    if (!obj.hasOwnProperty(i)) return false;
  }
  if (obj.time === 0) return false;
  return true;
}

/**
 * 检查天选数据是否有价值
 */
function checkAnchordata(obj) {
  // 忽略马上开奖的
  if (obj.time <= 1) return false;
  return true;
}

/**
 * 分发天选数据
 */
function handOutAnchorData() {
  return setInterval(function () {
    // 分发的 uid 列表 （字符串）
    const sendList = Object.keys(connectingUserInfo);
    // 天选数据为空则不分发
    if (anchorDataList.length === 0) return;
    // 所有天选数据的时间减一秒
    anchorDataList.forEach(function (data) { data.time-- })
    // 分发列表为空则不分发
    if (sendList.length === 0) return;
    const rawData = anchorDataList.splice(0, 1)[0];
    const finalData = JSON.stringify(rawData);
    console.log('准备分发天选数据: ', finalData);
    console.log('准备分发至uid列表: ', sendList);
    sendList.forEach(function (uid) {
      // 不给上传者分发数据
      if (findVal(connectingUserInfo[uid]['uploadId'], rawData.id) > -1) {
        // console.log(`uid=${uid}的已上传天选id列表: `, connectingUserInfo[uid]['uploadId']);
        return console.log(chalk.warning(`uid = ${uid} 是天选(id = ${rawData.id})的上传者，不分发`));
      }
      // 不分发没价值（比如快过期）的天选
      if (!checkAnchordata(rawData)) {
        return console.log(chalk.warning(`天选(id = ${rawData.id})无价值，不分发`));
      }
      console.log(chalk.success(`分发数据(id=${rawData.id})至uid: ${uid}`));
      connectingUserInfo[uid]['ws'].desend(`{"code":0,"type":"HAND_OUT_ANCHOR_DATA","data":${finalData}}`);
    });
    console.log('本轮分发结束');
  }, 1000);
}

// 用户信息
var connectingUserInfo = {}
// 天选数据
var anchorDataList = [];
// 天选 id 列表
var anchorIdList = [];
// 分区信息 id - name 对应
var area_data = {};
// 每个分区每一页的人数 id - page - 人数
var area_page_info = {};
// 任务人数统计
var task_count = {
  POLLING_LIVEROOMS: 0,
  POLLING_AREA_ALL: 0,
  POLLING_AREA: {}
};
// 统计 txt
var statPath = getFilesPath('stat.txt');
// 运行信息
var runningInfo = {
  onlineUidList: [],
  onlineUsersNum: 0,
  maxId: 0,
  minId: 0,
  coverage: 0,
  coverageStr: '0%',
  statTxt: null,
  encodeStat: null
}

/**
 * 获取 b站 分区信息
 */
function getAreaData() {
  axios.get('https://api.live.bilibili.com/room/v1/Area/getList', { headers: { myheader } }).then(response => {
    var res = response.data;
    if (res.code === 0) {
      console.log(chalk.success("AreaData https.get end. "));
      for (var r of res.data) {
        if (IGNORE_AREA.indexOf(r.name) > -1) continue;
        area_data[r.id] = r.name;
        area_page_info[r.id] = {};
        if (!task_count.POLLING_AREA[r.id]) task_count.POLLING_AREA[r.id] = 0;
      }
      console.log('分区信息: ', area_data);
    } else {
      console.log(chalk.warning(`获取b站分区信息出错: ${res.message}`))
    }
    // return runExactMidnight(getAreaData, '获取 b站 分区信息')
  });
}

/**
 * 打印在线信息
 */
function printRunningInfo() {
  console.log('当前共有 ', chalk.success(runningInfo.onlineUsersNum), ' 名用户在线，分别是 ', runningInfo.onlineUidList);
  console.log('任务人数统计:', task_count);
  console.log('各页详细信息: ', area_page_info);
  console.log('今日天选覆盖率为:', chalk.success(runningInfo.coverageStr), `, 共收集到了${anchorIdList.length}个天选`);
}

/**
 * 写在线信息
 * 写到本地后通过先驱qq机器人读取文件，实现群内的今日统计命令
 */
function writeRunningInfo() {
  var onlineUidList = Object.keys(connectingUserInfo);
  var onlineUsersNum = onlineUidList.length;
  var maxId = Math.max(...anchorIdList);
  var minId = Math.min(...anchorIdList)
  var coverage = anchorIdList.length > 1 ? (anchorIdList.length / (maxId - minId)) : 0;
  var coverageStr = String((coverage * 100).toFixed(2)) + "%";
  var statTxt = `当前共有${onlineUsersNum}名用户在线\r\n` +
    `任务人数统计: 轮询指定分区${task_count.POLLING_AREA_ALL}人，轮询开播直播间${task_count.POLLING_LIVEROOMS}人\r\n` +
    `今日天选覆盖率为: ${coverageStr}，共收集到了${anchorIdList.length}个天选`;
  var encodeStat = iconv.encode(statTxt, 'gbk');
  fs.writeFile(statPath, encodeStat, function (err) {
    if (err) console.log(chalk.error('write stat.txt failed: '), err);
  });
  runningInfo = {
    onlineUidList: onlineUidList,
    onlineUsersNum: onlineUsersNum,
    maxId: maxId,
    minId: minId,
    coverage: coverage,
    coverageStr: coverageStr,
    statTxt: statTxt,
    encodeStat: encodeStat
  }
}

router.ws('/', function (ws, req) {
  /** 压缩 */
  function deflate(data) {
    return pako.deflate(data);
  }
  /** 解压 */
  function inflate(data) {
    return pako.inflate(data, { to: "string" });
  }
  /** 心跳超时 */
  function hbTimeout() {
    return setTimeout(function () {
      ws.close(1000, `{"code":1,"type":"TIMEOUT","data":"心跳超时，断开连接"}`);
    }, heartBeatTimeout);
  }
  /** 自定义消息发送 - 压缩 */
  ws.desend = function (...arg) {
    try {
      ws.send(deflate(arg[0]));
    } catch (e) {
      console.log(chalk.error('desend failed:'));
    }
  }
  /** 用户信息 */
  var userInfo = {
    uid: undefined,
    apikey: undefined,
    task: undefined,
    area_id: undefined,
    page: undefined,
    ws: undefined,
    secret: undefined,
    uploadId: []
  }
  // 连接成功
  ws.desend(`{"code":0,"type":"WS_OPEN","data":"连接成功"}`);
  var verifyTimeout = setTimeout(function () {
    ws.close(1000, `{"code":1,"type":"TIMEOUT","data":"身份验证超时，断开连接"}`);
  }, 15e3);
  var heartBeat = hbTimeout();
  // 收到信息
  ws.on('message', function (msg) {
    if (msg === 'ping') {
      clearTimeout(heartBeat);
      try {
        ws.send('pong');
      } catch (e) {
        console.log(chalk.error('send failed:'));
      }
      heartBeat = hbTimeout()
    } else {
      var json;
      try {
        json = JSON.parse(inflate(new Uint8Array(msg)));
        if (!json.code) throw "数据格式有误";
      } catch (e) {
        console.log(chalk.error("chalk.error: ", e));
        return ws.close(1003, `{"code":2,"type":"ERR_NOT_JSON","data":"提交的数据格式有误，断开连接"}`);
      }
      switch (json.code) {
        case "VERIFY_APIKEY": {
          if (/*!json.apikey ||*/ !json.uid) return ws.close(1003, `{"code":3,"type":"ERR_VERIFY_APIKEY","data":"缺少apikey或uid，断开连接"}`);
          keyCheck.verify(json.apikey, json.uid).then(function (p) {
            if (!p) return ws.close(1000, `{"code":4,"type":"ERR_VERIFY_APIKEY","data":"apikey校验失败，断开连接"}`);
            else {
              // 校验成功
              console.log(chalk.success(`用户uid=${json.uid} apikey=${json.apikey || "无"} 已上线`));
              clearTimeout(verifyTimeout);
              // 设置个人信息
              connectingUserInfo[json.uid] = {};
              // 设置 secret
              connectingUserInfo[json.uid]['secret'] = crc32(json.apikey || "" + String(json.uid) + String(Date.now()));
              // 设置 uid
              userInfo.uid = json.uid;
              // 设置 apikey
              userInfo.apikey = json.apikey;
              connectingUserInfo[json.uid]['apikey'] = userInfo.apikey;
              // 设置 webSocket
              connectingUserInfo[json.uid]['ws'] = ws;
              // 分配任务
              handOutTask(userInfo.uid);
            }
          });
          break;
        }
        case "GET_TASK": {
          // 判断是否已经过 apikey 校验
          if (!connectingUserInfo.hasOwnProperty(json.uid) || connectingUserInfo[json.uid]['secret'] !== json.secret) return ws.close(1000, `{"code":5,"type":"ERR_UPDATE_ANCHOR_DATA","data":"未经过apikey校验，断开连接"}`);
          // 分配任务
          handOutTask(userInfo.uid);
          break;
        }
        case "UPDATE_ANCHOR_DATA": {
          // 判断是否已经过 apikey 校验
          if (!connectingUserInfo.hasOwnProperty(json.uid) || connectingUserInfo[json.uid]['secret'] !== json.secret) return ws.close(1000, `{"code":5,"type":"ERR_UPDATE_ANCHOR_DATA","data":"未经过apikey校验，断开连接"}`);
          // 判断是否有天选数据
          if (!json.data) return ws.close(1003, `{"code":-1,"type":"ERR_UPDATE_ANCHOR_DATA","data":"无天选数据，断开连接"}`);
          // 判断天选数据格式是否正确
          if (!verfifyAnchordata(json.data)) return ws.close(1007, `{"code":-2,"type":"ERR_UPDATE_ANCHOR_DATA","data":"天选数据格式错误，断开连接"}`);
          // 成功上传回复
          ws.desend(`{"code":0,"type":"RES_UPDATE_ANCHOR_DATA","data":{"id":${json.data.id}}}`);
          console.log(chalk.success(`成功上传天选数据(uid = ${userInfo.uid}) id = `), json.data.id);
          // 添加到该用户上传过的 id 列表中
          if (findVal(userInfo.uploadId, json.data.id) === -1) {
            userInfo.uploadId.push(json.data.id);
            // 若id 列表长度超过 200 则删除前 100
            if (userInfo.uploadId.length > 200) userInfo.uploadId.splice(0, 100);
            connectingUserInfo[userInfo.uid]['uploadId'] = [...userInfo.uploadId];
          } else {
            console.log(chalk.warning(`用户(uid = ${userInfo.uid})已上传过该天选(id = ${json.data.id})`));
          }
          // 若没有该数据则添加至天选时刻数据列表
          if (findVal(anchorIdList, json.data.id) === -1) {
            anchorIdList.push(json.data.id);
            anchorDataList.unshift(json.data);
          } else {
            console.log(chalk.warning(`当前上传者(uid = ${userInfo.uid}): 天选(id = ${json.data.id})已经被上传过了`));
          }
          break;
        }
        default: {
          ws.close(1003, `{"code":-3,"type":"ERR_UNKNOWN_CODE","data":"提交的code不合法，断开连接"}`);
        }
      }
    }
  });

  // 断开连接
  ws.on('close', function (code, reason) {
    console.log('用户下线', code, reason);
    clearTimeout(heartBeat);
    // 从 用户数据列表中 删除该用户
    if (userInfo.uid) delete connectingUserInfo[userInfo.uid];
    // 从事该任务的人数减一
    if (userInfo.task && userInfo.task === "POLLING_AREA") {
      task_count.POLLING_AREA_ALL--;
      if (!userInfo.page || !userInfo.area_id) return;
      task_count[userInfo.task][userInfo.area_id]--;
      area_page_info[userInfo.area_id][userInfo.page]--;
    }
    else if (userInfo.task) task_count[userInfo.task]--;
    if (userInfo.uid && userInfo.task) console.log(`用户uid = ${userInfo.uid} apikey = ${userInfo.apikey || "无"} 已下线`);
    else console.log(chalk.warning(`未通过验证的用户(${req.socket.remoteFamily} ${req.socket.remoteAddress} : ${req.socket.remotePort} )已下线`));
  });

  // 出错
  ws.on('error', function (ws, e) {
    ws.close(1000, "no reason (awpush)");
  });


  /**
   * 分配任务
   */
  function handOutTask(uid) {
    // 轮询各分区
    if (area_page_info !== {}) {
      for (var id in area_data) {
        if (task_count.POLLING_AREA[id] < POLLING_AREA_MAX_USERS) {
          if (userInfo.task && userInfo.task === 'POLLING_AREA') {
            if (!userInfo.page || !userInfo.area_id) return ws.close(1000, `{"code":-4,"type":"ERR_INFO","data":"用户身份信息有误，断开连接"}`);
            // 轮询指定分区，该任务计数 -1
            task_count[userInfo.task][userInfo.area_id]--;
            // 该页人数 -1
            area_page_info[userInfo.area_id][userInfo.page]--;
            // 分区总人数 -1
            task_count.POLLING_AREA_ALL--;
          }
          // 其他任务，该任务计数 -1
          else if (userInfo.task) task_count[userInfo.task]--;
          var page;
          for (var p = 1; p < 100; p++) {
            // 给用户分配分区的页数
            if (!area_page_info[id][p]) {
              area_page_info[id][p] = 1;
              page = p;
              break;
            }
            else if (p < AREA_PAGE_MAX_USERS) {
              area_page_info[id][p]++;
              page = p;
              break;
            }
          }
          var areaData = { id: id, name: area_data[id], page: page, size: AREA_ROOM_MAX_SIZE };
          ws.desend(`{"code":0,"type":"HAND_OUT_TASKS","data":{"task":"POLLING_AREA","max_room":100,"sleep_time":30000,"interval":500,"area_data":${JSON.stringify(areaData)},"secret":"${connectingUserInfo[uid]['secret']}"}}`);
          // 设置用户信息
          userInfo.task = 'POLLING_AREA';
          userInfo.area_id = id;
          userInfo.page = page;
          task_count.POLLING_AREA[id]++;
          task_count.POLLING_AREA_ALL++;
          connectingUserInfo[uid]['task'] = userInfo.task;
          connectingUserInfo[uid]['area_id'] = userInfo.area_id;
          return;
        }
      }
    }
    // 轮询开播直播间（各分区都满人了）
    ws.desend(`{"code":0,"type":"HAND_OUT_TASKS","data":{"task":"POLLING_LIVEROOMS","max_room":2000,"sleep_time":60000,"interval":500,"secret":"${connectingUserInfo[uid]['secret']}"}}`);
    if (userInfo.task && userInfo.task === 'POLLING_AREA') {
      // 轮询指定分区，该任务计数 -1
      task_count[userInfo.task][userInfo.area_id]--;
      // 该页人数 -1
      area_page_info[userInfo.area_id][userInfo.page]--;
      // 分区总人数 -1
      task_count.POLLING_AREA_ALL--;
    }
    // 其他任务，该任务计数 -1
    else if (userInfo.task) task_count[userInfo.task]--;
    // 设置用户信息
    userInfo.task = "POLLING_LIVEROOMS";
    task_count.POLLING_LIVEROOMS++;
    connectingUserInfo[uid]['task'] = userInfo.task;
  }
});

/**
 * 连接 go-cqhttp 的 websocket
 * 用来自动同意好友请求等
 */
function cqWebsocket() {
  const cq_access_token = process.myconfig.go_cqhttp.access_token;
  // 接收到这些qq号的入群邀请就同意
  const invite_white_list = process.myconfig.go_cqhttp.invite_white_list;
  var ws = new WebSocket(`ws://localhost:6700?access_token=${cq_access_token}`);
  ws.on('open', function open() {
    console.log(chalk.success('go-cqws 连接成功'));
  });
  ws.on('message', function incoming(data) {
    // console.log('go-cqws 收到消息', data);
    var json;
    try {
      json = JSON.parse(data);
    } catch (e) { return; }
    var flag = json.flag;
    switch (json.request_type) {
      case 'friend': {
        console.log('同意好友请求');
        axios.get(`http://localhost:5700/set_friend_add_request?flag=${flag}&access_token=${cq_access_token}`).then(response => {
          console.log('同意好友请求 response data', response.data);
        }).catch(e => console.log(chalk.error('error'), e));
        break;
      }
      case 'group': {
        if (json.sub_type === 'invite') {
          if (findVal(invite_white_list, json.user_id) === -1) return;
          console.log('同意入群邀请');
          axios.get(`http://localhost:5700/set_group_add_request?flag=${flag}&access_token=${cq_access_token}`).then(response => {
            console.log('同意入群邀请 response data', response.data);
          }).catch(e => console.log(chalk.error('error'), e));
          break;
        }
      }
    }
  });
  ws.on('close', function () {
    console.log(chalk.warning('cqws closed'))
  })
  ws.on('error', function (e) {
    console.log(chalk.error('cqws error'));
    ws.close();
  })
}

// 获取分区信息
getAreaData();

// 分发天选数据
handOutAnchorData();

// 写在线信息
setInterval(writeRunningInfo, writeInfoInterval);

// 每天0点清空天选列表
runExactMidnight(clearAnchorList, '清空天选 id 和 data 列表');

// go-cqhttp websocket
cqWebsocket();

// 控制台指令
cmd.setCommand(cmdList);
cmd.cmd();

module.exports = router;
