# 注意

1. 请勿高频调用 API。
2. 接入 webSocket 后请完成服务端下发的任务并上传数据。
3. 请勿恶意上传错误或无效的数据。
4. 如果违反了上述规则可能导致你的 ip 被封禁。

# API v1

## 基本请求格式

HTTPS（推荐）: `GET/POST https://andywang.top:3001/api/v1<...>`

HTTP: `GET/POST http://andywang.top:3000/api/v1<...>`

后文中的请求地址只给出`<...>`的部分。

## 通用请求参数

所有请求中都应携带这些参数。

| 参数名 | 数据类型 | 默认值 |                      说明                      |
| :----: | :------: | :----: | :--------------------------------------------: |
|  uid   |   int    |        |  你的 B 站 uid，不携带该字段可能会被拒绝访问   |
| apikey |  string  |        | 服务器资源紧张时若不携带正确的该字段则拒绝访问 |

## 响应数据格式

除个别请求（如获取 BLTH 脚本），所有请求的响应数据均为 json，常见的字段有

| 字段名 | 数据类型 | 默认值 |             说明              |
| :----: | :------: | :----: | :---------------------------: |
|  code  |   int    |        | 成功时为`0`，失败时为其他数字 |
|  data  |   any    |        |      响应的主要数据内容       |
|  msg   |  string  |        |           额外信息            |

## 获取 notice

请求地址

`GET /notice`

响应内容

```json
{
  "code": 0,
  "data": {
    // BLTH 最新版本号
    "version": "5.7.3.4",
    // 天选时刻忽略关键字
    "anchor_blacklist_word": [
      "测试",
      "钓鱼",
      "炸鱼",
      ...
    ],
     // 天选时刻忽略直播间
    "anchor_ignore_roomlist": [
      48443, 58121, 66634,
      ...
    ]
  },
  "msg": "ok"
}
```

## 获取 BLTH 脚本

请求地址

`GET /BLTH.user.js`

响应内容

最新版 BLTH 的脚本代码。

## 获取大概率有天选时刻的 B 站直播间号

**推荐使用 WebSocket API，该 API 将来可能会被废弃**

请求地址

`GET /anchor/getroomlist`

请求参数

| 参数名 | 数据类型 | 默认值 |            说明             |
| :----: | :------: | :----: | :-------------------------: |
|  num   |   int    |        | 获取的直播间号数量，建议 50 |

响应内容

```json
{
  "code": 0,
  "data": [
    123123,
    456456,
    789789,
    ...
  ],
  "msg": "ok"
}
```

## 上传有天选时刻的 B 站直播间号

**推荐使用 WebSocket API，该 API 将来可能会被废弃**

请求地址

`POST /anchor/updateroomlist`

请求参数

|  参数名  | 数据类型 | 默认值 |        说明        |
| :------: | :------: | :----: | :----------------: |
| roomList |  int[]   |        | 直播间号组成的数组 |

响应内容

```json
{ "code": 0, "msg": "success" }
```

## QQ 私聊消息推送

**由于机器人经常被封号，该 API 将来可能会被废弃**

请求地址

`GET /qq/send_private_msg`

请求参数

| 参数名  | 数据类型 | 默认值 |                            说明                            |
| :-----: | :------: | :----: | :--------------------------------------------------------: |
| user_id |   int    |        | 你的 qq 号，使用前请先用该账号加机器人(qq：2397433013)好友 |
| message |  string  |        |               推送的消息（需经过 URI 编码）                |

响应内容

```json
{
  "code": 0,
  // 此处的 data 为 go-cqhttp 的响应内容
  "data": {
    "code": 0,
    "data": {
      "data": { "message_id": -114514 },
      "retcode": 0,
      "status": "ok"
    },
    "msg": "success"
  },
  "msg": "success"
}
```

## QQ 群消息推送

**由于机器人经常被封号，该 API 将来可能会被废弃**

请求地址

`GET /qq/send_group_msg`

请求参数

|  参数名   | 数据类型 | 默认值 |                                                       说明                                                        |
| :-------: | :------: | :----: | :---------------------------------------------------------------------------------------------------------------: |
| group_id  |   int    |        | 群号，使用前请先邀请机器人(qq：2397433013)入群（你的 qq 号必须在`config`中的`invite_white_list`内才能完成该操作） |
|  message  |  string  |        |                                           推送的消息（需经过 URI 编码）                                           |
| super_key |  string  |        |                                        身份校验，若该字段不正确则拒绝请求                                         |

响应内容

```json
{
  "code": 0,
  // 此处的 data 为 go-cqhttp 的响应内容
  "data": {
    "code": 0,
    "data": {
      "data": { "message_id": -114514 },
      "retcode": 0,
      "status": "ok"
    },
    "msg": "success"
  },
  "msg": "success"
}
```

# webSocket

## webSocket 地址

WSS（推荐）: `wss://andywang.top:3001/ws`

WS: `ws://andywang.top:3000/ws`

## 通信数据格式

除心跳外，所有数据都经过`deflate`算法压缩后再传输。相关库有

|    语言    |                  项目                  |
| :--------: | :------------------------------------: |
| Javascript | [pako](https://github.com/nodeca/pako) |
|   Python   |                  zlib                  |

## 响应数据格式

除心跳外，响应数据均为 json，常见的字段有

| 字段名 | 数据类型 | 默认值 |             说明              |
| :----: | :------: | :----: | :---------------------------: |
|  code  |   int    |        | 成功时为`0`，失败时为其他数字 |
|  type  |  string  |        |      表示响应数据的种类       |
|  data  |   any    |        |         主要响应内容          |

## 连接

连接成功后响应以下内容

```json
{ "code": 0, "type": "WS_OPEN", "data": "连接成功" }
```

## 心跳

连接成功后需每 30 秒发送一次心跳包，内容为`ping`(不压缩)。服务端收到后会返回`pong`(不压缩)。如果服务端超过 45 秒没有收到心跳包则断开连接。

## 进行身份校验并获得任务

身份校验需在连接成功后的 15 秒内完成，否则服务端将断开连接。

请求

```json
{
  "code": "VERIFY_APIKEY",
  "uid": 123, // 你的B站uid
  "apikey": "apikey" // 服务器资源紧张时若不携带正确的apikey则拒绝访问
}
```

响应

```json
// 第一种
{
  "code": 0,
  "type": "HAND_OUT_TASKS",
  "data": {
    "task": "POLLING_AREA",
    "max_room": 100,
    "sleep_time": 30000,
    "interval": 500,
    "area_data": {
      "id": "5",
      "name": "电台",
      "page": 1,
      "size": 50
    },
    "secret": "11a45e14"
  }
}
```

```json
// 第二种
{
  "code": 0,
  "type": "HAND_OUT_TASKS",
  "data": {
    "task": "POLLING_LIVEROOMS",
    "max_room": 2000,
    "sleep_time": 60000,
    "interval": 500,
    "secret": "11a45e14"
  }
}
```

部分字段说明

|     字段名      | 数据类型 | 默认值 |                                               说明                                                |
| :-------------: | :------: | :----: | :-----------------------------------------------------------------------------------------------: |
|    data.task    |  string  |        | 下发的任务，目前有 POLLING_AREA（轮询指定分区）和 POLLING_LIVEROOMS（轮询已关注的开播直播间）两种 |
|  data.max_room  |   int    |        |  检查房间的最大数量（被分发到新的任务后请不要丢弃之前的任务中所收集到的房间号，除非超过这个值）   |
| data.sleep_time |   int    |        |                                完成该轮任务后的休息时间，单位毫秒                                 |
|  data.interval  |   int    |        |                               轮询时每两次请求的间隔时间，单位毫秒                                |
|  area_data.id   |   int    |        |                                    你所要轮询的 B 站分区的 id                                     |
| area_data.page  |   int    |        |                            你所要轮询的分区的页数（如 2 是轮询第二页）                            |
| area_data.size  |   int    |        |                                          每一页的房间数                                           |
|   **secret**    |  string  |        |                      **非常重要，之后客户端的所有通信都要携带 secret 字段**                       |

## 完成任务并上报数据

按服务端的指示完成任务，以下给出完成任务的基本思路。

### POLLING_AREA

获取指定分区一页的直播间，逐一检测是否有天选时刻或者红包抽奖。
若有则将抽奖数据取出，放在上传数据的`data`字段里。

### POLLING_LIVEROOMS

获取关注且已开播的直播间（如果太多可以只获取部分），逐一检测是否有天选时刻或者红包抽奖。
若有则将抽奖数据取出，放在上传数据的`data`字段里。

获得抽奖数据后请立刻上传，天选时刻数据的上传格式如下

```json
{
  "code": "UPDATE_ANCHOR_DATA",
  "uid": 123, // 你的B站uid
  "secret": "11a45e14",
  "data": {
    /*  
      你之前储存的data，
      其中有几个很长的字段是不必要的，
      建议在上传前删掉节约流量:
      asset_icon, url, web_url
    */
    "award_image": "",
    "award_name": "自印帆布袋",
    "award_num": 1,
    "award_users": [],
    "cur_gift_num": 0,
    "current_time": 1625126465,
    "danmu": "嘻嘻嘻",
    "gift_id": 0,
    "gift_name": "",
    "gift_num": 1,
    "gift_price": 0,
    "goaway_time": 180,
    "goods_id": -99998,
    "id": 1390563,
    "join_type": 0,
    "lot_status": 0,
    "require_text": "至少成为主播的舰长",
    "require_type": 3,
    "require_value": 3,
    "room_id": 21700355,
    "send_gift_ensure": 0,
    "show_panel": 1,
    "status": 1,
    "time": 319
  }
}
```

红包抽奖数据的上传格式如下

```json
{
  "code": "UPDATE_POPULARITY_REDPOCKET_DATA",
  "uid": 123, // 你的B站uid
  "secret": "11a45e14",
  "data": {
    "data": {
      "lot_id": 3011938,
      "sender_uid": 35356805,
      "sender_name": "这就是凯西",
      "join_requirement": 1,
      "danmu": "老板大气！点点红包抽礼物！",
      "awards": [
        {
          "gift_id": 31212,
          "num": 2,
          "gift_name": "打call"
        },
        {
          "gift_id": 31214,
          "num": 3,
          "gift_name": "牛哇"
        },
        {
          "gift_id": 31216,
          "num": 3,
          "gift_name": "i了i了"
        }
      ],
      "start_time": 1653664363,
      "end_time": 1653664543,
      "last_time": 180,
      "remove_time": 1653664558,
      "replace_time": 1653664553,
      "current_time": 1653664442,
      "lot_status": 1,
      "user_status": 2,
      "lot_config_id": 3,
      "total_price": 1600,
      "wait_num": 0,
      "roomid": 23423267,
      "uid": 431856380
    }
  }
}
```

成功上传后服务端会回复，天选时刻的回复格式如下

```json
{
  "code": 0,
  "type": "RES_UPDATE_ANCHOR_DATA",
  "data": {
    "id": 1390563 // 你刚刚上传的天选id
  }
}
```

红包抽奖的回复格式如下

```json
{
  "code": 0,
  "type": "RES_UPDATE_POPULARITY_REDPOCKET_DATA",
  "data": {
    "lot_id": 3011938 // 你刚刚上传的红包id
  }
}
```

## 休息

完成一轮任务后你可以休息一段时间，具体时长为你之前获得的`sleep_time`。

## 再次申请任务

休息完就该继续做工了，申请任务的格式如下

```json
{
  "code": "GET_TASK",
  "uid": 123, // 你的B站uid
  "secret": "11a45e14",
};
```

然后你就会获得一个新的任务，具体响应格式与前文[进行身份校验并获得任务](#进行身份校验并获得任务)中提到的相同。

## 任务流程总结

```
连 接  ──────► 身 份 校 验  ──────► 获 得 任 务  ──────► 完 成 任 务 并 上 报 数 据  ──────► 休 息  ──────► 申 请 任 务
                                                                  ▲                                       │
                                                                  │                                       │
                                                                  └───────────────────────────────────────┘

```

## 接收抽奖数据

服务端下发的天选数据格式如下

```json
{
  "code": 0,
  "type": "HAND_OUT_ANCHOR_DATA",
  "data": {
    "id": 1390609,
    "room_id": 22885932,
    "status": 1,
    "award_name": "小月卡",
    "award_num": 1,
    "award_image": "",
    "danmu": "免费带活动满分",
    "time": 595,
    "current_time": 1625127343,
    "join_type": 1,
    "require_type": 1,
    "require_value": 0,
    "require_text": "关注主播",
    "gift_id": 20010,
    "gift_name": "凉了",
    "gift_num": 1,
    "gift_price": 100,
    "cur_gift_num": 0,
    "goaway_time": 180,
    "award_users": [],
    "show_panel": 1,
    "lot_status": 0,
    "send_gift_ensure": 0,
    "goods_id": 15
  }
}
```

红包抽奖数据格式如下

```json
{
  "code": 0,
  "type": "HAND_OUT_POPULARITY_REDPOCKET_DATA",
  "data": {
    "lot_id": 3012523,
    "sender_uid": 1820663886,
    "sender_name": "LS互娱",
    "join_requirement": 1,
    "danmu": "老板大气！点点红包抽礼物！",
    "awards": [
      {
        "gift_id": 31212,
        "num": 2,
        "gift_name": "打call"
      },
      {
        "gift_id": 31214,
        "num": 3,
        "gift_name": "牛哇"
      },
      {
        "gift_id": 31216,
        "num": 3,
        "gift_name": "i了i了"
      }
    ],
    "start_time": 1653665240,
    "end_time": 1653665420,
    "last_time": 180,
    "remove_time": 1653665435,
    "replace_time": 1653665430,
    "current_time": 1653665365,
    "lot_status": 1,
    "user_status": 2,
    "lot_config_id": 3,
    "total_price": 1600,
    "wait_num": 4,
    "roomid": 24709555,
    "uid": 523155004
  }
}
```

<!-- 最后要做的便是调用 B 站 API 参加天选

`POST api.live.bilibili.com/xlive/lottery-interface/v1/Anchor/Join`

|  字段名  | 数据类型 | 默认值 |                  说明                  |
| :------: | :------: | :----: | :------------------------------------: |
|    id    |   int    |        |                天选 id                 |
| platform |  string  |   pc   |                                        |
| gift_id  |   int    |        | 送出礼物的 id（免费天选可忽略该参数）  |
| gift_num |   int    |        | 送出礼物的数量（免费天选可忽略该参数） | -->
