# RSSWorker

RSSWorker 是一个轻量级的 RSS 订阅工具，可以部署在 Cloudflare Worker 上。

## 支持

注：以下路由均在 `[域名]/rss/` 下，如 `https://example.com/rss/bilibili/user/dynamic/1`。
> 所有路由均支持以下全局查询参数（RSSHub 兼容）：
> - `filter=正则`：仅保留标题/描述/作者/分类匹配正则的条目。
> - `filterout=正则`：剔除标题/描述/作者/分类匹配正则的条目。
> - `filter_case_sensitive=false`：filter/filterout 大小写不敏感（默认敏感）。

- bilibili 动态 (/bilibili/user/dynamic/:uid)
- bilibili 视频 (/bilibili/user/video/:uid)

> bilibili 动态/视频路由会在描述末尾追加【视频地址】、【图文地址】等链接（与 RSSHub 行为一致）。
>
> bilibili 动态路由支持：
> - `directlink=1`：item 的 link 和 guid 指向内容直链（视频 `BV/AV` 号、专栏 `cv`、图文 `opus`、直播、番剧等）而非动态页 `https://t.bilibili.com/{dynIdStr}`（默认关闭）。
>
> bilibili 视频路由：
> - 默认使用直链（相当于 `directlink=1`），可通过 `directlink=0` 关闭。
>
> bilibili 动态/视频路由共同参数：
> - `useavid=1`：视频链接使用 AV 号（默认为 BV 号）。
>
> 用例：`https://example.com/rss/bilibili/user/dynamic/2267573?directlink=1&useavid=1&filterout=广告`
- telegram 频道 (/telegram/channel/:username)
- weibo 用户 (/weibo/user/:uid)
- 小红书用户 (/xiaohongshu/user/:uid)

> 小红书更新后不能再使用小红书号，需要使用小红书用户ID。  
> 获取方法：  
> 移动端：用户页面 > 右上角三个点 > 复制链接 > 获取链接中的用户ID  
> 网页端：用户页面 > 链接中的用户ID  
> 格式：https://www.xiaohongshu.com/user/profile/5d2aec020000000012037401

> 微博更新后需要加上Cookie
> 获取方法（参考 https://docs.rsshub.app/zh/deploy/config#%E5%BE%AE%E5%8D%9A ） ：
> 1. 打开并登录微博
> 2. 从个人微博主页的网址中获取uid，在`https://m.weibo.cn/api/container/getIndex?type=uid&value=`后追加uid，访问该链接
> 2. 按下F12打开控制台，切换至Network（网络）面板
> 3. 在该网页切换至任意关注分组，并在面板打开最先捕获到的请求 （该情形下捕获到的请求路径应包含/feed/group）
> 4. 查看该请求的Headers（请求头）, 找到Cookie字段并复制内容
> 5. 命令行中输入`wrangler secret put WEIBO_COOKIE`，按下回车后再将第4步中复制的Cookie字段粘贴，后按下回车

## 部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yllhwa/RSSWorker)

## 开发

在 `src/lib/[网站名称]/[功能]` 参照已有的 demo 添加脚本，然后在 `src/route.js` 中添加插件即可。

注意事项：
1. Cloudflare Worker 有最大打包体积限制（免费用户 1 MB，付费用户 10 MB），所以插件需要尽量轻量化。如使用 fetch 进行请求、使用 Cloudflare Worker 提供的 HTMLRewriter 进行 HTML 解析等。

模板引擎使用的格式为：

```js
let items = [
	{
		title: 'Bilibili User Dynamic',
		link: `https://space.bilibili.com/${uid}/dynamic`,
		description: 'Bilibili User Dynamic233',
		pubDate: new Date().toUTCString(),
		guid: `https://space.bilibili.com/${uid}/dynamic`,
		author: 'bilibili@bilibili.com',
		category: 'video',
		comments: `https://space.bilibili.com/${uid}/dynamic`,
		enclosure: {
			url: 'https://www.bilibili.com/favicon.ico',
			type: 'image/x-icon',
			length: 0,
		},
		source: {
			title: 'Bilibili',
			url: 'https://www.bilibili.com',
		},
	},
];
let data = {
    title: `bilibili 动态`,
    link: `https://space.bilibili.com/${uid}/dynamic`,
    description: `${globalUsername} 的 bilibili 动态`,
    language: 'zh-cn',
    category: 'bilibili',
    items: items,
};
```

## 致谢

- [RSSHub](https://github.com/DIYgod/RSSHub) 灵感和部分代码来源

- [NodeSupport](https://github.com/NodeSeekDev/NodeSupport)赞助了本项目

[![image](https://img.imgdd.com/a3ae28fb-ec40-451b-9470-b14aa6dc034a.png)](https://yxvm.com/)
