export const initialData = {
  series: [
    // 可視對講系統
    {
      name: '可視對講',
      value: '可視對講',
      code: 'VIDEO_INTERCOM',
      categories: [
        {
          name: '可視對講機',
          value: '可視對講機',
          code: 'INTERCOM_DEVICE',
          subCategories: [
            {
              name: '大門口機',
              value: '大門口機',
              code: 'ENTRANCE_UNIT',
              specifications: [
                {
                  name: '大樓用',
                  values: '大樓用',
                  code: 'ENTRANCE_UNIT_BUILDING',
                },
                {
                  name: '別墅用',
                  values: '別墅用',
                  code: 'ENTRANCE_UNIT_VILLA',
                },
                {
                  name: '模組化',
                  values: '模組化',
                  code: 'ENTRANCE_UNIT_MODULAR',
                },
                {
                  name: '雨遮',
                  values: '雨遮',
                  code: 'ENTRANCE_UNIT_RAINCOVER',
                },
              ],
            },
            {
              name: '室內機',
              value: '室內機',
              code: 'INDOOR_UNIT',
              specifications: [
                {
                  name: '4.3吋',
                  code: 'INDOOR_UNIT_43',
                  values: ['基本款', '觸控式', '免持聽筒式'],
                },
                {
                  name: '7吋',
                  code: 'INDOOR_UNIT_7',
                  values: ['標準型', '豪華型', '智能型'],
                },
                {
                  name: '10吋',
                  code: 'INDOOR_UNIT_10',
                  values: ['豪華型', '智能型', '多功能型'],
                },
                {
                  name: '無影像',
                  code: 'INDOOR_UNIT_NOIMAGE',
                  values: ['純音頻', '緊急求助型'],
                },
              ],
            },
            {
              name: '二線式',
              value: '二線式',
              code: 'TWO_WIRE',
              specifications: [
                {
                  name: '大門口機',
                  code: 'TWO_WIRE_ENTRANCE',
                  values: ['標準型', '高級型'],
                },
                {
                  name: '室內機',
                  code: 'TWO_WIRE_INDOOR',
                  values: ['4.3吋', '7吋'],
                },
                {
                  name: '分佈器',
                  code: 'TWO_WIRE_DISTRIBUTOR',
                  values: ['2戶', '4戶', '8戶'],
                },
              ],
            },
          ],
        },
        {
          name: '管理中心主機',
          value: '管理中心主機',
          code: 'MANAGEMENT_CENTER',
          subCategories: [
            {
              name: '管理中心主機',
              value: '管理中心主機',
              code: 'MANAGEMENT_CENTER',
              specifications: [
                {
                  name: '管理中心主機',
                  value: '管理中心主機',
                  code: 'MANAGEMENT_CENTER',
                },
              ],
            },
          ],
        },
      ],
    },

    // 門禁管理
    {
      name: '門禁管理',
      value: '門禁管理',
      code: 'ACCESS_CONTROL',
      categories: [
        {
          name: '門禁控制',
          value: '門禁控制',
          code: 'ACCESS_CONTROLLER',
          subCategories: [
            {
              name: '人臉識別機',
              value: '人臉識別機',
              code: 'FACE_RECOGNITION',
              specifications: [
                {
                  name: '4吋',
                  values: '4吋',
                  code: 'FACE_RECOGNITION_4',
                },
                {
                  name: '7吋',
                  values: '7吋',
                  code: 'FACE_RECOGNITION_7',
                },
              ],
            },
            {
              name: '配件 & 設備',
              value: '配件 & 設備',
              code: 'PERIPHERALS',
              specifications: [
                {
                  name: '導入機',
                  values: '導入機',
                  code: 'PERIPHERALS_ENTRY',
                },
                {
                  name: '指紋機',
                  values: '指紋機',
                  code: 'PERIPHERALS_FINGERPRINT',
                },
                {
                  name: '刷卡機',
                  values: '刷卡機',
                  code: 'PERIPHERALS_CARDREADER',
                },
              ],
            },
            {
              name: '多門控制器',
              value: '多門控制器',
              code: 'MULTI_DOOR',
              specifications: [
                {
                  name: '多門控制器',
                  value: '多門控制器',
                  code: 'MULTI_DOOR',
                },
              ],
            },
          ],
        },
        {
          name: '通關機 & 柵欄機',
          value: '通關機 & 柵欄機',
          code: 'GATE_SYSTEM',
          subCategories: [
            {
              name: '擺閘式',
              value: '擺閘式',
              code: 'SWING_GATE',
              specifications: [
                {
                  name: '擺閘式',
                  value: '擺閘式',
                  code: 'SWING_GATE',
                },
              ],
            },
            {
              name: '旋轉式',
              value: '旋轉式',
              code: 'REVOLVING_GATE',
              specifications: [
                {
                  name: '旋轉式',
                  value: '旋轉式',
                  code: 'REVOLVING_GATE',
                },
              ],
            },
            {
              name: '柵欄機',
              value: '柵欄機',
              code: 'BARRIER_GATE',
              specifications: [
                {
                  name: '柵欄機',
                  value: '柵欄機',
                  code: 'BARRIER_GATE',
                },
              ],
            },
          ],
        },
        {
          name: '訪客管理系統',
          value: '訪客管理系統',
          code: 'QR_CODE_SYSTEM',
          subCategories: [
            {
              name: '訪客機',
              value: '訪客機',
              code: 'VISITOR_MACHINE',
              specifications: [
                {
                  name: '訪客機',
                  value: '訪客機',
                  code: 'VISITOR_MACHINE',
                },
              ],
            },
            {
              name: 'QR Code 列印機',
              value: 'QR Code 列印機',
              code: 'QR_PRINT',
              specifications: [
                {
                  name: 'QR Code 列印機',
                  value: 'QR Code 列印機',
                  code: 'QR_PRINT',
                },
              ],
            },
            {
              name: '證件 OCR 讀取機',
              value: '證件 OCR 讀取機',
              code: 'OCR_READER',
              specifications: [
                {
                  name: '證件 OCR 讀取機',
                  value: '證件 OCR 讀取機',
                  code: 'OCR_READER',
                },
              ],
            },
          ],
        },
        {
          name: '電梯控制',
          value: '電梯控制',
          code: 'ELEVATOR_CONTROL',
          subCategories: [
            {
              name: '電梯控制',
              value: '電梯控制',
              code: 'ELEVATOR_CONTROL',
              specifications: [
                {
                  name: '電梯控制',
                  value: '電梯控制',
                  code: 'ELEVATOR_CONTROL',
                },
              ],
            },
          ],
        },
      ],
    },

    // 影像監控
    {
      name: '影像監控',
      value: '影像監控',
      code: 'SURVEILLANCE_MONITORING',
      categories: [
        {
          name: 'IPC',
          value: 'IPC',
          code: 'IPC',
          subCategories: [
            {
              name: '解析度',
              value: '解析度',
              code: 'RESOLUTION',
              specifications: [
                {
                  name: '2M',
                  values: '2M',
                  code: 'RESOLUTION_2M',
                },
                {
                  name: '4M',
                  values: '4M',
                  code: 'RESOLUTION_4M',
                },
                {
                  name: '6M',
                  values: '6M',
                  code: 'RESOLUTION_6M',
                },
                {
                  name: '8M',
                  values: '8M',
                  code: 'RESOLUTION_8M',
                },
                {
                  name: '12M',
                  values: '12M',
                  code: 'RESOLUTION_12M',
                },
              ],
            },
            {
              name: '特定功能',
              value: '特定功能',
              code: 'SPECIAL_FUNCTIONS',
              specifications: [
                {
                  name: '車牌辨識',
                  values: '車牌辨識',
                  code: 'LICENSE_RECOGNITION',
                },
                {
                  name: '客流統計',
                  values: '客流統計',
                  code: 'PEOPLE_COUNTING',
                },
                {
                  name: '測速功能',
                  values: '測速功能',
                  code: 'SPEED_DETECTION',
                },
                {
                  name: '變焦鏡頭',
                  values: '變焦鏡頭',
                  code: 'ZOOM_LENS',
                },
              ],
            },
            {
              name: '特殊場景',
              value: '特殊場景',
              code: 'SPECIAL_SCENES',
              specifications: [
                {
                  name: '4G太陽能',
                  values: '4G太陽能',
                  code: '4G_SOLAR',
                },
                {
                  name: '低溫',
                  values: '低溫',
                  code: 'LOW_TEMPERATURE',
                },
                {
                  name: '魚眼',
                  values: '魚眼',
                  code: 'FISHEYE',
                },
                {
                  name: '微型',
                  values: '微型',
                  code: 'MINI',
                },
                {
                  name: '電梯用',
                  values: '電梯用',
                  code: 'ELEVATOR',
                },
              ],
            },
          ],
        },
        {
          name: 'NVR',
          value: 'NVR',
          code: 'NVR',
          subCategories: [
            {
              name: '基本款',
              value: '基本款',
              code: 'BASIC',
              specifications: [
                {
                  name: '小型系統',
                  values: '小型系統',
                  code: 'BASIC_SMALL',
                },
                {
                  name: '中型系統',
                  values: '中型系統',
                  code: 'BASIC_MEDIUM',
                },
                {
                  name: '大型系統',
                  values: '大型系統',
                  code: 'BASIC_LARGE',
                },
              ],
            },
            {
              name: '行為分析',
              value: '行為分析',
              code: 'BEHAVIOR_ANALYSIS',
              specifications: [
                {
                  name: '行為分析',
                  value: '行為分析',
                  code: 'BEHAVIOR_ANALYSIS',
                },
              ],
            },
          ],
        },
      ],
    },

    // 安全防護
    {
      name: '安全防護',
      value: '安全防護',
      code: 'SECURITY_SOLUTIONS',
      categories: [
        {
          name: '人體測溫',
          value: '人體測溫',
          code: 'TEMPERATURE_DETECTION',
          subCategories: [
            {
              name: '監控平板',
              value: '監控平板',
              code: 'MONITORING_TABLET',
              specifications: [
                {
                  name: '監控平板',
                  value: '監控平板',
                  code: 'MONITORING_TABLET',
                },
              ],
            },
            {
              name: '門禁測溫',
              value: '門禁測溫',
              code: 'ACCESS_TEMPERATURE',
              specifications: [
                {
                  name: '門禁測溫',
                  value: '門禁測溫',
                  code: 'ACCESS_TEMPERATURE',
                },
              ],
            },
            {
              name: '測溫攝影機',
              value: '測溫攝影機',
              code: 'THERMAL_CAMERA',
              specifications: [
                {
                  name: '測溫攝影機',
                  value: '測溫攝影機',
                  code: 'THERMAL_CAMERA',
                },
              ],
            },
          ],
        },
        {
          name: '無線警報',
          value: '無線警報',
          code: 'WIRELESS_ALARM',
          subCategories: [
            {
              name: '主機 & 中繼器',
              value: '主機 & 中繼器',
              code: 'HOST_REPEATER',
              specifications: [
                {
                  name: '主機',
                  value: '主機',
                  code: 'HOST',
                },
                {
                  name: '中繼器',
                  value: '中繼器',
                  code: 'REPEATER',
                },
              ],
            },
            {
              name: '警報裝置',
              value: '警報裝置',
              code: 'ALARM_DEVICES',
              specifications: [
                {
                  name: '佈防裝置',
                  values: '佈防裝置',
                  code: 'ARMING_DEVICE',
                },
                {
                  name: '輸入裝置',
                  values: '輸入裝置',
                  code: 'INPUT_DEVICE',
                },
                {
                  name: '輸出裝置',
                  values: '輸出裝置',
                  code: 'OUTPUT_DEVICE',
                },
              ],
            },
          ],
        },
        {
          name: '火災警報',
          value: '火災警報',
          code: 'FIRE_ALARM',
          subCategories: [
            {
              name: '標準型',
              value: '標準型',
              code: 'STANDARD_TYPE',
              specifications: [
                {
                  name: '槍型',
                  values: '槍型',
                  code: 'GUN_TYPE',
                },
                {
                  name: '球機',
                  values: '球機',
                  code: 'BALL_CAMERA',
                },
                {
                  name: '立方',
                  values: '立方',
                  code: 'CUBE',
                },
              ],
            },
            {
              name: '防爆型',
              value: '防爆型',
              code: 'EXPLOSION_PROOF',
              specifications: [
                {
                  name: '防爆型',
                  value: '防爆型',
                  code: 'EXPLOSION_PROOF',
                },
              ],
            },
          ],
        },
        {
          name: '金屬檢測門',
          value: '金屬檢測門',
          code: 'METAL_DETECTOR',
          subCategories: [
            {
              name: '金屬檢測門',
              value: '金屬檢測門',
              code: 'METAL_DETECTOR',
              specifications: [
                {
                  name: '金屬檢測門',
                  value: '金屬檢測門',
                  code: 'METAL_DETECTOR',
                },
              ],
            },
          ],
        },
      ],
    },

    // 其他設備
    {
      name: '其他設備',
      value: '其他設備',
      code: 'DEVICES_ACCESSORIES',
      categories: [
        {
          name: '網路 & 軟體設備',
          value: '網路 & 軟體設備',
          code: 'NETWORK_SOFTWARE',
          subCategories: [
            {
              name: 'IP speaker',
              value: 'IP speaker',
              code: 'IP_SPEAKER',
              specifications: [
                {
                  name: 'IP speaker',
                  value: 'IP speaker',
                  code: 'IP_SPEAKER',
                },
              ],
            },
            {
              name: 'PoE',
              value: 'PoE',
              code: 'POE',
              specifications: [
                {
                  name: '4-port',
                  values: '4-port',
                  code: 'POE_4PORT',
                },
                {
                  name: '8-port',
                  values: '8-port',
                  code: 'POE_8PORT',
                },
                {
                  name: '16-port',
                  values: '16-port',
                  code: 'POE_16PORT',
                },
                {
                  name: '24-port',
                  values: '24-port',
                  code: 'POE_24PORT',
                },
              ],
            },
            {
              name: '工作站',
              value: '工作站',
              code: 'WORKSTATION',
              specifications: [
                {
                  name: '工作站',
                  value: '工作站',
                  code: 'WORKSTATION',
                },
              ],
            },
          ],
        },
        {
          name: '周邊設備',
          value: '周邊設備',
          code: 'NETWORK_PERIPHERALS',
          subCategories: [
            {
              name: '支架',
              value: '支架',
              code: 'BRACKET',
              specifications: [
                {
                  name: '桌上型',
                  values: '桌上型',
                  code: 'DESKTOP',
                },
                {
                  name: '落地型',
                  values: '落地型',
                  code: 'FLOOR_STANDING',
                },
                {
                  name: '安裝支架',
                  values: '安裝支架',
                  code: 'MOUNTING',
                },
              ],
            },
            {
              name: '出口按鈕',
              value: '出口按鈕',
              code: 'EXIT_BUTTON',
              specifications: [
                {
                  name: '出口按鈕',
                  value: '出口按鈕',
                  code: 'EXIT_BUTTON',
                },
              ],
            },
          ],
        },
        {
          name: '特殊應用',
          value: '特殊應用',
          code: 'SPECIAL_APPLICATIONS',
          subCategories: [
            {
              name: '手持智能數據機',
              value: '手持智能數據機',
              code: 'HANDHELD_INTERCOM',
              specifications: [
                {
                  name: '手持智能數據機',
                  value: '手持智能數據機',
                  code: 'HANDHELD_INTERCOM',
                },
              ],
            },
            {
              name: 'LED',
              value: 'LED',
              code: 'LED',
              specifications: [
                {
                  name: 'LED',
                  value: 'LED',
                  code: 'LED',
                },
              ],
            },
            {
              name: '支付機',
              value: '支付機',
              code: 'PAYMENT_DEVICE',
              specifications: [
                {
                  name: '支付機',
                  value: '支付機',
                  code: 'PAYMENT_DEVICE',
                },
              ],
            },
            {
              name: '長照系統',
              value: '長照系統',
              code: 'LONG_TERM_CARE_SYSTEM',
              specifications: [
                {
                  name: '長照系統',
                  value: '長照系統',
                  code: 'LONG_TERM_CARE_SYSTEM',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default initialData
