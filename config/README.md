## CONFIG 配置项含义

```jsonc
{
  "apikey": {
    /** apikey校验等级
     *  -1: 全部拒绝
     *   0: 全部通过
     *   1: 弱校验, 仅校验 apikey 是否正确
     *   2: 强校验, 校验 apikey 是否正确并读取 apikeys.json 判断结果是否相符
     */
    "verify_level": 0,
    // 添加在 apikey 之前的盐（建议修改）
    "salt1": "salt before apikey",
    // 添加在 apikey 之后的盐（建议修改）
    "salt2": "salt after apikey"
  },
  "go_cqhttp": {
    // go-cqhttp 鉴权时用的 token
    "access_token": "token"
  }
}
```
