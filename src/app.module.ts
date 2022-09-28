import {Module} from '@nestjs/common';
import {AppController} from './app/app.controller';
import {AppService} from './app/app.service';
import {MongooseModule} from "@nestjs/mongoose";
import {ScheduleModule} from "@nestjs/schedule";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {Config, ConfigSchema} from "./schemas/config.schema";
import {Chatters, ChattersSchema} from "./schemas/chatters.schema";

@Module({
	imports: [
		ConfigModule.forRoot(),
		ScheduleModule.forRoot(),
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				uri: `mongodb://${configService.get<string>(`MONGO_HOST`)}/twitch${process.env.NODE_ENV !== `production` ? `dev` : ``}`,
			}),
			inject: [ConfigService],
		}),
		MongooseModule.forFeature([
			{name: Config.name, schema: ConfigSchema},
			{name: Chatters.name, schema: ChattersSchema}
		])
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {
}
