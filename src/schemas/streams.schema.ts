import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document, Types} from "mongoose";

export class RewardData {
	[username: string]: {
		[rewardType: string]: number;
	}
}

export class StringNumberData {
	[username: string]: number;
}

export type StreamsDocument = Streams & Document;

@Schema()
export class Streams {
	_id?: Types.ObjectId;

	@Prop({type: StringNumberData})
	messages: StringNumberData;

	@Prop({type: RewardData})
	rewards: RewardData;

	@Prop({type: StringNumberData})
	uptime: StringNumberData;

	@Prop()
	startedAt: Date;

	@Prop()
	endedAt?: Date;
}

export const StreamsSchema = SchemaFactory.createForClass(Streams);