import {NestFactory} from "@nestjs/core";
import {AppModule} from "./app.module";
import {MicroserviceOptions, Transport} from "@nestjs/microservices";
import {ConfigService} from "@nestjs/config";
// eslint-disable-next-line @typescript-eslint/no-var-requires
require(`dotenv`).config();

async function bootstrap() {
	const host = new ConfigService().get(`RMQ_HOST`);
	const port = new ConfigService().get(`RMQ_PORT`);

	const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
		transport: Transport.RMQ,
		options: {
			urls: [`amqp://${host}:${port}`],
			queue: `jourloy_twitch`,
			queueOptions: {
				durable: false,
			},
		},
	});

	await app.listen();
}

bootstrap();
