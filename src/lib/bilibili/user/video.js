import { getItemFromDynamic, getDirectLinkFromCard, queryToBoolean } from './dynamic.js';
import { renderRss2WithFilter } from '../../../utils/util';
import { GetDynSpace } from '../grpc_helper';

let deal = async (ctx) => {
	const { uid } = ctx.req.param();
	const directLink = ctx.req.query('directlink') !== '0';
	const useAvid = queryToBoolean(ctx.req.query('useavid'));
	let dynSpaceResJson = await GetDynSpace(uid);
	let dynSpaceRes = JSON.parse(dynSpaceResJson);
	let dynSpaceList = Array.isArray(dynSpaceRes.list) ? dynSpaceRes.list : [];
	let items = [];
	let globalUsername = '';
	if (dynSpaceList.length !== 0) {
		globalUsername = dynSpaceList[0].extend.origName;
	}
	if (!globalUsername) {
		throw new Error(`获取用户 ${uid} 信息失败`);
	}
	for (let card of dynSpaceList) {
		if (card.cardType !== 'av') {
			continue;
		}
		let item = getItemFromDynamic(card);
		let directResult = getDirectLinkFromCard(card, useAvid);
		if (directResult) {
			let href = directLink ? directResult.url : `https://t.bilibili.com/${card.extend.dynIdStr}`;
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
