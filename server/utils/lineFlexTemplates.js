/**
 * Creates a LINE Flex Message to display series and their categories for navigation.
 * @param {Array<object>} hierarchy - An array of series objects, each containing a 'categories' array.
 * @returns {object} A LINE Flex Message object.
 */
export const createProductNavigationMessage = (hierarchy) => {
	const bubbles = hierarchy.map((series) => {
		const seriesName = series.name?.TW || "未命名系列";

		const categoryButtonsWithSeparators = [];
		series.categories.forEach((category, index) => {
			categoryButtonsWithSeparators.push({
				type: "box",
				layout: "vertical",
				spacing: "md",
				paddingAll: "md",
				action: {
					type: "postback",
					label: category.name?.TW || "未命名分類",
					data: `action=view_products&categoryId=${category._id}`
				},
				contents: [
					{
						type: "text",
						text: category.name?.TW || "未命名分類",
						color: "#444444",
						size: "lg",
						align: "center"
					}
				]
			});

			if (index < series.categories.length - 1) {
				categoryButtonsWithSeparators.push({
					type: "separator",
					margin: "md"
				});
			}
		});

		// If there are no categories, provide a fallback message.
		if (categoryButtonsWithSeparators.length === 0) {
			categoryButtonsWithSeparators.push({
				type: "text",
				text: "此系列暫無分類",
				size: "lg",
				color: "#999999",
				margin: "md",
				align: "center"
			});
		}

		return {
			type: "bubble",
			header: {
				type: "box",
				layout: "vertical",
				paddingAll: "lg",
				background: {
					type: "linearGradient",
					angle: "90deg",
					startColor: "#6f8a9a",
					endColor: "#4e6a79"
				},
				contents: [
					{
						type: "text",
						text: seriesName,
						weight: "bold",
						size: "xl",
						align: "center",
						color: "#ffffff"
					}
				]
			},
			body: {
				type: "box",
				layout: "vertical",
				spacing: "md",
				paddingAll: "md",
				contents: categoryButtonsWithSeparators
			}
		};
	});

	return {
		type: "flex",
		altText: "請選擇一個產品系列",
		contents: {
			type: "carousel",
			contents: bubbles
		}
	};
};

/**
 * Creates a LINE Flex Message to display a carousel of products.
 * @param {Array<object>} productList - An array of product objects from the database.
 * @returns {object} A LINE Flex Message object.
 */
export const createProductListMessage = (productList) => {
	const bubbles = productList.slice(0, 4).map((product) => {
		const productName = product.name?.TW || "未命名產品";
		const productCode = product.code || "";
		const imageUrl = product.images?.[0] || "https://via.placeholder.com/500x250.png?text=No+Image";
		const baseProductUrl = `https://www.yenshow.com/products/${product._id}`;
		const productUrl = `${baseProductUrl}?utm_source=line&utm_medium=official_account&utm_campaign=product_carousel`;

		return {
			type: "bubble",
			hero: {
				type: "box",
				layout: "vertical",
				backgroundColor: "#FFFFFF",
				paddingTop: "xl",
				paddingBottom: "xl",
				contents: [
					{
						type: "image",
						size: "full",
						aspectRatio: "20:13",
						aspectMode: "fit",
						url: imageUrl
					}
				]
			},
			body: {
				type: "box",
				layout: "vertical",
				spacing: "sm",
				contents: [
					{
						type: "text",
						text: productName,
						wrap: true,
						weight: "bold",
						size: "xl",
						decoration: "none"
					},
					{
						type: "text",
						text: productCode,
						size: "lg",
						style: "italic"
					}
				]
			},
			footer: {
				type: "box",
				layout: "vertical",
				spacing: "sm",
				contents: [
					{
						type: "button",
						style: "primary",
						color: "#4e6a79",
						action: {
							type: "uri",
							label: "了解更多",
							uri: productUrl
						},
						height: "md"
					}
				]
			}
		};
	});
	bubbles.push({
		type: "bubble",
		body: {
			type: "box",
			layout: "vertical",
			spacing: "sm",
			contents: [
				{
					type: "button",
					flex: 1,
					gravity: "center",
					action: {
						type: "uri",
						label: "更多產品",
						uri: `https://www.yenshow.com/products?utm_source=line&utm_medium=official_account&utm_campaign=product_carousel_see_more`
					}
				}
			]
		}
	});

	return {
		type: "flex",
		altText: "這是一份產品清單",
		contents: {
			type: "carousel",
			contents: bubbles
		}
	};
};
