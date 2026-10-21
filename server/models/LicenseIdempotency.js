import { Schema, model } from "mongoose";

const licenseIdempotencySchema = new Schema(
	{
		key: { type: String, required: true, unique: true, trim: true },
		actorAccount: { type: String, required: true, trim: true },
		route: { type: String, required: true, trim: true },
		licenseId: { type: String, required: true, trim: true }
	},
	{
		timestamps: true,
		versionKey: false
	}
);

licenseIdempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default model("LicenseIdempotency", licenseIdempotencySchema);
