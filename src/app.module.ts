import {Module} from '@nestjs/common';
import {AppController} from './app/app.controller';
import {AppService} from './app/app.service';
import {MongooseModule} from "@nestjs/mongoose";
import {ScheduleModule} from "@nestjs/schedule";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {Config, ConfigSchema} from "./schemas/config.schema";
import {Chatters, ChattersSchema} from "./schemas/chatters.schema";
import {ClientsModule, Transport} from "@nestjs/microservices";
import { UptimeChannels, UptimeChannelsSchema } from './schemas/uptimeChannels.schema';

@Module({
	imports: [
		ConfigModule.forRoot(),
		ScheduleModule.forRoot(),
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				uri: `mongodb://${configService.get<string>(`MONGO_HOST`)}/jourloy`,
			}),
			inject: [ConfigService],
		}),
		MongooseModule.forFeature([
			{name: Config.name, schema: ConfigSchema},
			{name: Chatters.name, schema: ChattersSchema},
			{name: UptimeChannels.name, schema: UptimeChannelsSchema},
		]),
		ClientsModule.register([
			{
				name: `DISCORD_SERVICE`,
				transport: Transport.RMQ,
				options: {
					urls: [`amqp://${process.env.RMQ_HOST}:${process.env.RMQ_PORT}`],
					queue: `jourloy_discord`,
					queueOptions: {
						durable: false
					},
				},
			},
		]),
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {
}
