var crypto = require('crypto');
var fs = require("fs");
var path = require('path');

const config_path = path.join(path.resolve(__dirname, '..'), 'config', 'config.json');
var uid;
var config = JSON.parse(fs.readFileSync(config_path));
var salt1 = config.apikey.salt1;
var salt2 = config.apikey.salt2;
process.stdout.write('【生成并写入apikey】 请输入一个uid: ');
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  var chunk = process.stdin.read();
  if (chunk !== null) {
    uid = String(chunk).replace('\n', '').replace('\r', '');
    var apikey = crypto.createHash('md5').update(salt1 + uid + salt2).digest("hex");
    console.log("apikey: " + apikey);
    const filePath = path.join(__dirname, 'apikeys.json');
    fs.readFile(filePath, 'utf8', function (err, data = '') {
      if (err || data.length === 0) {
        return console.error('error: ', err)
      } else {
        var json = JSON.parse(data);
        json[uid] = apikey;
        const newData = JSON.stringify(json);
        fs.writeFile(filePath, newData, function (err) {
          if (err) {
            console.error('Wrtie data failed: ', err);
          }
          else {
            console.log('Wrtie data success');
          }
        });
      }
    });
  }
});

