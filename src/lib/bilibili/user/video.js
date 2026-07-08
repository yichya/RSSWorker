import { getItemFromDynamic, getDirectLinkFromModuleDynamic, queryToBoolean } from './dynamic.js';
import { renderRss2WithFilter } from '../../../utils/util';
import { GetDynSpace } from '../grpc_helper';

let deal = async (ctx) => {
	const { uid } = ctx.req.param();
	const directLink = ctx.req.query('directlink') !== '0';
	const useAvid = queryToBoolean(ctx.req.query('useavid'));
	let dynSpaceRes = await GetDynSpace(uid);
	let dynSpaceList = Array.isArray(dynSpaceRes.list) ? dynSpaceRes.list : [];
	let items = [];
	let globalUsername = '';
	if (dynSpaceList.length !== 0) {
		globalUsername = dynSpaceList[0].extend.origName;
	}
	if (!globalUsername) {
		throw new Error(`获取用户或动态信息失败`);
	}
	for (let card of dynSpaceList) {
		if (card.cardType !== 'av') {
			continue;
		}
		let { item, moduleDynamic } = getItemFromDynamic(card);
		let dynIdStr = card.extend?.dynIdStr || '';
		let directResult = moduleDynamic ? getDirectLinkFromModuleDynamic(moduleDynamic, useAvid, dynIdStr) : null;
		if (directResult) {
			let href = directLink ? directResult.url : `https://t.bilibili.com/${dynIdStr}`;
			item.description = (item.description || '') + `<br/>${directResult.label}：<a href="${href}">${href}</a>`;
			if (directLink) {
				item.link = directResult.url;
				item.guid = directResult.url;
			}
		}
		items.push(item);
	}

	let data = {
		title: `${globalUsername} 的 bilibili 视频`,
		link: `https://space.bilibili.com/${uid}/video`,
		description: `${globalUsername} 的 bilibili 视频`,
		language: 'zh-cn',
		// category: 'bilibili',
		items: items,
	};
	let rss = renderRss2WithFilter(data, ctx);
	ctx.header('Content-Type', 'application/xml');
	return ctx.body(`${rss}`);
};

let setup = (route) => {
	route.get('/bilibili/user/video/:uid', deal);
};

export default { setup };
