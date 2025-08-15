export const initialData = {
	series: [
		// 可視對講系統
		{
			name: {
				TW: "可視對講",
				EN: "Video Intercom"
			},
			code: "Video_Intercom",
			categories: [
				{
					name: {
						TW: "可視對講機",
						EN: "Intercom Device"
					},
					code: "Intercom_Device",
					subCategories: [
						{
							name: {
								TW: "大門口機",
								EN: "Entrance Unit"
							},
							code: "Entrance_Unit",
							specifications: [
								{
									name: {
										TW: "大樓用",
										EN: "Building"
									},
									code: "Building"
								},
								{
									name: {
										TW: "別墅用",
										EN: "Villa"
									},
									code: "Villa"
								},
								{
									name: {
										TW: "模組化",
										EN: "Modular"
									},
									code: "Modular"
								},
								{
									name: {
										TW: "雨遮",
										EN: "Rain Cover"
									},
									code: "Rain_Cover"
								}
							]
						},
						{
							name: {
								TW: "室內機",
								EN: "Indoor Unit"
							},
							code: "Indoor_Unit",
							specifications: [
								{
									name: {
										TW: "4.3吋",
										EN: "4.3 inch"
									},
									code: "Indoor_Unit_4.3_inch"
								},
								{
									name: {
										TW: "7吋",
										EN: "7 inch"
									},
									code: "Indoor_Unit_7_inch"
								},
								{
									name: {
										TW: "10吋",
										EN: "10 inch"
									},
									code: "Indoor_Unit_10_inch"
								},
								{
									name: {
										TW: "無影像",
										EN: "No Image"
									},
									code: "Indoor_Unit_No_Image"
								}
							]
						},
						{
							name: {
								TW: "二線式",
								EN: "Two Wire"
							},
							code: "Two_Wire",
							specifications: [
								{
									name: {
										TW: "大門口機",
										EN: "Entrance Unit"
									},
									code: "Entrance_Unit"
								},
								{
									name: {
										TW: "室內機",
										EN: "Indoor Unit"
									},
									code: "Indoor_Unit"
								},
								{
									name: {
										TW: "分佈器",
										EN: "Distributor"
									},
									code: "Distributor"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "管理中心主機",
						EN: "Management Center"
					},
					code: "Management_Center",
					subCategories: [
						{
							name: {
								TW: "管理中心主機",
								EN: "Management Center"
							},
							code: "Management_Center",
							specifications: [
								{
									name: {
										TW: "管理中心主機",
										EN: "Management Center"
									},
									code: "Management_Center"
								}
							]
						}
					]
				}
			]
		},

		// 門禁管理
		{
			name: {
				TW: "門禁管理",
				EN: "Access Control"
			},
			code: "Access_Control",
			categories: [
				{
					name: {
						TW: "門禁控制",
						EN: "Access Controller"
					},
					code: "Access_Controller",
					subCategories: [
						{
							name: {
								TW: "人臉識別機",
								EN: "Face Recognition"
							},
							code: "Face_Recognition",
							specifications: [
								{
									name: {
										TW: "4吋",
										EN: "4 inch"
									},
									code: "Face_Recognition_4_inch"
								},
								{
									name: {
										TW: "7吋",
										EN: "7 inch"
									},
									code: "Face_Recognition_7_inch"
								}
							]
						},
						{
							name: {
								TW: "配件 & 設備",
								EN: "Peripherals"
							},
							code: "Peripherals",
							specifications: [
								{
									name: {
										TW: "導入機",
										EN: "Entry"
									},
									code: "Entry"
								},
								{
									name: {
										TW: "指紋機",
										EN: "Fingerprint"
									},
									code: "Fingerprint"
								},
								{
									name: {
										TW: "刷卡機",
										EN: "Card Reader"
									},
									code: "Card_Reader"
								}
							]
						},
						{
							name: {
								TW: "多門控制器",
								EN: "Multi Door"
							},
							code: "Multi_Door",
							specifications: [
								{
									name: {
										TW: "多門控制器",
										EN: "Multi Door"
									},
									code: "Multi_Door"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "通關機 & 柵欄機",
						EN: "Gate System"
					},
					code: "Gate_System",
					subCategories: [
						{
							name: {
								TW: "擺閘式",
								EN: "Swing Gate"
							},
							code: "Swing_Gate",
							specifications: [
								{
									name: {
										TW: "擺閘式",
										EN: "Swing Gate"
									},
									code: "Swing_Gate"
								}
							]
						},
						{
							name: {
								TW: "旋轉式",
								EN: "Revolving Gate"
							},
							code: "Revolving_Gate",
							specifications: [
								{
									name: {
										TW: "旋轉式",
										EN: "Revolving Gate"
									},
									code: "Revolving_Gate"
								}
							]
						},
						{
							name: {
								TW: "柵欄機",
								EN: "Barrier Gate"
							},
							code: "Barrier_Gate",
							specifications: [
								{
									name: {
										TW: "柵欄機",
										EN: "Barrier Gate"
									},
									code: "Barrier_Gate"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "訪客管理系統",
						EN: "QR Code System"
					},
					code: "QR_Code_System",
					subCategories: [
						{
							name: {
								TW: "訪客機",
								EN: "Visitor Machine"
							},
							code: "Visitor_Machine",
							specifications: [
								{
									name: {
										TW: "訪客機",
										EN: "Visitor Machine"
									},
									code: "Visitor_Machine"
								}
							]
						},
						{
							name: {
								TW: "QR Code 列印機",
								EN: "QR Code Printer"
							},
							code: "QR_Print",
							specifications: [
								{
									name: {
										TW: "QR Code 列印機",
										EN: "QR Code Printer"
									},
									code: "QR_Print"
								}
							]
						},
						{
							name: {
								TW: "證件 OCR 讀取機",
								EN: "OCR Reader"
							},
							code: "OCR_Reader",
							specifications: [
								{
									name: {
										TW: "證件 OCR 讀取機",
										EN: "OCR Reader"
									},
									code: "OCR_Reader"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "電梯控制",
						EN: "Elevator Control"
					},
					code: "Elevator_Control",
					subCategories: [
						{
							name: {
								TW: "電梯控制",
								EN: "Elevator Control"
							},
							code: "Elevator_Control",
							specifications: [
								{
									name: {
										TW: "電梯控制",
										EN: "Elevator Control"
									},
									code: "Elevator_Control"
								}
							]
						}
					]
				}
			]
		},

		// 影像監控
		{
			name: {
				TW: "影像監控",
				EN: "Surveillance Monitoring"
			},
			code: "Surveillance_Monitoring",
			categories: [
				{
					name: {
						TW: "IPC",
						EN: "IPC"
					},
					code: "IPC",
					subCategories: [
						{
							name: {
								TW: "解析度",
								EN: "Resolution"
							},
							code: "Resolution",
							specifications: [
								{
									name: {
										TW: "2M",
										EN: "2M"
									},
									code: "Resolution_2M"
								},
								{
									name: {
										TW: "4M",
										EN: "4M"
									},
									code: "Resolution_4M"
								},
								{
									name: {
										TW: "6M",
										EN: "6M"
									},
									code: "Resolution_6M"
								},
								{
									name: {
										TW: "8M",
										EN: "8M"
									},
									code: "Resolution_8M"
								},
								{
									name: {
										TW: "12M",
										EN: "12M"
									},
									code: "Resolution_12M"
								}
							]
						},
						{
							name: {
								TW: "特定功能",
								EN: "Special Functions"
							},
							code: "Special_Functions",
							specifications: [
								{
									name: {
										TW: "車牌辨識",
										EN: "License Recognition"
									},
									code: "License_Recognition"
								},
								{
									name: {
										TW: "客流統計",
										EN: "People Counting"
									},
									code: "People_Counting"
								},
								{
									name: {
										TW: "測速功能",
										EN: "Speed Detection"
									},
									code: "Speed_Detection"
								},
								{
									name: {
										TW: "變焦鏡頭",
										EN: "Zoom Lens"
									},
									code: "Zoom_Lens"
								}
							]
						},
						{
							name: {
								TW: "特殊場景",
								EN: "Special Scenes"
							},
							code: "Special_Scenes",
							specifications: [
								{
									name: {
										TW: "4G太陽能",
										EN: "4G Solar"
									},
									code: "4G_Solar"
								},
								{
									name: {
										TW: "低溫",
										EN: "Low Temperature"
									},
									code: "Low_Temperature"
								},
								{
									name: {
										TW: "魚眼",
										EN: "Fisheye"
									},
									code: "Fisheye"
								},
								{
									name: {
										TW: "微型",
										EN: "Mini"
									},
									code: "Mini"
								},
								{
									name: {
										TW: "電梯用",
										EN: "Elevator"
									},
									code: "Elevator"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "NVR",
						EN: "NVR"
					},
					code: "NVR",
					subCategories: [
						{
							name: {
								TW: "基本款",
								EN: "Basic"
							},
							code: "Basic",
							specifications: [
								{
									name: {
										TW: "小型系統",
										EN: "Small System"
									},
									code: "Small_System"
								},
								{
									name: {
										TW: "中型系統",
										EN: "Medium System"
									},
									code: "Medium_System"
								},
								{
									name: {
										TW: "大型系統",
										EN: "Large System"
									},
									code: "Large_System"
								}
							]
						},
						{
							name: {
								TW: "行為分析",
								EN: "Behavior Analysis"
							},
							code: "Behavior_Analysis",
							specifications: [
								{
									name: {
										TW: "行為分析",
										EN: "Behavior Analysis"
									},
									code: "Behavior_Analysis"
								}
							]
						}
					]
				}
			]
		},

		// 安全防護
		{
			name: {
				TW: "安全防護",
				EN: "Security Solutions"
			},
			code: "Security_Solutions",
			categories: [
				{
					name: {
						TW: "人體測溫",
						EN: "Temperature Detection"
					},
					code: "Temperature_Detection",
					subCategories: [
						{
							name: {
								TW: "監控平板",
								EN: "Monitoring Tablet"
							},
							code: "Monitoring_Tablet",
							specifications: [
								{
									name: {
										TW: "監控平板",
										EN: "Monitoring Tablet"
									},
									code: "Monitoring_Tablet"
								}
							]
						},
						{
							name: {
								TW: "門禁測溫",
								EN: "Access Temperature"
							},
							code: "Access_Temperature",
							specifications: [
								{
									name: {
										TW: "門禁測溫",
										EN: "Access Temperature"
									},
									code: "Access_Temperature"
								}
							]
						},
						{
							name: {
								TW: "測溫攝影機",
								EN: "Thermal Camera"
							},
							code: "Thermal_Camera",
							specifications: [
								{
									name: {
										TW: "測溫攝影機",
										EN: "Thermal Camera"
									},
									code: "Thermal_Camera"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "無線警報",
						EN: "Wireless Alarm"
					},
					code: "Wireless_Alarm",
					subCategories: [
						{
							name: {
								TW: "主機 & 中繼器",
								EN: "Host & Repeater"
							},
							code: "Host_Repeater",
							specifications: [
								{
									name: {
										TW: "主機",
										EN: "Host"
									},
									code: "Host"
								},
								{
									name: {
										TW: "中繼器",
										EN: "Repeater"
									},
									code: "Repeater"
								}
							]
						},
						{
							name: {
								TW: "警報裝置",
								EN: "Alarm Devices"
							},
							code: "Alarm_Devices",
							specifications: [
								{
									name: {
										TW: "佈防裝置",
										EN: "Arming Device"
									},
									code: "Arming_Device"
								},
								{
									name: {
										TW: "輸入裝置",
										EN: "Input Device"
									},
									code: "Input_Device"
								},
								{
									name: {
										TW: "輸出裝置",
										EN: "Output Device"
									},
									code: "Output_Device"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "火災警報",
						EN: "Fire Alarm"
					},
					code: "Fire_Alarm",
					subCategories: [
						{
							name: {
								TW: "標準型",
								EN: "Standard Type"
							},
							code: "Standard_Type",
							specifications: [
								{
									name: {
										TW: "槍型",
										EN: "Gun Type"
									},
									code: "Gun_Type"
								},
								{
									name: {
										TW: "球機",
										EN: "Ball Camera"
									},
									code: "Ball_Camera"
								},
								{
									name: {
										TW: "立方",
										EN: "Cube"
									},
									code: "Cube"
								}
							]
						},
						{
							name: {
								TW: "防爆型",
								EN: "Explosion Proof"
							},
							code: "Explosion_Proof",
							specifications: [
								{
									name: {
										TW: "防爆型",
										EN: "Explosion Proof"
									},
									code: "Explosion_Proof"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "金屬檢測門",
						EN: "Metal Detector"
					},
					code: "Metal_Detector",
					subCategories: [
						{
							name: {
								TW: "金屬檢測門",
								EN: "Metal Detector"
							},
							code: "Metal_Detector",
							specifications: [
								{
									name: {
										TW: "金屬檢測門",
										EN: "Metal Detector"
									},
									code: "Metal_Detector"
								}
							]
						}
					]
				}
			]
		},

		// 其他設備
		{
			name: {
				TW: "其他設備",
				EN: "Devices & Accessories"
			},
			code: "Devices_Accessories",
			categories: [
				{
					name: {
						TW: "網路 & 軟體設備",
						EN: "Network & Software"
					},
					code: "Network_Software",
					subCategories: [
						{
							name: {
								TW: "IP speaker",
								EN: "IP Speaker"
							},
							code: "IP_Speaker",
							specifications: [
								{
									name: {
										TW: "IP speaker",
										EN: "IP Speaker"
									},
									code: "IP_Speaker"
								}
							]
						},
						{
							name: {
								TW: "PoE",
								EN: "PoE"
							},
							code: "PoE",
							specifications: [
								{
									name: {
										TW: "4-port",
										EN: "4-port"
									},
									code: "4_Port"
								},
								{
									name: {
										TW: "8-port",
										EN: "8-port"
									},
									code: "8_Port"
								},
								{
									name: {
										TW: "16-port",
										EN: "16-port"
									},
									code: "16_Port"
								},
								{
									name: {
										TW: "24-port",
										EN: "24-port"
									},
									code: "24_Port"
								}
							]
						},
						{
							name: {
								TW: "工作站",
								EN: "Workstation"
							},
							code: "Workstation",
							specifications: [
								{
									name: {
										TW: "工作站",
										EN: "Workstation"
									},
									code: "Workstation"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "周邊設備",
						EN: "Network Peripherals"
					},
					code: "Network_Peripherals",
					subCategories: [
						{
							name: {
								TW: "支架",
								EN: "Bracket"
							},
							code: "Bracket",
							specifications: [
								{
									name: {
										TW: "桌上型",
										EN: "Desktop"
									},
									code: "Desktop"
								},
								{
									name: {
										TW: "落地型",
										EN: "Floor Standing"
									},
									code: "Floor_Standing"
								},
								{
									name: {
										TW: "安裝支架",
										EN: "Mounting"
									},
									code: "Mounting"
								}
							]
						},
						{
							name: {
								TW: "出口按鈕",
								EN: "Exit Button"
							},
							code: "Exit_Button",
							specifications: [
								{
									name: {
										TW: "出口按鈕",
										EN: "Exit Button"
									},
									code: "Exit_Button"
								}
							]
						}
					]
				},
				{
					name: {
						TW: "特殊應用",
						EN: "Special Applications"
					},
					code: "Special_Applications",
					subCategories: [
						{
							name: {
								TW: "手持智能數據機",
								EN: "Handheld Intercom"
							},
							code: "Handheld_Intercom",
							specifications: [
								{
									name: {
										TW: "手持智能數據機",
										EN: "Handheld Intercom"
									},
									code: "Handheld_Intercom"
								}
							]
						},
						{
							name: {
								TW: "LED",
								EN: "LED"
							},
							code: "LED",
							specifications: [
								{
									name: {
										TW: "LED",
										EN: "LED"
									},
									code: "LED"
								}
							]
						},
						{
							name: {
								TW: "支付機",
								EN: "Payment Device"
							},
							code: "Payment_Device",
							specifications: [
								{
									name: {
										TW: "支付機",
										EN: "Payment Device"
									},
									code: "Payment_Device"
								}
							]
						},
						{
							name: {
								TW: "長照系統",
								EN: "Long Term Care System"
							},
							code: "Long_Term_Care_System",
							specifications: [
								{
									name: {
										TW: "長照系統",
										EN: "Long Term Care System"
									},
									code: "Long_Term_Care_System"
								}
							]
						}
					]
				}
			]
		}
	]
};

export default initialData;
