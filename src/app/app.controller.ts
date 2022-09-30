import {Controller} from "@nestjs/common";
import {MessagePattern, Payload} from "@nestjs/microservices";
import {AppService} from "./app.service";

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@MessagePattern(`add-uptime`)
	async addUptimeChannel(@Payload() p: {username: string}) {
		return await this.appService.addUptimeChannel(p.username);
	}

	@MessagePattern(`remove-uptime`)
	async removeUptimeChannel(@Payload() p: {username: string}) {
		return await this.appService.removeUptimeChannel(p.username);
	}
}
