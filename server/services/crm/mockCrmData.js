/** CRM 未就緒時的驗收用假資料（比對規則對齊 CRM Hub：精確內部單號或 PO，無模糊） */

export const mockCustomers = [
	{
		id: "CRM-CUST-001",
		code: "S00997",
		taxId: "03028349",
		companyName: "金儀股份有限公司"
	}
];

export const mockOrders = [
	{
		id: "S00997_PO26002116",
		customerId: "CRM-CUST-001",
		poNumber: "PO26002116",
		projectName: "台南智慧門禁案",
		status: "partial_shipped",
		statusLabel: "部分出貨",
		nextDeliveryDate: "2026-10-12",
		updatedAt: "2026-10-01T10:00:00+08:00",
		items: [
			{
				sku: "YS-AC-08",
				name: "AI 人臉辨識門禁機",
				orderedQty: 12,
				shippedQty: 8,
				pendingQty: 4
			}
		],
		shipments: [
			{
				shipmentNo: "SH-001",
				shippedAt: "2026-09-20",
				items: [{ sku: "YS-AC-08", qty: 8 }]
			}
		]
	},
	{
		id: "S00997_PO26002200",
		customerId: "CRM-CUST-001",
		poNumber: "PO26002200",
		projectName: "高雄社區對講專案",
		status: "in_progress",
		statusLabel: "進行中",
		nextDeliveryDate: "2026-11-01",
		updatedAt: "2026-10-05T14:00:00+08:00",
		items: [
			{
				sku: "YS-INT-01",
				name: "可視對講主機",
				orderedQty: 6,
				shippedQty: 0,
				pendingQty: 6
			}
		],
		shipments: []
	}
];

/** @type {Map<string, object[]>} */
export const mockTicketsByCustomer = new Map([
	[
		"CRM-CUST-001",
		[
			{
				id: "ST-20261007-001",
				title: "設備無法開機",
				description: "現場 YS-AC-08 無法開機，已重啟電源仍無效。",
				status: "open",
				statusLabel: "處理中",
				relatedOrderId: "S00997_PO26002116",
				contactName: "王小明",
				contactPhone: "0912345678",
				createdAt: "2026-10-07T09:00:00+08:00",
				updatedAt: "2026-10-07T11:00:00+08:00",
				timeline: [
					{ at: "2026-10-07T09:00:00+08:00", label: "案件建立" },
					{ at: "2026-10-07T11:00:00+08:00", label: "技術工程師接手" }
				]
			}
		]
	]
]);

export const orderMatchesNo = (order, orderNo) => {
	const q = String(orderNo || "").trim().toUpperCase();
	if (!q) return false;
	const id = String(order.id || "").toUpperCase();
	const po = String(order.poNumber || "").toUpperCase();
	return id === q || po === q;
};
