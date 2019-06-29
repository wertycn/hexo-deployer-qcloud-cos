'use strict'

// 引入必要类库
const rd = require('rd');
const fs = require('fs')
const path = require('path');
const chalk = require('chalk');
const COS = require('cos-nodejs-sdk-v5');
const inquirer = require('inquirer')



module.exports = function (args) {
    // 获取配置
    const config = getConfig(args, this)

    // 检查配置是否设置
    if (!checkConfig(config)) {
        return
    }
    // 实例化客户端
    const client = new COS({
        SecretId: config.SecretId,
        SecretKey: config.SecretKey
    });

    // 执行部署操作
    deploy(client, config)
}

// 必要方法封装

// 1 . 获取配置参数方法
function getConfig(args, hexo) {
    // 获取上传后在cos中保存的位置，默认为根目录
    let remoteDir = args.remotePath || '/'
    // 自动根据操作系统统一转换路径
    remoteDir = path.join(remoteDir)

    if (remoteDir == path.join("/")) {
        remoteDir = ""
    }
    // 获取public路径
    const config = {
        Region      : args.cosRegion,
        SecretId    : args.cosSecretId,
        SecretKey   : args.cosSecretKey,
        Bucket      : args.cosBucket,
        Appid       : args.cosAppid,
        localDir    : hexo.public_dir,
        remoteDir   : remoteDir,
        bucketAcl   : args.bucketAcl || 'public-read',
        // objectAcl   : args.objectAcl || 'public-read',
    }
    return config
}


// 检查参数是否配置
function checkConfig(config) {
    if (!config.SecretKey || !config.SecretId || !config.Bucket || !config.Appid || !config.Region) {
        let help = '';
        help += chalk.red('ERROR Deployer : 您应该在_config.yml 文件中进行部署配置的设置\n\n');
        help += chalk.rgb(42, 92, 170)('配置示例如下：\n');
        help += chalk.rgb(42, 92, 170)('  deploy: \n');
        help += chalk.rgb(42, 92, 170)('    type: qcloud-cos\n');
        help += chalk.rgb(42, 92, 170)('    cosRegion: <您的cos bucket所在区域代码>\n');
        help += chalk.rgb(42, 92, 170)('    cosSecretId: <您的cos accessKeyId>\n');
        help += chalk.rgb(42, 92, 170)('    cosSecretKey: <您的cos accessKeySecret>\n');
        help += chalk.rgb(42, 92, 170)('    cosBucket: <您的cos bucket名称>\n');
        help += chalk.rgb(42, 92, 170)('    cosAppid:  <您的腾讯云账户appid>\n');
        help += '如需更多帮助，您可以查看文档：' + chalk.underline('http://github.com/wertycn/hexo-deployer-qcloud-cos');
        console.log(help);
        return false;
    } else {
        return true;
    }
}

// 创建COS bucket
function createBucket(client,config){
    var params = {
        Bucket: config.Bucket + "-" + config.Appid,                        /* 必须 */
        Region: config.Region,
        ACL : config.bucketAcl,    /* 非必须 */
    };
    
    client.putBucket(params, function(err, data) {
        if(err) {
            console.log(err);
        } else {
            console.log("bucket %s 创建成功! 默认您需要在腾讯云控制台查看默认域名及添加自定义域名后即可正常访问博客，更多信息请查看%s" ,config.Bucket,chalk.underline("http://github.com/wertycn/hexo-deployer-qcloud-cos"));
            console.log(data)
            // 控制台交互
            inquirer.prompt([{
                type: 'confirm',
                name: 'res',
                message: '是否立即执行部署？ ',
                default: false
            }]).then((answers) => { 
                if (answers.res == true){
                    // 创建成功，执行上传操作
                    uploadPublicFiles(client,config)
                }else{
                    console.log("稍后再次执行hexo d命令即可部署")
                }
            })


        }
    });
}

// 判断bucket是否存在，配置参数是否拥有基本控制权限，配置是否正确
function deploy(client, config) {
    const params = {
        Bucket: config.Bucket + "-" + config.Appid,
        Region: config.Region
    }

    console.log("检查bucket配置中...")
    // 判断bucket 是否存在
    client.headBucket(params, function (err, data) {
        if (err) {
            if (err.statusCode == 404) {
                console.log("bucket %s不存在，您需要创建", config.Bucket)
                // 控制台交互
                inquirer.prompt([{
                    type: 'confirm',
                    name: 'res',
                    message: '配置中指定的bucket ' + config.Bucket + '不存在，请检查bucket及region是否配置正确，如确认不存在可输入Y由程序自动创建，请选择是否自动创建bucket ? ',
                    default: false
                }]).then((answers) => { 
                    if (answers.res == true){
                        createBucket(client,config)
                    }else{
                        console.log("请创建可用的bucket后再试！")
                    }
                })
            } else {
                console.log("bucket检查异常，请查看错误信息！")
                console.log(err);
            }
        } else {
            uploadPublicFiles(client,config)
        }
    });

    // bucket 存在，获取权限

    // bucket 不存在，控制台发送创建bucket 确认请求

    // 
}

// 获取对象KEY
function getObjectKey(localPath, config) {
    // 生成对象KEY
    let objectKey = path.join(config.remoteDir, localPath.split(config.localDir)[1])

    // windows下替换“\”为“/”
    objectKey = objectKey.split('\\').join('/');
    return objectKey
}

// 执行对象上传操作
function put(client, config, localPath, AgainNum = 0) {

    let objectKey = getObjectKey(localPath, config)

    try {
        client.putObject({
            Bucket: config.Bucket + "-" + config.Appid,                       
            Region: config.Region,
            Key: objectKey,                          
            Body: fs.createReadStream(localPath),          
            // ACL : config.objectAcl               //取消对象权限设置  COS 仅支持1000条对象级ACL策略 默认继承Bucket权限
        }, function (err, data) {
            if (err) {
                errRetry(client, config, localPath, AgainNum,err)
            } else {
                if (data.statusCode == 200) {
                    console.log("[%s] 部署成功:%s", chalk.green('Deployer info'), localPath)
                }
            }
        });
    } catch (e) {
        errRetry(client, config, localPath, AgainNum,e)
    }
}

// 上传public目录下所有文件
function uploadPublicFiles(client,config){
    console.log("即将开始部署...")

    rd.eachFileSync(config.localDir, function (f) {
        // 每找到一个文件都会调用一次此函数
        put(client, config, f)
    });
}

// 上传过程中出现错误将尝试重新上传，最多3次
function errRetry(client, config, localPath, AgainNum,err){
    AgainNum += 1
    if (AgainNum >= 3) {
        console.log("[%s] 部署异常[ 文件路径 : %s, KEY : %s] \n", chalk.green('Deployer error'), localPath, objectKey)
        console.log(err);
    } else {
        put(client, config, localPath, AgainNum)
    }
}







