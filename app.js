var createError = require('http-errors');
var http = require('http');
var https = require('https');
var express = require('express');
var expressWs = require('express-ws');
var path = require('path');
var fs = require('fs');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var chalk = require('./lib/chalk');
var setConfig = require('./lib/setConfig');

setConfig();

var indexRouter = require('./routes/index');
var apiV1Router = require('./routes/apiV1');
var wsRouter = require('./routes/ws');
var apikeyRouter = require('./routes/apikey');

var app = express();
var keyCheck = require('./lib/verifyApikey');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.all('*', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use('/', indexRouter);
app.use('/apikey', apikeyRouter);

app.use('/api/v1/anchor', function (req, res, next) {
  if (req.method === 'GET') {
    var apikey = req.query['apikey'];
    var uid = req.query['uid'];
    // 缺少 apikey 或 uid
    /*
    if (!apikey) {
      console.log(chalk.error("400 chalk.error: apikey required"));
      return res.send({ code: 400, msg: "apikey required" });
    }*/
    if (!uid) {
      console.log(chalk.error("400 chalk.error: uid required"));
      return res.send({ code: 400, msg: "uid required" });
    }
    // apikey 校验不通过
    keyCheck.verify(apikey, uid).then(function (p) {
      if (!p) {
        console.log(chalk.error("401 chalk.error: invalid api key apikey=" + apikey + " uid=" + uid));
        return res.send('{"code":401,"msg":"invalid api key"}');
      }
      else { next(); }
    }).catch(function (e) {
      console.log(chalk.error("READ apikeys ERROR: "), e);
    });
  } else if (req.method === 'POST') {
    getPostData(req).then(data => {
      var params = new URLSearchParams(data);
      req.body = paramsToObject(params);
      var apikey = req.body['apikey'];
      var uid = req.body['uid'];
      // 缺少 apikey 或 uid
      /*if (!apikey) {
        console.log(chalk.error("400 chalk.error: apikey required"));
        return res.send({ code: 400, msg: "apikey required" });
      }*/
      if (!uid) {
        console.log(chalk.error("400 chalk.error: uid required"));
        return res.send({ code: 400, msg: "uid required" });
      }
      // apikey 校验不通过
      keyCheck.verify(apikey, uid).then(function (p) {
        if (!p) {
          console.log(chalk.error("401 chalk.error: invalid api key apikey=" + apikey + " uid=" + uid));
          return res.send('{"code":401,"msg":"invalid api key"}');
        }
        else { next(); }
      }).catch(function (e) {
        console.log(chalk.error("READ apikeys ERROR: "), e);
      });
    }).catch(e => {
      console.log(chalk.error('500 getPostData error: '), e);
      res.send({ code: 500, msg: "getPostData error" })
    })
  }
});


app.use('/api/v1', apiV1Router);

app.use('/ws', wsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/**
 * 获取 post 请求的数据
 */
function getPostData(req) {
  return new Promise(function (resolve, reject) {
    var postdata = '';
    req.on('data', chunk => {
      postdata += chunk;
    });
    req.on('end', () => {
      resolve(postdata);
    });
    req.on('error', (e) => {
      reject(e);
    })
  })
}

/**
 * URLSearchParams 转 Object
 */
function paramsToObject(entries) {
  var obj = {};
  for (var entry of entries) { // each 'entry' is a [key, value] tupple
    const [key, value] = entry;
    obj[key] = value;
  }
  return obj;
}

/* istanbul ignore next */
if (!module.parent) {
  var httpServer = http.createServer(app).listen(3000, function () {
    console.log(chalk.success("http on 3000 port"));
  });
  var noHttps = false;
  try {
    var certificate = fs.readFileSync('./https/1_andywang.top_bundle.crt');
    var privateKey = fs.readFileSync('./https/2_andywang.top.key');
  } catch (e) {
    noHttps = true;
  }
  if (!noHttps) {
    var options = { key: privateKey, cert: certificate }
    var httpsServer = https.createServer(options, app).listen(3001, function () {
      expressWs(app, httpsServer, options);
      console.log(chalk.success("https / wss on 3001 port"));
    });
  } else {
    console.log(chalk.warning('no https'));
    expressWs(app, httpServer, options);
    console.log(chalk.success("ws on 3000 port"));
  }
}

module.exports = app;
