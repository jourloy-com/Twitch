import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document, Types} from "mongoose";

export type UptimeChannelsDocument = UptimeChannels & Document;

@Schema()
export class UptimeChannels {
	_id?: Types.ObjectId;

	@Prop()
	username: string;

	@Prop()
	notified: boolean;

	@Prop({required: false})
	notifiedAt?: Date;
}

export const UptimeChannelsSchema = SchemaFactory.createForClass(UptimeChannels);
