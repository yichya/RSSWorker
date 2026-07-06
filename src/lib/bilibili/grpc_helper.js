import { Device } from './gen/bilibili/metadata/device/device_pb.js';
import { Locale } from './gen/bilibili/metadata/locale/locale_pb.js';
import { Network, NetworkType } from './gen/bilibili/metadata/network/network_pb.js';
import { Metadata } from './gen/bilibili/metadata/metadata_pb.js';
import { DynSpaceReq, DynSpaceRsp } from './gen/bilibili/app/dynamic/v2/dynamic_pb.js';

const GRPC_HOST = 'grpc.biliapi.net';
const DYN_SPACE_PATH = '/bilibili.app.dynamic.v2.Dynamic/DynSpace';

let U8ToBase64 = function (u8) {
	return btoa(String.fromCharCode.apply(null, u8));
};

let getRandomBuvid = () => {
	let buvid = 'XX';
	let charSet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	for (let i = 0; i < 35; i++) {
		buvid += charSet.charAt(Math.floor(Math.random() * charSet.length));
	}
	return buvid;
};

let getBilibiliMetadata = (accessKey, buvid) => {
	const METADATA = {
		mobiApp: 'android',
		device: 'phone',
		build: 7490200,
		channel: 'bili',
		buvid: buvid,
		platform: 'android',
	};
	let device = new Device(METADATA);
	let locale = new Locale({
		timezone: 'Asia/Shanghai',
	});
	let network = new Network({
		type: NetworkType.WIFI,
	});
	let bili_metadata = new Metadata(METADATA);
	let authorization = 'identify_v1 ' + accessKey;

	let device_bin = device.toBinary();
	let locale_bin = locale.toBinary();
	let network_bin = network.toBinary();
	let bili_metadata_bin = bili_metadata.toBinary();

	let device_base64 = U8ToBase64(device_bin);
	let locale_base64 = U8ToBase64(locale_bin);
	let network_base64 = U8ToBase64(network_bin);
	let bili_metadata_base64 = U8ToBase64(bili_metadata_bin);
	return {
		device: device_base64,
		locale: locale_base64,
		network: network_base64,
		bili_metadata: bili_metadata_base64,
		authorization: authorization,
	};
};

let dataToGrpc = (data) => {
	let message = new Uint8Array(data);
	let length = message.length;
	let length_bytes = new Uint8Array(4);
	length_bytes[0] = (length >> 24) & 0xff;
	length_bytes[1] = (length >> 16) & 0xff;
	length_bytes[2] = (length >> 8) & 0xff;
	length_bytes[3] = length & 0xff;
	let data_bin = new Uint8Array(length + 5);
	data_bin[0] = 0;
	data_bin.set(length_bytes, 1);
	data_bin.set(message, 5);
	return data_bin;
};

const RETRY_MAX = 3;

let isRetryable = (e) => {
	if (e instanceof TypeError) {
		return true;
	}
	if (e.message && e.message.startsWith('HTTP 5')) {
		return true;
	}
	return false;
};

let requestFetchGrpc = async (url, headers, body_bin) => {
	let rsp = await fetch(url, {
		method: 'POST',
		headers: headers,
		body: body_bin,
	});
	if (rsp.status !== 200) {
		throw new Error(`HTTP ${rsp.status}: ${rsp.statusText}`);
	}
	let grpcStatus = rsp.headers.get('grpc-status');
	if (grpcStatus !== null && grpcStatus !== '0') {
		let grpcMessage = rsp.headers.get('grpc-message') || '';
		throw new Error(`gRPC status ${grpcStatus}: ${grpcMessage}`);
	}
	let rsp_bin = await rsp.arrayBuffer();
	if (rsp_bin.byteLength < 5) {
		throw new Error(`gRPC response body too short: ${rsp_bin.byteLength} bytes`);
	}
	let rsp_data = new Uint8Array(rsp_bin);
	if (rsp_data[0] !== 0) {
		throw new Error('compressed gRPC responses are not supported');
	}
	let message_length = (rsp_data[1] << 24) | (rsp_data[2] << 16) | (rsp_data[3] << 8) | rsp_data[4];
	if (message_length !== rsp_data.length - 5) {
		throw new Error(`gRPC message length mismatch: header ${message_length}, body ${rsp_data.length - 5}`);
	}
	let rsp_message = rsp_data.slice(5);
	let dynSpaceRsp = new DynSpaceRsp();
	dynSpaceRsp.fromBinary(rsp_message);
	return dynSpaceRsp.toJsonString();
};

let GetDynSpace = async (uid, accessKey = '') => {
	let { device, locale, network, bili_metadata, authorization } = getBilibiliMetadata(accessKey, getRandomBuvid());
	let req_bin = dataToGrpc(new DynSpaceReq({ hostUid: uid }).toBinary());
	let url = `https://${GRPC_HOST}${DYN_SPACE_PATH}`;
	let headers = {
		'Content-Type': 'application/grpc',
		'x-bili-metadata-bin': bili_metadata,
		'x-bili-device-bin': device,
		'x-bili-locale-bin': locale,
		'x-bili-network-bin': network,
		authorization: authorization,
		'User-Agent':
			'Dalvik/2.1.0 (Linux; U; Android 12; M2007J3SC Build/SKQ1.211006.001) 7.49.0 os/android model/M2007J3SC mobi_app/android build/7490200 channel/bili innerVer/7490210 osVer/12 network/2 grpc-java-cronet/1.36.1',
	};
	for (let i = 0; i < RETRY_MAX; i++) {
		try {
			return await requestFetchGrpc(url, headers, req_bin);
		} catch (e) {
			if (!isRetryable(e) || i === RETRY_MAX - 1) {
				throw e;
			}
			console.log(`[grpc] retry ${i + 1}/${RETRY_MAX - 1}: ${e.message}`);
		}
	}
};

export { GetDynSpace };
