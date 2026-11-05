import { randomUUID } from "crypto";
import { ApiError } from "../../utils/responseHandler.js";

/** 與本機常見綁定／README 範例對齊 */
export const MOCK_CUSTOMER = {
	id: "CRM-CUST-001",
	code: "S00997",
	taxId: "03028349",
	companyName: "金儀股份有限公司（Mock）"
};

const MOCK_ORDER_NOS = new Set(["PO26002116", "MOCK-PO-001", "ORD-2026-0130"]);

const nowIso = () => new Date().toISOString();

const createSeedOrders = () => [
	{
		id: "ORD-MOCK-001",
		orderNo: "PO26002116",
		internalOrderNo: "ORD-2026-0130",
		projectName: "Mock 測試專案 A",
		poNumber: "PO26002116",
		status: "confirmed",
		statusLabel: "已確認",
		nextDeliveryDate: "2026-11-20",
		items: [
			{
				sku: "YS-DEMO-100",
				name: "示範設備主機",
				orderedQty: 2,
				shippedQty: 1,
				pendingQty: 1
			},
			{
				sku: "YS-DEMO-ACC",
				name: "示範配件組",
				orderedQty: 2,
				shippedQty: 2,
				pendingQty: 0
			}
		],
		shipments: [
			{
				shipmentNo: "SHP-MOCK-001",
				shippedAt: "2026-10-15",
				items: [
					{ sku: "YS-DEMO-100", qty: 1 },
					{ sku: "YS-DEMO-ACC", qty: 2 }
				]
			}
		]
	},
	{
		id: "ORD-MOCK-002",
		orderNo: "MOCK-PO-001",
		internalOrderNo: "ORD-2026-0201",
		projectName: "Mock 待出貨專案",
		poNumber: "MOCK-PO-001",
		status: "processing",
		statusLabel: "處理中",
		nextDeliveryDate: "2026-12-01",
		items: [
			{
				sku: "YS-DEMO-200",
				name: "示範感測模組",
				orderedQty: 5,
				shippedQty: 0,
				pendingQty: 5
			}
		],
		shipments: []
	}
];

const createSeedTickets = () => {
	const createdAt = "2026-10-01T02:00:00.000Z";
	const updatedAt = "2026-10-05T08:30:00.000Z";
	return [
		{
			id: "TKT-MOCK-001",
			title: "示範：設備間歇重啟",
			description: "本機 CRM_MOCK 預置案件。設備於開機後約 30 分鐘重啟一次。",
			status: "in_progress",
			statusLabel: "處理中",
			relatedOrderId: "ORD-MOCK-001",
			contactName: "王小明",
			contactPhone: "0912345678",
			createdAt,
			updatedAt,
			timeline: [
				{ at: createdAt, label: "案件建立" },
				{ at: "2026-10-02T04:00:00.000Z", label: "已受理，安排遠端診斷" },
				{ at: updatedAt, label: "等待現場確認" }
			]
		}
	];
};

/** process 存活期間共用；重啟 server 會重置 */
const store = {
	ordersByCustomer: new Map([[MOCK_CUSTOMER.id, createSeedOrders()]]),
	ticketsByCustomer: new Map([[MOCK_CUSTOMER.id, createSeedTickets()]]),
	idempotency: new Map()
};

const assertCustomer = (crmCustomerId) => {
	const id = String(crmCustomerId || "");
	if (id !== MOCK_CUSTOMER.id) {
		throw ApiError.notFound("找不到客戶（CRM_MOCK 僅支援 CRM-CUST-001）");
	}
	return id;
};

const getOrders = (crmCustomerId) => {
	const id = assertCustomer(crmCustomerId);
	return store.ordersByCustomer.get(id) || [];
};

const getTickets = (crmCustomerId) => {
	const id = assertCustomer(crmCustomerId);
	if (!store.ticketsByCustomer.has(id)) {
		store.ticketsByCustomer.set(id, []);
	}
	return store.ticketsByCustomer.get(id);
};

const paginate = (items, query = {}) => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
	const start = (page - 1) * limit;
	return {
		items: items.slice(start, start + limit),
		page,
		limit,
		total: items.length
	};
};

export const isCrmMockEnabled = () => {
	if (String(process.env.CRM_MOCK || "").toLowerCase() !== "true") return false;
	if (process.env.NODE_ENV === "production") {
		console.warn("⚠️ CRM_MOCK=true 在 NODE_ENV=production 時會被忽略");
		return false;
	}
	return true;
};

export const crmMockClient = {
	verifyOrder: async ({ orderNo, taxId }) => {
		const normalizedOrder = String(orderNo || "").trim();
		const normalizedTaxId = String(taxId || "").trim();

		if (normalizedTaxId !== MOCK_CUSTOMER.taxId) {
			throw ApiError.notFound("訂單或統編不符");
		}
		if (!MOCK_ORDER_NOS.has(normalizedOrder)) {
			throw ApiError.notFound("訂單或統編不符");
		}

		const orders = getOrders(MOCK_CUSTOMER.id);
		const order =
			orders.find(
				(item) =>
					item.orderNo === normalizedOrder ||
					item.poNumber === normalizedOrder ||
					item.internalOrderNo === normalizedOrder ||
					item.id === normalizedOrder
			) || orders[0];

		return {
			customer: { ...MOCK_CUSTOMER },
			order: {
				id: order.id,
				poNumber: order.poNumber || order.orderNo,
				orderNo: order.orderNo,
				projectName: order.projectName
			}
		};
	},

	listOrders: async (crmCustomerId, query = {}) => {
		let orders = getOrders(crmCustomerId);
		const status = String(query.status || "").trim();
		if (status) {
			orders = orders.filter((order) => order.status === status || order.statusLabel === status);
		}
		const pageData = paginate(orders, query);
		return {
			orders: pageData.items,
			page: pageData.page,
			limit: pageData.limit,
			total: pageData.total
		};
	},

	getOrder: async (crmCustomerId, orderId) => {
		const order = getOrders(crmCustomerId).find((item) => String(item.id) === String(orderId));
		if (!order) throw ApiError.notFound("找不到訂單");
		return order;
	},

	listServiceTickets: async (crmCustomerId, query = {}) => {
		let tickets = [...getTickets(crmCustomerId)].sort((a, b) =>
			String(b.createdAt).localeCompare(String(a.createdAt))
		);
		const status = String(query.status || "").trim();
		if (status) {
			tickets = tickets.filter(
				(ticket) => ticket.status === status || ticket.statusLabel === status
			);
		}
		const pageData = paginate(tickets, query);
		return {
			tickets: pageData.items,
			page: pageData.page,
			limit: pageData.limit,
			total: pageData.total
		};
	},

	getServiceTicket: async (crmCustomerId, ticketId) => {
		const ticket = getTickets(crmCustomerId).find((item) => String(item.id) === String(ticketId));
		if (!ticket) throw ApiError.notFound("找不到售後案件");
		return ticket;
	},

	createServiceTicket: async (crmCustomerId, body, { idempotencyKey } = {}) => {
		assertCustomer(crmCustomerId);

		const key = String(idempotencyKey || "").trim();
		if (key) {
			const cacheKey = `${crmCustomerId}:${key}`;
			const cached = store.idempotency.get(cacheKey);
			if (cached) return cached;
		}

		const relatedOrderId = body?.relatedOrderId ? String(body.relatedOrderId) : undefined;
		if (relatedOrderId) {
			const order = getOrders(crmCustomerId).find((item) => item.id === relatedOrderId);
			if (!order) throw ApiError.badRequest("關聯訂單不存在");
		}

		const createdAt = nowIso();
		const ticket = {
			id: `TKT-MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
			title: String(body?.title || "").trim(),
			description: String(body?.description || "").trim(),
			status: "open",
			statusLabel: "已建立",
			relatedOrderId,
			contactName: body?.contactName ? String(body.contactName).trim() : undefined,
			contactPhone: body?.contactPhone ? String(body.contactPhone).trim() : undefined,
			createdAt,
			updatedAt: createdAt,
			timeline: [{ at: createdAt, label: "案件建立" }]
		};

		getTickets(crmCustomerId).unshift(ticket);

		if (key) {
			store.idempotency.set(`${crmCustomerId}:${key}`, ticket);
		}

		return ticket;
	}
};

export default crmMockClient;
