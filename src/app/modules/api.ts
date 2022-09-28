import axios from "axios";

export class TwitchAPI {
	constructor(t: string) {
		this.token = t;
	}

	private readonly token: string;
	private clientID = process.env.TWITCH_CLIENT_ID;

	/**
	 * It sends a request to the given URL, and returns the response data as a JSON object
	 * @param {string} u - The URL to send the request to.
	 * @returns The response data is being returned.
	 */
	private async sendRequest(u: string) {
		const headers = {
			Authorization: `Bearer ${this.token}`,
			"Client-Id": this.clientID,
		};
		const response = await axios.get(u, {headers: headers});
		if (response && response.data) {
			return response.data;
		}
		return null;
	}

	/**
	 * It takes an array of strings, and returns an array of objects.
	 * @param {string[]} c - string[] - An array of channel names to get information about.
	 * @returns An array of StreamData objects.
	 */
	public async getInformationAboutStream(c: string[]) {
		let q = ``;
		for (const cc of c) {
			q += `user_login=${cc}`;
			if (c.indexOf(cc) !== c.length - 1) q += `&`;
		}
		q = q.trim();
		const url = new URL(
			`https://api.twitch.tv/helix/streams?${q}`
		).toString();
		const data: StreamData = await this.sendRequest(url);
		return (data && data.data) ? data.data : [];
	}

	/**
	 * It gets the current chatters of a channel.
	 * @param {string} c - The channel name
	 * @returns The current chatters in the channel.
	 */
	public async getCurrentChatters(c: string) {
		const url = new URL(`https://tmi.twitch.tv/group/user/${c}/chatters`).toString();
		const data: ChattersData = await this.sendRequest(url);
		return (data) ? data : null;
	}
}

export interface Stream {
	id: number;
	user_id: string;
	user_login: string;
	user_name: string;
	game_id: number;
	game_name: string;
	type: string;
	title: string;
	viewer_count: string;
	started_at: Date;
	language: string;
	thumbnail_url: string;
	tag_ids: string[];
	is_mature: boolean;
}

export interface ChattersData {
	chatter_count: number,
	chatters: {
		broadcaster: string[],
		vips: string[],
		moderators: string[],
		staff: string[],
		admins: string[],
		global_mods: string[],
		viewers: string[],
	}
}

export interface StreamData {
	data: Stream[];
	pagination: {
		cursor: string;
	};
}