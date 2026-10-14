import { Schema, model } from "mongoose";

const schema = new Schema(
	{
		lineUserId: {
			type: String,
			required: true,
			unique: true
		},
		crmCustomerId: {
			type: String,
			required: true,
			index: true
		},
		crmCustomerCode: {
			type: String,
			default: ""
		},
		taxId: {
			type: String,
			required: true
		},
		companyName: {
			type: String,
			default: ""
		},
		verifiedOrderNo: {
			type: String,
			default: ""
		}
	},
	{
		timestamps: true,
		versionKey: false
	}
);

export default model("LineCustomerBinding", schema);
