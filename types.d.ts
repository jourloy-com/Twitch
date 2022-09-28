
export interface UptimeChannel {
	username: string;
	notified: boolean;
	notifiedAt: Date;
}

export interface UptimeUsers {
	username: string;
	seconds: number;
}