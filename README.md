# hexo腾讯云COS一键部署工具hexo-deployer-qcloud-cos使用说明

在您的hexo项目目录下执行：

```
    npm install hexo-deployer-qcloud-cos --save
```

在hexo项目配置文件`_config.yml`中添加如下部署配置：

```
deploy:
    type: qcloud-cos
    cosRegion: <您的cos bucket所在区域代码>
    cosSecretId: <您的cos accessKeyId>
    cosSecretKey: <您的cos accessKeySecret>
    cosBucket: <您的cos bucket名称>
    cosAppid:  <您的腾讯云账户appid>
  
```

注意：

> COS术语请参考 [COS术语信息](https://cloud.tencent.com/document/product/436/7751)
>
> region  代码查找请参照[腾讯云可用地域代码](https://cloud.tencent.com/document/product/436/6224)
>
> SecretId及SecretKey可在腾讯云控制台[云API密钥](https://console.cloud.tencent.com/cam/capi)获取，强烈建议您遵循最佳实践使用子用户的SecretId和SecretKey进行相关操作，而不要使用根帐户的Secret操作
>
> appid在腾讯云控制台右上角 【腾讯云用户名】>账户信息>基本信息 中可以查看，如果您已经创建bucket，控制台显示的name-125xxxxx 格式的bucket名称中，name部分为我们需要配置的cosBucket的值，125xxxxx就是appid
>
> 需要说明的是新版本的腾讯云COS SDK已将appid参数废弃，合并到bucket参数中，但为便于部署工具在用户未创建bucket时直接使用部署工具创建bucket，我们仍将使用appid参数



配置完成后，执行部署命令

```
hexo d
```

注意：

> 1. 通过此部署工具上传的文件默认指定权限为 `public-read`即公共读私有写,便于公网用户访问博客内容  
>
> 2. 默认情况下，将文件上传到bucket的根目录下，如果需要部署到其他目录，请在deploy下添加remotePath选项进行指定
>
>    ```
>    remotePath: <您要部署的目录,默认为/>
>    ```
>
> 3. 执行`hexo d`命令后，部署工具会检查bucket是否存在及是否具备访问权限，如果bucket不存在，命令行将进行创建bucket确认，回复y后将按照配置文件中的设置创建一个新的bucket
>
> 4. 部署工具自动创建的bucket 默认权限为 `private` 即私有读写，bucket中的对象如果不指定权限将继承bucket的权限。如果需要修改，请在配置中添加bucketAcl选项指定bucket权限
>
>    ```
>    bucketAcl: <自动创建的bucket权限 仅可设置为 private , public-read , public-read-write> 
>    ```
>
> 5. 对bucket权限的修改不会影响通过部署工具上传的文件的权限，通过部署工具上传的文件均已指定权限为`public read`,如确有必要修改上传文件的权限，请在配置文件中添加`objectAcl`选项指定
>
>    ```
>    objectAcl: <部署工具上传的文件权限 仅可设置为 private , public-read , public-read-write>
>    ```

首次在腾讯云COS部署hexo 博客后，您还需要在控制台进行一些相关的设置，具体请参考[COS域名管理](https://cloud.tencent.com/document/product/436/18424)及[COS设置静态网站](https://cloud.tencent.com/document/product/436/14984)



使用中有任何问题可联系作者或者在[github wertycn](https://github.com/wertycn/hexo-deployer-qcloud-cos/issues)中进行反馈
