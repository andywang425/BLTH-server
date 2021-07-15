# BLTH-server
BLTH 服务端。

## 开始
+ 安装`nodejs`: [Node.js中文网](http://nodejs.cn/download/)
+ 安装依赖: 切换到项目目录，输入命令 `npm install`。
+ 修改配置: 打开 config 目录下的 `config.example.json`，参考同目录下的README填写配置项，将其重命名为`config.json`。
+ SSL证书: 在 https 目录下添加SSL证书(`crt` 和 `key` 文件)。
+ 运行: 输入命令 `npm run start` 或 `node app.js`。

## 开放端口
+ 默认开放 `3000` (http) 和 `3001` (https) 端口。 

## 演示
+ 主页: http://localhost:3000
+ 文档: http://localhost:3000/docs (也可以在本地的`public/docs`目录中查看)

## 使用框架
+ [Express](https://github.com/expressjs/express)

## 许可证
BLTH-server 基于 [MIT](https://github.com/andywang425/BLTH-server/blob/master/LICENSE) 许可证开源。
