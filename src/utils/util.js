import atomTemplate from '../templates/atom.txt';
import rss2Template from '../templates/rss2.txt';

import mustache from 'mustache';

let renderAtom = (content) => {
	let renderedText = mustache.render(atomTemplate, content);
	return renderedText;
};

let renderRss2 = (content) => {
	let renderedText = mustache.render(rss2Template, content);
	return renderedText;
};

// RSSHub 兼容的 filter / filterout 查询参数：按 title/description/author/category 正则过滤
let applyFilter = (items, ctx) => {
	let filter = ctx.req.query('filter');
	let filterout = ctx.req.query('filterout');
	let caseSensitive = ctx.req.query('filter_case_sensitive') !== 'false';
	let makeRegex = (str) => {
		try {
			return new RegExp(str, caseSensitive ? '' : 'i');
		} catch (e) {
			return null;
		}
	};
	let getAuthorString = (item) => {
		if (!item.author) {
			return '';
		}
		return typeof item.author === 'string' ? item.author : item.author.name || '';
	};
	let getCategoryStrings = (item) => {
		if (!item.category) {
			return [];
		}
		return Array.isArray(item.category) ? item.category.filter((c) => typeof c === 'string') : [String(item.category)];
	};
	if (filter) {
		let regex = makeRegex(filter);
		if (regex) {
			items = items.filter((item) => {
				let title = item.title || '';
				let description = item.description || title;
				let author = getAuthorString(item);
				let category = getCategoryStrings(item);
				return regex.test(title) || regex.test(description) || regex.test(author) || category.some((c) => regex.test(c));
			});
		}
	}
	if (filterout) {
		let regex = makeRegex(filterout);
		if (regex) {
			items = items.filter((item) => {
				let title = item.title || '';
				let description = item.description || title;
				let author = getAuthorString(item);
				let category = getCategoryStrings(item);
				return !regex.test(title) && !regex.test(description) && !regex.test(author) && category.every((c) => !regex.test(c));
			});
		}
	}
	return items;
};

let renderRss2WithFilter = (data, ctx) => {
	if (data.items && data.items.length && ctx) {
		data = { ...data, items: applyFilter(data.items, ctx) };
	}
	data = { ...data, lastBuildDate: new Date().toUTCString() };
	return renderRss2(data);
};

export { renderAtom, renderRss2, renderRss2WithFilter, applyFilter };
