import { StatusCodes } from "http-status-codes";
import LineCustomerBinding from "../../models/LineCustomerBinding.js";
import crmClient from "../../services/crm/crmClient.js";
import { ApiError, successResponse } from "../../utils/responseHandler.js";
import { pushTextMessage } from "../../services/lineService.js";

const toMeResult = (binding) => {
	if (!binding) {
		return { bound: false, customer: null };
	}
	return {
		bound: true,
		customer: {
			crmCustomerId: binding.crmCustomerId,
			crmCustomerCode: binding.crmCustomerCode,
			taxId: binding.taxId,
			companyName: binding.companyName,
			verifiedOrderNo: binding.verifiedOrderNo
		}
	};
};

const customerScope = (req) => ({
	lineUserId: req.lineUserId
});

export const getMe = async (req, res) => {
	const binding = await LineCustomerBinding.findOne({ lineUserId: req.lineUserId }).lean();
	return successResponse(res, StatusCodes.OK, "OK", { result: toMeResult(binding) });
};

export const verifyOrder = async (req, res) => {
	const orderNo = String(req.body?.orderNo || "").trim();
	const taxId = String(req.body?.taxId || "").trim();

	if (!orderNo || !taxId) {
		throw ApiError.badRequest("請輸入訂單編號與統一編號");
	}
	// CRM Customer Hub：統編須為 8 位數字字串（保留前導零）
	if (!/^\d{8}$/.test(taxId)) {
		throw ApiError.badRequest("統一編號須為 8 位數字");
	}

	const verified = await crmClient.verifyOrder({ orderNo, taxId });
	const customer = verified.customer;
	const crmCustomerId = String(customer.id);

	const binding = await LineCustomerBinding.findOneAndUpdate(
		{ lineUserId: req.lineUserId },
		{
			lineUserId: req.lineUserId,
			crmCustomerId,
			crmCustomerCode: customer.code || "",
			taxId: String(customer.taxId ?? taxId),
			companyName: customer.companyName || "",
			verifiedOrderNo: verified.order?.poNumber || verified.order?.id || orderNo
		},
		{ upsert: true, new: true, setDefaultsOnInsert: true }
	).lean();

	return successResponse(res, StatusCodes.OK, "綁定成功", {
		result: {
			...toMeResult(binding),
			order: verified.order
		}
	});
};

export const listOrders = async (req, res) => {
	const { page, limit, status } = req.query;
	const data = await crmClient.listOrders(
		req.hubBinding.crmCustomerId,
		{ page, limit, status },
		customerScope(req)
	);
	return successResponse(res, StatusCodes.OK, "OK", { result: data });
};

export const getOrder = async (req, res) => {
	const order = await crmClient.getOrder(
		req.hubBinding.crmCustomerId,
		req.params.id,
		customerScope(req)
	);
	return successResponse(res, StatusCodes.OK, "OK", { result: { order } });
};

export const listServiceTickets = async (req, res) => {
	const { page, limit, status } = req.query;
	const data = await crmClient.listServiceTickets(
		req.hubBinding.crmCustomerId,
		{ page, limit, status },
		customerScope(req)
	);
	return successResponse(res, StatusCodes.OK, "OK", { result: data });
};

export const getServiceTicket = async (req, res) => {
	const ticket = await crmClient.getServiceTicket(
		req.hubBinding.crmCustomerId,
		req.params.id,
		customerScope(req)
	);
	return successResponse(res, StatusCodes.OK, "OK", { result: { ticket } });
};

export const createServiceTicket = async (req, res) => {
	const title = String(req.body?.title || "").trim();
	const description = String(req.body?.description || "").trim();
	if (!title || !description) {
		throw ApiError.badRequest("請填寫案件標題與問題描述");
	}

	const idempotencyKey = String(
		req.headers["idempotency-key"] || req.body?.idempotencyKey || ""
	).trim();

	const ticket = await crmClient.createServiceTicket(
		req.hubBinding.crmCustomerId,
		{
			title,
			description,
			relatedOrderId: req.body?.relatedOrderId || undefined,
			contactName: req.body?.contactName || undefined,
			contactPhone: req.body?.contactPhone || undefined
		},
		{
			...customerScope(req),
			idempotencyKey: idempotencyKey || undefined
		}
	);

	return successResponse(res, StatusCodes.CREATED, "案件已建立", { result: { ticket } });
};

export const handleCrmEvent = async (req, res) => {
	const type = String(req.body?.type || "").trim();
	const crmCustomerId = String(req.body?.crmCustomerId || "").trim();
	const title = String(req.body?.title || "遠岫通知").trim();
	const body = String(req.body?.body || "").trim();
	const reference = req.body?.reference || "";

	if (!type || !crmCustomerId) {
		throw ApiError.badRequest("缺少 type 或 crmCustomerId");
	}

	const bindings = await LineCustomerBinding.find({ crmCustomerId }).lean();
	const text = [title, body, reference ? `參考：${reference}` : ""].filter(Boolean).join("\n");

	let pushed = 0;
	for (const binding of bindings) {
		try {
			await pushTextMessage(binding.lineUserId, text);
			pushed += 1;
		} catch (err) {
			console.error("Hub event push 失敗:", binding.lineUserId, err?.message || err);
		}
	}

	return successResponse(res, StatusCodes.OK, "事件已接收", {
		result: { type, recipients: bindings.length, pushed }
	});
};
