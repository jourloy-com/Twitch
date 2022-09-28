import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document, Types} from "mongoose";
import {UptimeChannel} from "../../types";

export type ConfigDocument = Config & Document;

@Schema()
export class Config {
	_id?: Types.ObjectId;

	@Prop()
	uptimeChannels: UptimeChannel[];
}

export const ConfigSchema = SchemaFactory.createForClass(Config);
