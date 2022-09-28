import {Injectable, Logger} from '@nestjs/common';
import * as tmi from "tmi.js";
import {TwitchAPI} from "./modules/api";
import {Model} from "mongoose";
import {Chatters, ChattersDocument} from "../schemas/chatters.schema";
import {InjectModel} from "@nestjs/mongoose";
import {Cron} from "@nestjs/schedule";
import {client} from "tmi.js";

@Injectable()
export class AppService {

	constructor(
		@InjectModel(Chatters.name) private userModel: Model<ChattersDocument>,
	) {
		const options = {
			options: {debug: false},
			connection: {
				cluster: `aws`,
				reconnect: true,
			},
			identity: {
				username: `jourlay`,
				password: this.env.TWITCH_KEY,
			},
			channels: this.channels,
		};
		this.client = new tmi.client(options);
		this.client.connect()
			.then(() => this.logger.log(`✅ Twitch`))
			.catch(e => this.logger.error(e));
		this.run().then();
	}

	private readonly logger = new Logger(AppService.name);
	private env = process.env;
	private channels = [`#jourloy`];
	private client: tmi.Client;
	private api = new TwitchAPI(this.env.TWITCH_KEY);

	/**
	 * It takes a number of seconds and returns a string in the format of HH:MM:SS
	 * @param {number} sec - number - The number of seconds to convert to HH:MM:SS format.
	 * @returns the hours, minutes, and seconds of the time in seconds.
	 */
	private toHHMMSS(sec: number) {
		const secNum = sec; // don't forget the second param
		const hours = Math.floor(secNum / 3600);
		const minutes = Math.floor((secNum - (hours * 3600)) / 60);
		const seconds = secNum - (hours * 3600) - (minutes * 60);

		let hoursStr = hours.toString();
		let minutesStr = minutes.toString();
		let secondsStr = seconds.toString();

		if (hours < 10) hoursStr = `0`+hours;
		if (minutes < 10) minutesStr = `0`+minutes;
		if (seconds < 10) secondsStr = `0`+seconds;
		return hoursStr+`:`+minutesStr+`:`+secondsStr;
	}

	/**
	 * It checks the current viewers of the stream and increments their seconds by one
	 * @returns the number of seconds a user has been in the chat.
	 */
	@Cron(`*/1 * * * * *`)
	private async checkUptimeUsers() {
		const streamInfo = (await this.api.getInformationAboutStream([`jourloy`]))[0];
		if (!streamInfo || !streamInfo.started_at) return;

		const data = await this.api.getCurrentChatters(`jourloy`);
		for (const user of data.chatters.viewers) {
			const u = await this.userModel.findOne({username: user}).exec();
			if (u) {
				u.seconds++;
				u.save();
			} else {
				await new this.userModel({
					username: user.toLowerCase(),
					seconds: 1
				}).save();
			}
		}
	}

	/**
	 * Get a user by username
	 * @param {string} username - The username of the user to be retrieved.
	 * @returns A promise that resolves to a user object.
	 */
	private async getUser(username: string) {
		return this.userModel.findOne({username: username}).exec();
	}

	private async run() {
		this.client.on(`message`, async (channel, userstate, message, self) => {
			if (self) return;

			const username = userstate[`username`].toLowerCase();
			const messageSplit = message.split(` `);
			const msSplit = messageSplit[0].split(`!`);
			const command = msSplit[1];

			if (command === `followerage`) {
				const user = await this.getUser(username);
				if (!user) await this.client.say(channel, `@${username}, ничего не нашел`);
				else await this.client.say(channel, `@${username}, ${this.toHHMMSS(user.seconds)}`);
			}
		});

		this.client.on(`ban`, async (channel, username, reason) => {
			if (!channel.includes(`jourloy`)) return;
			await this.userModel.findOneAndDelete({username});
		});
	}
}
