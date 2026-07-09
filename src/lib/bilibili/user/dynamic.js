import { renderRss2WithFilter } from '../../../utils/util';
import { GetDynSpace } from '../grpc_helper';

let getPubDate = (ptimeLabelText) => {
	let pubDate = new Date().toUTCString();
	try {
		if (ptimeLabelText.indexOf('小时前') !== -1) {
			let hour = ptimeLabelText.split('小时前')[0];
			pubDate = new Date(new Date().getTime() - hour * 60 * 60 * 1000).toUTCString();
		} else if (ptimeLabelText.indexOf('分钟前') !== -1) {
			let minute = ptimeLabelText.split('分钟前')[0];
			pubDate = new Date(new Date().getTime() - minute * 60 * 1000).toUTCString();
		} else if (ptimeLabelText.indexOf('刚刚') !== -1) {
			pubDate = new Date().toUTCString();
		} else if (ptimeLabelText.indexOf('昨天') !== -1) {
			let hour = ptimeLabelText.split('昨天')[1].split(':')[0];
			let minute = ptimeLabelText.split('昨天')[1].split(':')[1];
			let yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
			pubDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), hour, minute).toUTCString();
		} else if (ptimeLabelText.indexOf('天前') !== -1) {
			let day = ptimeLabelText.split('天前')[0];
			pubDate = new Date(new Date().getTime() - day * 24 * 60 * 60 * 1000).toUTCString();
		} else if (ptimeLabelText.indexOf('年') !== -1) {
			let year = ptimeLabelText.split('年')[0];
			let month = ptimeLabelText.split('年')[1].split('月')[0];
			let day = ptimeLabelText.split('年')[1].split('月')[1].split('日')[0];
			pubDate = new Date(year, month - 1, day).toUTCString();
		} else {
			let year = new Date().getFullYear();
			let month = ptimeLabelText.split('月')[0];
			let day = ptimeLabelText.split('月')[1].split('日')[0];
			pubDate = new Date(year, month - 1, day).toUTCString();
		}
	} catch (e) {}
	return pubDate;
};

let extractModuleInfo = (card) => {
	let info = {
		ptimeLabelText: '',
		authorName: '',
		descText: '',
		moduleDynamic: null,
		moduleOpusCovers: [],
	};
	for (let _module of card.modules || []) {
		switch (_module.moduleType) {
			case 'module_author':
				info.ptimeLabelText = _module.moduleAuthor?.ptimeLabelText || '';
				info.authorName = _module.moduleAuthor?.author?.name || '';
				break;
			case 'module_desc':
				info.descText = _module.moduleDesc?.text || '';
				break;
			case 'module_dynamic':
				info.moduleDynamic = _module.moduleDynamic || null;
				break;
			case 'module_opus_summary':
				info.moduleOpusCovers = _module.moduleOpusSummary?.covers || [];
				break;
		}
	}
	return info;
};

let getItemFromDynamicForward = (card, modInfo) => {
	// title
	let title = '';
	for (let desc of card.extend.desc || []) {
		title += desc.text;
	}
	// link
	let link = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	// description
	let description = title + '<br/>';
	description += `转发自：@${card.extend.origName}<br/>`;
	for (let desc of card.extend.origDesc || []) {
		description += desc.text;
	}
	if (card.extend.origImgUrl) {
		description += `<br/><img src="${card.extend.origImgUrl}"/>`;
	}
	let pubDate = getPubDate(modInfo.ptimeLabelText);
	let guid = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	let author = modInfo.authorName;
	let category = card.cardType;
	return {
		title: title,
		link: link,
		description: description,
		pubDate: pubDate,
		guid: guid,
		author: author,
		category: category,
	};
};

let getItemFromDynamicAv = (card, modInfo) => {
	// title
	let title = '';
	for (let desc of card.extend.origDesc || []) {
		title += desc.text;
	}
	if (!title) {
		title = modInfo.descText;
	}
	// link
	let link = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	// description
	let description = title + '<br/>';
	if (card.extend.origImgUrl) {
		description += `<img src="${card.extend.origImgUrl}"/>`;
	}
	let pubDate = getPubDate(modInfo.ptimeLabelText);
	let guid = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	let author = modInfo.authorName;
	let category = card.cardType;
	if (modInfo.descText && modInfo.descText !== title) {
		description += `<br/>${modInfo.descText}`;
	}
	return {
		title: title,
		link: link,
		description: description,
		pubDate: pubDate,
		guid: guid,
		author: author,
		category: category,
	};
};

let getItemFromDynamicOpus = (card, modInfo) => {
	// title: opus 自带标题 > desc > module_desc > opus 正文
	let title = getTextFromParagraph(card.extend?.opusSummary?.title);
	if (!title) {
		for (let desc of card.extend.desc || []) {
			title += desc.text;
		}
	}
	if (!title) {
		title = modInfo.descText;
	}
	let opusText = getTextFromParagraph(card.extend?.opusSummary?.summary);
	if (!title) {
		title = opusText;
	}
	// link
	let link = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	// description: title + opus 正文 + 封面图 + module_desc
	let description = title + '<br/>';
	if (opusText && opusText !== title) {
		description += opusText + '<br/>';
	}
	// covers: extend.opusSummary（draw 卡片）和 module_opus_summary（article 卡片）
	let covers = card.extend?.opusSummary?.covers || [];
	if (!covers.length) {
		covers = modInfo.moduleOpusCovers;
	}
	for (let cover of covers) {
		description += `<img src="${cover.src}"/><br/>`;
	}

	let pubDate = getPubDate(modInfo.ptimeLabelText);
	let guid = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	let author = modInfo.authorName;
	let category = card.cardType;
	if (modInfo.descText && modInfo.descText !== title) {
		description += `<br/>${modInfo.descText}`;
	}
	return {
		title: title,
		link: link,
		description: description,
		pubDate: pubDate,
		guid: guid,
		author: author,
		category: category,
	};
};

let getItemFromDynamicDefault = (card, modInfo) => {
	let title = '';
	let link = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	let description = '';
	let pubDate = getPubDate(modInfo.ptimeLabelText);
	let guid = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	let author = modInfo.authorName;
	let category = card.cardType;
	if (modInfo.descText) {
		title = modInfo.descText;
	}
	if (title === '') {
		for (let desc of card.extend?.desc || []) {
			title += desc.text;
		}
	}
	return {
		title: title,
		link: link,
		description: description,
		pubDate: pubDate,
		guid: guid,
		author: author,
		category: category,
	};
};

let getItemFromPaidDynamic = (card, modInfo) => {
	let pubDate = getPubDate(modInfo.ptimeLabelText);
	let author = modInfo.authorName;
	let category = card.cardType;
	return {
		title: '充电专属动态',
		link: `https://t.bilibili.com/${card.extend.dynIdStr}`,
		description: '充电专属动态',
		pubDate: pubDate,
		guid: `https://t.bilibili.com/${card.extend.dynIdStr}`,
		author: author,
		category: category,
	};
};

let queryToBoolean = (val) => {
	if (val === undefined || val === null) {
		return false;
	}
	return val === '1' || val === 'true' || val === 'True' || val === 'TRUE';
};

// 从 Paragraph 结构中提取纯文本
let getTextFromParagraph = (paragraph) => {
	if (!paragraph) {
		return '';
	}
	if (paragraph.text && Array.isArray(paragraph.text.nodes)) {
		let result = '';
		for (let node of paragraph.text.nodes) {
			if (node.rawText) {
				result += node.rawText;
			} else if (node.word?.words) {
				result += node.word.words;
			}
		}
		return result.replace(/\n/g, '<br/>');
	}
	return '';
};

// 从动态卡片中提取内容直链（视频/专栏/音频/直播等），返回 { url, text }，失败返回 null
let getDirectLinkFromModuleDynamic = (dynModule, useAvid = false, dynIdStr = '') => {
	if (!dynModule) {
		return null;
	}
	let build = (url, label) => (url ? { url, text: `${label}：<a href="${url}">${url}</a>`, label } : null);
	if (dynModule.dynArchive) {
		const archive = dynModule.dynArchive;
		const id = useAvid ? `av${archive.avid}` : archive.bvid;
		const url = id ? `https://www.bilibili.com/video/${id}` : archive.jumpUrl;
		return build(url, '视频地址');
	}
	if (dynModule.dynDraw) {
		// 图文动态：使用动态 id 拼接 opus 直链，回退到 API 跳转地址
		if (dynIdStr) {
			return build(`https://www.bilibili.com/opus/${dynIdStr}`, '图文地址');
		}
		let uri = dynModule.dynDraw.uri;
		if (uri) {
			uri = uri.startsWith('//') ? `https:${uri}` : uri;
		}
		return build(uri, '图文地址');
	}
	if (dynModule.dynArticle) {
		const url = dynModule.dynArticle.id ? `https://www.bilibili.com/read/cv${dynModule.dynArticle.id}` : dynModule.dynArticle.uri;
		return build(url, '专栏地址');
	}
	if (dynModule.dynMusic) {
		const url = dynModule.dynMusic.id ? `https://www.bilibili.com/audio/au${dynModule.dynMusic.id}` : dynModule.dynMusic.uri;
		return build(url, '音频地址');
	}
	if (dynModule.dynCommonLive) {
		return build(`https://live.bilibili.com/${dynModule.dynCommonLive.id}`, '直播间地址');
	}
	if (dynModule.dynLiveRcmd) {
		try {
			const roomId = JSON.parse(dynModule.dynLiveRcmd.content || '{}')?.live_play_info?.room_id;
			if (roomId) {
				return build(`https://live.bilibili.com/${roomId}`, '直播间地址');
			}
		} catch (e) {}
	}
	if (dynModule.dynPgc) {
		const url = dynModule.dynPgc.epid ? `https://www.bilibili.com/bangumi/play/ep${dynModule.dynPgc.epid}` : dynModule.dynPgc.jumpUrl || dynModule.dynPgc.uri;
		return build(url, '剧集地址');
	}
	if (dynModule.dynUgcSeason) {
		return build(dynModule.dynUgcSeason.jumpUrl, '合集地址');
	}
	if (dynModule.dynCommon) {
		return build(dynModule.dynCommon.uri || dynModule.dynCommon.jumpUrl, '地址');
	}
	if (dynModule.dynForward) {
		// 转发卡：递归取源动态的内容直链（使用源动态自身的 dynIdStr）
		return getDirectLinkFromCard(dynModule.dynForward.item, useAvid);
	}
	return null;
};

let getDirectLinkFromCard = (card, useAvid = false) => {
	if (!card || !Array.isArray(card.modules)) {
		return null;
	}
	let dynIdStr = card.extend?.dynIdStr || '';
	for (let module of card.modules || []) {
		if (module.moduleType === 'module_dynamic') {
			return getDirectLinkFromModuleDynamic(module.moduleDynamic, useAvid, dynIdStr);
		}
	}
	return null;
};

let getItemFromDynamicLive = (card, modInfo) => {
	let title = '';
	let description = '';
	let pubDate = getPubDate(modInfo.ptimeLabelText);
	let guid = `https://t.bilibili.com/${card.extend.dynIdStr}`;
	let author = modInfo.authorName;
	let category = card.cardType;
	let dyn = modInfo.moduleDynamic;
	if (dyn) {
		if (dyn.dynCommonLive) {
			let live = dyn.dynCommonLive;
			title = live.title || '';
			if (live.cover) {
				description += `<img src="${live.cover}"/><br/>`;
			}
			description += (title + '<br/>');
			if (live.coverLabel) {
				description += `${live.coverLabel}<br/>`;
			}
			if (live.coverLabel2) {
				description += `${live.coverLabel2}<br/>`;
			}
		} else if (dyn.dynLiveRcmd) {
			let rcmd = dyn.dynLiveRcmd;
			try {
				let info = JSON.parse(rcmd.content || '{}')?.live_play_info;
				if (info) {
					title = info.title || '';
					if (info.cover) {
						description += `<img src="${info.cover}"/><br/>`;
					}
					if (info.area_name) {
						description += `${info.area_name}`;
					}
					if (info.watched_show?.text_large) {
						description += `·${info.watched_show.text_large}`;
					}
					description += '<br/>';
				}
			} catch (e) {}
		}
	}
	if (modInfo.descText) {
		description += `<br/>${modInfo.descText}`;
	}
	return {
		title: title,
		link: `https://t.bilibili.com/${card.extend.dynIdStr}`,
		description: description,
		pubDate: pubDate,
		guid: guid,
		author: author,
		category: category,
	};
};

let getItemFromDynamic = (card) => {
	let modInfo = extractModuleInfo(card);
	let item;
	if (card.extend.onlyFansProperty.isOnlyFans) {
		item = getItemFromPaidDynamic(card, modInfo);
	} else {
		switch (card.cardType) {
			case 'forward':
				item = getItemFromDynamicForward(card, modInfo);
				break;
			case 'av':
				item = getItemFromDynamicAv(card, modInfo);
				break;
			case 'draw':
			case 'article':
				item = getItemFromDynamicOpus(card, modInfo);
				break;
			case 'live':
			case 'live_rcmd':
				item = getItemFromDynamicLive(card, modInfo);
				break;
			default:
				item = getItemFromDynamicDefault(card, modInfo);
				break;
		}
	}
	return { item, moduleDynamic: modInfo.moduleDynamic };
};

let deal = async (ctx) => {
	const { uid } = ctx.req.param();
	const directLink = ctx.req.query('directlink') === '1';
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
		let { item, moduleDynamic } = getItemFromDynamic(card);
		let dynIdStr = card.extend?.dynIdStr || '';
		let directResult = moduleDynamic ? getDirectLinkFromModuleDynamic(moduleDynamic, useAvid, dynIdStr) : null;
		if (directResult) {
			let href = directLink ? directResult.url : `https://t.bilibili.com/${dynIdStr}`;
			item.description = (item.description || '') + `<br/>${directResult.label}：<a href="${href}">${href}</a>`;
			if (directLink) {
				item.link = directResult.url;
				if (card.cardType !== 'live' && card.cardType !== 'live_rcmd') {
					item.guid = directResult.url;
				}
			}
		} else if (dynIdStr && (card.cardType === 'draw' || card.cardType === 'article')) {
			let opusUrl = `https://www.bilibili.com/opus/${dynIdStr}`;
			let href = directLink ? opusUrl : `https://t.bilibili.com/${dynIdStr}`;
			let label = card.cardType === 'article' ? '专栏地址' : '图文地址';
			item.description = (item.description || '') + `<br/>${label}：<a href="${href}">${href}</a>`;
			if (directLink) {
				item.link = opusUrl;
				item.guid = opusUrl;
			}
		} else if (dynIdStr && (card.cardType === 'live' || card.cardType === 'live_rcmd')) {
			let href = `https://t.bilibili.com/${dynIdStr}`;
			item.description = (item.description || '') + `<br/>直播间地址：<a href="${href}">${href}</a>`;
			if (directLink) {
				item.link = href;
			}
		}
		items.push(item);
	}

	let data = {
		title: `${globalUsername} 的 bilibili 动态`,
		link: `https://space.bilibili.com/${uid}/dynamic`,
		description: `${globalUsername} 的 bilibili 动态`,
		language: 'zh-cn',
		// category: 'bilibili',
		items: items,
	};
	let rss = renderRss2WithFilter(data, ctx);
	ctx.header('Content-Type', 'application/xml');
	return ctx.body(`${rss}`);
};

let setup = (route) => {
	route.get('/bilibili/user/dynamic/:uid', deal);
};

export default { setup };
export { getItemFromDynamic, getDirectLinkFromCard, getDirectLinkFromModuleDynamic, queryToBoolean };
