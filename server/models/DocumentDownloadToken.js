import { Schema, model } from "mongoose";

const documentDownloadTokenSchema = new Schema(
	{
		// jti: token id（由後端產生，簽名 payload 內也會包含）
		tokenId: { type: String, required: true, unique: true, index: true },
		storagePath: { type: String, required: true, index: true },
		userId: { type: String, default: null, index: true },

		// expAt：token 過期時間（搭配 Mongo TTL 自動清理）
		expAt: { type: Date, required: true, index: true },

		// usedAt：一次性 token 消耗時間；未用過為 null
		usedAt: { type: Date, default: null, index: true }
	},
	{
		timestamps: true,
		versionKey: false
	}
);

// TTL：到期後自動清理（避免 DB 無限增長）
documentDownloadTokenSchema.index({ expAt: 1 }, { expireAfterSeconds: 600 });

export default model("DocumentDownloadToken", documentDownloadTokenSchema);

