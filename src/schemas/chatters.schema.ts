import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Document, Types} from "mongoose";

export type ChattersDocument = Chatters & Document;

@Schema()
export class Chatters {
	_id?: Types.ObjectId;

	@Prop()
	username: string;

	@Prop()
	seconds: number;
}

export const ChattersSchema = SchemaFactory.createForClass(Chatters);
