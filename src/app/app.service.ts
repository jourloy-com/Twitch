import {Inject, Injectable, Logger} from "@nestjs/common";
import * as tmi from "tmi.js";
import {TwitchAPI} from "./modules/api";
import {Model} from "mongoose";
import {Chatters, ChattersDocument} from "../schemas/chatters.schema";
import {InjectModel} from "@nestjs/mongoose";
import {Cron} from "@nestjs/schedule";
import {ClientProxy} from "@nestjs/microservices";
import {UptimeChannels, UptimeChannelsDocument} from "src/schemas/uptimeChannels.schema";
import {lastValueFrom} from "rxjs";
import {Streams, StreamsDocument} from "../schemas/streams.schema";

@Injectable()
export class AppService {
	constructor(
		@InjectModel(Chatters.name) private userModel: Model<ChattersDocument>,
		@InjectModel(Streams.name) private streamsModel: Model<StreamsDocument>,
		@InjectModel(UptimeChannels.name)
		private uptimeChannelsModel: Model<UptimeChannelsDocument>,
		@Inject(`DISCORD_SERVICE`) private discordRMQ: ClientProxy
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
		this.client
			.connect()
			.then(() => this.logger.log(`✅ Twitch`))
			.catch(e => this.logger.error(e));
		this.run().then();
	}

	private readonly logger = new Logger(AppService.name);
	private env = process.env;
	private channels = [`#jourloy`];
	private client: tmi.Client;
	private api = new TwitchAPI(this.env.TWITCH_KEY);
	private startedAt: Date | null;
	private finishCheck: Date | null;

	/**
	 * It takes a number of seconds and returns a string in the format of HH:MM:SS
	 * @param {number} sec - number - The number of seconds to convert to HH:MM:SS format.
	 * @returns the hours, minutes, and seconds of the time in seconds.
	 */
	private toHHMMSS(sec: number) {
		const secNum = sec; // don't forget the second param
		const hours = Math.floor(secNum / 3600);
		const minutes = Math.floor((secNum - hours * 3600) / 60);
		const seconds = secNum - hours * 3600 - minutes * 60;

		return (
			hours.toString() +
			`ч. ` +
			minutes.toString() +
			`м. ` +
			seconds.toString() +
			`с. `
		);
	}

	/**
	 * It checks if there are any channels that are currently streaming and notifies the user if they are
	 */
	@Cron(`*/10 * * * * *`)
	private async checkUptimeChannels() {
		const allChannels = await this.uptimeChannelsModel.find();

		const notNotifiedChannels = {};

		for (const channel of allChannels) {
			if (channel.notified && channel.notifiedAt) {
				const d = Date.now() - channel.notifiedAt.getTime();
				if (d > 1000 * 60 * 60 * 5) {
					channel.notified = false;
					channel.save();
				}
			} else notNotifiedChannels[channel.username] = channel;
		}

		if (Object.keys(notNotifiedChannels).length === 0) return;

		const streamInfo = await this.api.getInformationAboutStream(
			Object.keys(notNotifiedChannels)
		);

		for (const stream of streamInfo) {
			if (
				stream.started_at &&
				Date.now() - new Date(stream.started_at).getTime() < 1000 * 60 * 5
			) {
				const channel = notNotifiedChannels[stream.user_login];
				const state = await lastValueFrom(this.discordRMQ.send(`notify`, stream));
				if (!state) continue;
				channel.notified = true;
				channel.notifiedAt = new Date();
				channel.save();
			}
		}
	}

	/**
	 * It checks the current viewers of the stream and increments their seconds by one
	 * @returns the number of seconds a user has been in the chat.
	 */
	@Cron(`*/1 * * * * *`)
	private async checkUptimeUsers() {
		const streamInfo = (await this.api.getInformationAboutStream([`jourloy`]))[0];
		if (!streamInfo || !streamInfo.started_at) {
			if (!this.finishCheck && this.startedAt) this.finishCheck = new Date();
			else if (this.finishCheck && this.startedAt && Date.now() - this.finishCheck.getTime() > 1000 * 60 * 10) {
				await this.finishStream(await this.getOrCreateCurrentStream());
			}
			return;
		}

		if (!this.startedAt) this.startedAt = new Date();

		const data = await this.api.getCurrentChatters(`jourloy`);
		for (const user of data.chatters.viewers) {

			const stream = await this.getOrCreateCurrentStream();
			if (!stream.uptime[user]) stream.uptime[user] = 1;
			else stream.uptime[user]++;
			await stream.update();

			const u = await this.userModel.findOne({username: user}).exec();
			if (u) {
				u.seconds++;
				u.save();
			} else {
				await new this.userModel({
					username: user.toLowerCase(),
					seconds: 1,
				}).save();
			}
		}
	}

	/**
	 * It gets the current stream, or creates it if it doesn't exist
	 * @returns The current stream.
	 */
	private async getOrCreateCurrentStream(): Promise<StreamsDocument> {
		const date = new Date();

		let stream;
		let s = await this.streamsModel.find({startedAt: {$lt: date}, endedAt: null}).exec();
		s = s.sort((a, b) => (a.startedAt.getTime() - b.startedAt.getTime()));
		for (const _s of s) if (date.getTime() - _s.startedAt.getTime() <= 1000 * 60 * 60 * 24) stream = _s;

		if (!stream) {
			stream = await new this.streamsModel({
				messages: [],
				rewards: [],
				uptime: [],
				startedAt: date,
			}).save();
		}

		return stream;
	}

	/**
	 * It sends a message to the `stream-result` queue, and then waits for a response
	 * @param {StreamsDocument} stream - The stream document that was created when the stream started.
	 */
	private async finishStream(stream: StreamsDocument) {
		this.startedAt = null;
		this.finishCheck = null;
		await lastValueFrom(this.discordRMQ.send(`stream-result`, stream));
	}

	/**
	 * Get a user by username
	 * @param {string} username - The username of the user to be retrieved.
	 * @returns A promise that resolves to a user object.
	 */
	private async getUser(username: string) {
		return this.userModel.findOne({username: username}).exec();
	}

	/**
	 * Get the user, if they exist, increment their message count, and save them.
	 * @param {string} username - The username of the user to add a message to.
	 * @returns The user object
	 */
	private async addMessage(username: string) {
		const user = await this.getUser(username);
		if (!user) return;
		if (user.messages) user.messages++;
		else user.messages = 1;
		user.save();
	}

	private async run() {
		this.client.on(`message`, async (channel, userstate, message, self) => {
			if (self) return;

			const username = userstate[`username`].toLowerCase();
			const messageSplit = message.split(` `);
			const msSplit = messageSplit[0].split(`!`);
			const command = msSplit[1];
			const mod = userstate.mod || username === `jourloy`;
			const sub = userstate.subscriber;
			const reward = userstate[`custom-reward-id`] != null;
			const stream = await this.getOrCreateCurrentStream();

			await this.addMessage(username);

			if (!stream.messages[username]) stream.messages[username] = 1;
			else stream.messages[username]++;
			await stream.update();

			if (!reward && !mod && !sub && (message.includes(`http://`) || message.includes(`https://`))) {
				await this.client.deletemessage(channel, userstate.id);
			}

			if (command === `followerage`) {
				const user = await this.getUser(username);
				if (!user)
					await this.client.say(channel, `@${username}, ничего не нашел`);
				else
					await this.client.say(
						channel,
						`@${username}, ${this.toHHMMSS(user.seconds)}`
					);
			} else if (command === `клавиатура`) {
				await this.client.say(
					channel,
					`@${username}, хочешь себе крутую клаву? Открывай https://jourloy.com!`
				);
			}
		});

		this.client.on(`ban`, async (channel, username, reason) => {
			if (!channel.includes(`jourloy`)) return;
			await this.userModel.findOneAndDelete({username});
		});
	}

	/**
	 * It adds a new uptime channel to the database
	 * @param {string} username - The username of the user who's uptime you want to track.
	 */
	public async addUptimeChannel(username: string) {
		return await new this.uptimeChannelsModel({
			username: username.toLowerCase(),
			notified: false,
		})
			.save()
			.then(() => true)
			.catch(e => {
				this.logger.error(e);
				return false;
			});
	}

	/**
	 * It finds a document in the uptimeChannels collection that matches the username parameter, and then
	 * deletes it
	 * @param {string} username - The username of the user who's uptime channel you want to remove.
	 * @returns The document that was deleted.
	 */
	public async removeUptimeChannel(username: string) {
		return await this.uptimeChannelsModel.findOneAndDelete({username: username})
			.then(() => true)
			.catch(e => {
				this.logger.error(e);
				return false;
			});
	}
}
