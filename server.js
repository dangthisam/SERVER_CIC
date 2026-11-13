const express = require("express");
const app = express();
// =============================================================================
// API MOCK GỬI MAIL (CHUYỂN TIẾP MAIL SANG MAILPIT 127.0.0.1:1025)
// =============================================================================
const nodemailer = require("nodemailer");
const multer = require("multer");
const upload = multer(); // Middleware đọc multipart/form-data từ C#
// Thêm các middleware đọc body tổng quát
app.use(
  "/gw/internal/plf-email-service/api/v1/send-mail",
  express.raw({ type: "*/*", limit: "50mb" })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const PORT = process.env.PORT || 8000;
const ticketScenarioMap = new Map();
// =============================================================================
// CAU HINH TEST CHUNG: MA OUT_06 (CUNG CAP BAO CAO THANH CONG DAY DU DU LIEU)
// =============================================================================
const TEST_CONFIG = {
  HTTP_STATUS: 200,
  OUT_CODE: "OUT_06",
  TL099_FULL: "OUT_06: Có duy nhất một mã CIC có thông tin",
  MESSAGE: "Success",
};
// Cấu hình Transporter kết nối tới Mailpit SMTP cổng 1025
const mailpitTransporter = nodemailer.createTransport({
  host: "100.102.103.53",
  port: 1025,
  secure: false,
  tls: { rejectUnauthorized: false }
});
// API ROUTE GỬI MAIL
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
// ROUTE GỬI MAIL THÔNG BÁO / BẢNG KÊ PHÍ
app.post("/gw/internal/plf-email-service/api/v1/send-mail", async (req, res) => {
  try {
    let rawBody = "";
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString("utf-8");
    } else if (typeof req.body === "string") {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body);
    }
    // 1. TỰ ĐỘNG XÓA PHẦN \r\n THỪA Ở ĐẦU GÓI TIN DO C# GỬI SANG
    rawBody = rawBody.trimStart();
    let infoMailRaw = null;
    // 2. THUẬT TOÁN TRÍCH XUẤT CHUỖI JSON CHÍNH XÁC (TỪ '{' ĐẦU TIÊN TỚI '}' CUỐI CÙNG)
    const firstBrace = rawBody.indexOf("{");
    const lastBrace = rawBody.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      infoMailRaw = rawBody.substring(firstBrace, lastBrace + 1);
    }
    if (!infoMailRaw) {
      console.log("[SEND-MAIL ERROR] Không tìm thấy dữ liệu JSON trong body");
      return res.status(400).json({ status: "error", message: "Missing info-mail parameter" });
    }
    // 3. PARSE DỮ LIỆU EMAIL
    const mailData = JSON.parse(infoMailRaw);
    const mailBody = mailData.body || {};
    const from = mailBody.from || "ducnn5@locphatbank.com";
    const subject = mailBody.subject || "Thông báo kết quả CIC";
    const htmlContent = mailBody.content || "";
    const toList = mailBody.send && mailBody.send.to ? mailBody.send.to : [];
    const ccList = mailBody.send && mailBody.send.cc ? mailBody.send.cc : [];
    // 4. BẮN MAIL SANG MAILPIT
    await mailpitTransporter.sendMail({
      from: from,
      to: toList,
      cc: ccList,
      subject: subject,
      html: htmlContent,
    });
    console.log(`[Mailpit Success] Đã gửi mail "${subject}" tới: ${toList.join(", ")}`);
    // 5. TRẢ VỀ STRUCT DẠNG RESPONSE C# MONG CHỜ
    return res.json({
      res_code: {
        error_code: "00",
        message: "Success",
      },
    });
  } catch (error) {
    console.error("[Mailpit Error]", error.message);
    return res.status(500).json({
      res_code: {
        error_code: "99",
        message: error.message,
      },
    });
  }
});
// =============================================================================
// CHÌA KHÓA: TỰ ĐỘNG PHẢN HỒI '100 CONTINUE' KHI C# YÊU CẦU (CHỐNG RỚT SOCKET)
// =============================================================================

// Helper format ngày giờ
function getNowFormatted() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  const padMs = (n) => n.toString().padStart(3, "0");
  const yyyy = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const sss = padMs(now.getMilliseconds());

  return {
    time: `${HH}:${mm}:${ss}`,
    date: `${dd}/${MM}/${yyyy}`,
    fullDateTime: `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}.${sss}`,
    rawDateTime: `${yyyy}${MM}${dd}${HH}${mm}${ss}`,
  };
}

// =============================================================================
// I. DATA REPORT MẪU CHUẨN XÁC 100% THEO C# MODEL CHO TỪNG SẢN PHẨM
// =============================================================================

// -----------------------------------------------------------------------------
// 1. S10T: BÁO CÁO THÔNG TIN TÍN DỤNG DOANH NGHIỆP (Đầy đủ BC100 -> BC700)
// -----------------------------------------------------------------------------
function getS10TReport(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return{
  "MASOPHIEU": "261005.7560.S10T",
  "TL001": "S10T",
  "TL002": "2026/S10T.1",
  "TL003": "Ngân hàng TMCP Lộc Phát Việt Nam",
  "TL004": "Tòa nhà LienVietPostBank, Số 210 đường Trần Quang Khải, Phường Tràng Tiền, Quận Hoàn Kiếm, Thành phố Hà Nội, Việt Nam",
  "TL005": "Nguyễn Thành Trung",
  "TL006": "h357tunguat",
  "TL007": "20261010 20:11:52.533",
  "TL008": "20261010 20:11:54.561",
  "MSTHUE_DKKD": "0300000810",
  "TENKH": "Công ty TNHH 810",
  "TL099": "OUT_06: Có duy nhất 1 mã CIC có thông tin",
  "TL100": "0",
  "BC100": {
    "BC110": {
      "TTC04": "Công ty TNHH 810",
      "MACIC": "9900000810",
      "BC1104": "0300000810",
      "BC1108": 2
    },
    "BC120": [
      "Địa chỉ của khách hàng 810"
    ],
    "BC130": {
      "TL000": "Hiện tại, CIC chưa thu thập được thông tin người đại diện của Công ty TNHH 810"
    },
    "BC140": {
      "TL000": "CIC không có thông tin HĐQT/HĐTV của Công ty TNHH 810"
    }
  },
  "BC200": {
    "BC210": [
      {
        "BC2101": "2025",
        "BC2102": "E",
        "BC2103": "N/A",
        "BC2104": "Không có thông tin: Doanh nghiệp thiếu thông tin để thực hiện việc đánh giá, xếp hạng tại CIC.",
        "BC2105": "20261010"
      },
      {
        "BC2101": "2024",
        "BC2102": "E",
        "BC2103": "N/A",
        "BC2104": "Không có thông tin: Doanh nghiệp thiếu thông tin để thực hiện việc đánh giá, xếp hạng tại CIC.",
        "BC2105": "20261010"
      }
    ]
  },
  "BC300": {
    "BC310": {
      "BC3101": {
        "BC31011": [
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
            "BC310111": "20260823",
            "BC310112": [
              {
                "BC3101121": "23",
                "BC3101122": [
                  {
                    "BC31011221": "",
                    "BC31011222": 29,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          },
          {
            "TTC01": "01310001",
            "TTC02": "Ngân hàng TMCP Kỹ Thương Việt Nam - Hội sở",
            "BC310111": "20260824",
            "BC310112": [
              {
                "BC3101121": "23",
                "BC3101122": [
                  {
                    "BC31011221": "",
                    "BC31011222": 197,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          },
          {
            "TTC01": "01617001",
            "TTC02": "Ngân hàng TNHH MTV HSBC Việt Nam - Chi nhánh Hà Nội",
            "BC310111": "20260821",
            "BC310112": [
              {
                "BC3101121": "23",
                "BC3101122": [
                  {
                    "BC31011221": "",
                    "BC31011222": 33,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          },
          {
            "TTC01": "79604001",
            "TTC02": "Ngân hàng TNHH MTV Standard Chartered Việt Nam - Chi nhánh thành phố Hồ Chí Minh",
            "BC310111": "20260824",
            "BC310112": [
              {
                "BC3101121": "23",
                "BC3101122": [
                  {
                    "BC31011221": "",
                    "BC31011222": 167,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          },
          {
            "TTC01": "79665004",
            "TTC02": "Ngân hàng TNHH Một thành viên United Overseas Bank (Việt Nam) - CN Sunwah",
            "BC310111": "20260826",
            "BC310112": [
              {
                "BC3101121": "23",
                "BC3101122": [
                  {
                    "BC31011221": "",
                    "BC31011222": 88,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          },
          {
            "TTC01": "79830001",
            "TTC02": "Công ty Tài chính TNHH MTV Home Credit Việt Nam",
            "BC310111": "20260824",
            "BC310112": [
              {
                "BC3101121": "23",
                "BC3101122": [
                  {
                    "BC31011221": "",
                    "BC31011222": 12,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          }
        ]
      },
      "BC3102": {
        "BC31021": [
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
            "BC310211": [
              {
                "BC3102111": "0",
                "BC3102112": 1,
                "BC3102115": "01",
                "BC3102116": "20250131",
                "BC3102117": 0,
                "BC3102118": 0,
                "BC3102119": 0
              }
            ]
          }
        ]
      },
      "BC3103": {
        "BC31031": [],
        "TL000": "Hiện tại, CIC không có thông tin đầu tư trái phiếu doanh nghiệp của khách hàng."
      },
      "BC3104": {
        "BC31041": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản cam kết ngoại bảng của khách hàng."
      },
      "BC3105": {
        "BC31051": [],
        "TL000": "Hiện tại, CIC không có thông tin cấp tín dụng từ nguồn vốn nhận ủy thác TCTD không chịu rủi ro (không bao gồm khoản nhận ủy thác từ TCTD khác) của khách hàng tại các TCTD."
      },
      "BC3106": {
        "BC31061": [
          {
            "TTC01": "01828001",
            "TTC02": "Công ty Tài chính tổng hợp cổ phần Tín Việt",
            "BC310611": 326,
            "BC310612": 0,
            "BC310613": "20260731",
            "BC310614": 120,
            "BC310615": "79M10001",
            "BC310616": "CÔNG TY TNHH MUA BÁN NỢ WELCOME"
          }
        ]
      },
      "BC3107": {
        "BC31071": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản dư nợ khác tại Ngân hàng Phát triển Việt Nam của khách hàng tại các TCTD."
      },
      "BC3110": {
        "BC31101": [],
        "TL000": "Hiện tại, CIC không có thông tin TCTN khách hàng đang quan hệ."
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          {
            "BC320111": "202608",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202607",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202606",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202605",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202604",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202603",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202602",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202601",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202512",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202511",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          },
          {
            "BC320111": "202510",
            "BC320112": 526,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 526
          }
        ]
      },
      "BC3202": {
        "BC32021": [],
        "TL000": "CIC không có thông tin nợ cần chú ý của khách hàng trong vòng 12 tháng gần nhất."
      },
      "BC3203": {
        "BC32031": [
          {
            "TTC01": "79830001",
            "TTC02": "Công ty Tài chính TNHH MTV Home Credit Việt Nam",
            "BC320311": [
              {
                "BC3203111": "20260824",
                "BC3203112": "-",
                "BC3203113": 12,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "01828001",
            "TTC02": "Công ty Tài chính tổng hợp cổ phần Tín Việt",
            "BC320311": [
              {
                "BC3203111": "20220531",
                "BC3203112": "-",
                "BC3203113": 88,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "79654001",
            "TTC02": "Ngân hàng Citibank, N.A., - Chi nhánh thành phố Hồ Chí Minh",
            "BC320311": [
              {
                "BC3203111": "20230228",
                "BC3203112": "-",
                "BC3203113": 88,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "01310001",
            "TTC02": "Ngân hàng TMCP Kỹ Thương Việt Nam - Hội sở",
            "BC320311": [
              {
                "BC3203111": "20260824",
                "BC3203112": "-",
                "BC3203113": 197,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "01309001",
            "TTC02": "Ngân hàng TMCP Việt Nam Thịnh Vượng",
            "BC320311": [
              {
                "BC3203111": "20220430",
                "BC3203112": "-",
                "BC3203113": 55,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "01309009",
            "TTC02": "Ngân hàng TMCP Việt Nam Thịnh Vượng - Chi nhánh Hà Nội",
            "BC320311": [
              {
                "BC3203111": "20220430",
                "BC3203112": "-",
                "BC3203113": 15,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
            "BC320311": [
              {
                "BC3203111": "20260823",
                "BC3203112": "-",
                "BC3203113": 29,
                "BC3203114": 0
              },
              {
                "BC3203111": "20221227",
                "BC3203112": "05",
                "BC3203113": 29,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "01617001",
            "TTC02": "Ngân hàng TNHH MTV HSBC Việt Nam - Chi nhánh Hà Nội",
            "BC320311": [
              {
                "BC3203111": "20260821",
                "BC3203112": "-",
                "BC3203113": 33,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "79604001",
            "TTC02": "Ngân hàng TNHH MTV Standard Chartered Việt Nam - Chi nhánh thành phố Hồ Chí Minh",
            "BC320311": [
              {
                "BC3203111": "20260824",
                "BC3203112": "-",
                "BC3203113": 167,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "01604002",
            "TTC02": "Ngân hàng TNHH MTV Standard Chartered Việt Nam - Hội sở chính",
            "BC320311": [
              {
                "BC3203111": "20211130",
                "BC3203112": "-",
                "BC3203113": 167,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "79665001",
            "TTC02": "Ngân hàng TNHH MTV United Overseas Việt Nam",
            "BC320311": [
              {
                "BC3203111": "20241231",
                "BC3203112": "-",
                "BC3203113": 88,
                "BC3203114": 0
              }
            ]
          },
          {
            "TTC01": "79665004",
            "TTC02": "Ngân hàng TNHH Một thành viên United Overseas Bank (Việt Nam) - CN Sunwah",
            "BC320311": [
              {
                "BC3203111": "20260826",
                "BC3203112": "-",
                "BC3203113": 88,
                "BC3203114": 0
              }
            ]
          }
        ]
      },
      "BC3204": {
        "BC32041": [],
        "TL000": "CIC không có thông tin lịch sử chậm thanh toán thẻ tín dụng của khách hàng trong 05 năm gần nhất."
      },
      "BC3206": {
        "BC32061": [
          {
            "TTC01": "79M10001",
            "TTC02": "Công ty mua bán nợ Welcome",
            "BC320613": 88
          }
        ]
      }
    }
  },
  "BC400": {
    "BC420": {
      "BC4201": [
        {
          "TTC01": "01202002",
          "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
          "BC42011": [
            {
              "BC420111": "00120/2021/0002239",
              "BC420112": "20221230",
              "BC420113": "20211029",
              "BC420114": "20221029",
              "BC420115": 91,
              "BC420116": 0,
              "BC420117": "VND",
              "BC420118": "05",
              "BC420119": "963",
              "BC420120": "",
              "BC420121": "04",
              "BC420122": "01",
              "BC420123": "",
              "BC420125": 3,
              "BC420126": true,
              "BC420127": 96,
              "BC420131": "05",
              "BC420132": "20221227",
              "BC420133": 29,
              "BC420134": []
            }
          ]
        }
      ]
    },
    "BC430": {
      "TL000": "CIC không có thông tin về hợp đồng thẻ tín dụng của khách hàng."
    },
    "BC440": {
      "TL000": "CIC không có thông tin về hợp đồng đầu tư trái phiếu doanh nghiệp của khách hàng."
    },
    "BC450": {
      "TL000": "CIC không có thông tin về hợp đồng cam kết ngoại bảng của khách hàng."
    },
    "BC460": {
      "TL000": "CIC không có thông tin về hợp đồng cấp tín dụng từ nguồn vốn ủy thác TCTD không chịu rủi ro (không bao gồm khoản nhận ủy thác từ TCTD khác) của khách hàng."
    },
    "BC470": {
      "TL000": "CIC không có thông tin chi tiết hợp đồng vay tại TCTN của khách hàng."
    },
    "BC480": {
      "TL000": "CIC không có thông tin chi tiết hợp đồng cam kết ngoại bảng tại TCTN của khách hàng."
    },
    "BC490": {
      "TL000": "CIC không có thông tin chi tiết hợp đồng cấp tín dụng từ nguồn vốn ủy thác TCTN không chịu rủi ro (không bao gồm khoản nhận ủy thác từ TCTN khác) của khách hàng."
    }
  },
  "BC500": {
    "BC510": [
      {
        "TTC01": "01309001",
        "TTC02": "Ngân hàng TMCP Việt Nam Thịnh Vượng",
        "BC5101": "20220430",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "01309009",
        "TTC02": "Ngân hàng TMCP Việt Nam Thịnh Vượng - Chi nhánh Hà Nội",
        "BC5101": "20220430",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "79654001",
        "TTC02": "Ngân hàng Citibank, N.A., - Chi nhánh thành phố Hồ Chí Minh",
        "BC5101": "20240529",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "79665001",
        "TTC02": "Ngân hàng TNHH MTV United Overseas Việt Nam",
        "BC5101": "20241225",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "01202002",
        "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
        "BC5101": "20241231",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "01310001",
        "TTC02": "Ngân hàng TMCP Kỹ Thương Việt Nam - Hội sở",
        "BC5101": "20241231",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "01310006",
        "TTC02": "Ngân hàng TMCP Kỹ Thương Việt Nam - Chi nhánh Đông Đô",
        "BC5101": "20241231",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "01310007",
        "TTC02": "Ngân hàng TMCP Kỹ Thương Việt Nam - Chi nhánh Hoàng Quốc Việt",
        "BC5101": "20241231",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "01828001",
        "TTC02": "Công ty Tài chính tổng hợp cổ phần Tín Việt",
        "BC5101": "20241231",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "79830001",
        "TTC02": "Công ty Tài chính TNHH MTV Home Credit Việt Nam",
        "BC5101": "20241231",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "01617001",
        "TTC02": "Ngân hàng TNHH MTV HSBC Việt Nam - Chi nhánh Hà Nội",
        "BC5101": "20250430",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      }
    ]
  },
  "BC600": [
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261009 15:30:27.000"
    },
    {
      "TTC01": "632",
      "TTC02": "Ngân hàng FAR EAST NATIONAL BANK - CN TP Hồ Chí Minh",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 14:47:43.000"
    },
    {
      "TTC01": "632",
      "TTC02": "Ngân hàng FAR EAST NATIONAL BANK - CN TP Hồ Chí Minh",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 14:42:22.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 09:36:46.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 09:30:57.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261006 14:18:39.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261006 13:20:54.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261006 11:39:42.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261006 11:32:50.000"
    },
    {
      "TTC01": "79303001",
      "TTC02": "Ngân hàng TMCP Sài Gòn Thương Tín",
      "BC610": "Kiểm soát sau vay định kỳ",
      "BC620": "20261005 14:42:26.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Lý do 1",
      "BC620": "20261001 17:43:57.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260925 17:20:47.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260925 17:14:36.000"
    }
  ]
};
}
function getS10TReportVT(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return{
  "MASOPHIEU": "PHIEU-2026/10/000123",
  "TL001": "S10T",
  "TL002": "2026/S10T",
  "TL003": "Ngân hàng TMCP ABC - CN Hà Nội - Nguyễn Văn An (user: annv) - 0243xxxxxxx",
  "TL004": "Số 10 Phố Huế, Quận Hai Bà Trưng, Hà Nội",
  "TL005": "Nguyễn Văn An",
  "TL006": "annv",
  "TL007": "20261011 09:15:22.123",
  "TL008": "20261011 09:15:25.847",
  "MSTHUE_DKKD": "0101234567",
  "TENKH": "CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ XÂY DỰNG HOÀNG LONG",
  "TL099": "OUT_06",
  "TL100": "",
  "BC100": {
    "BC110": {
      "TTC04": "CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ XÂY DỰNG HOÀNG LONG",
      "MACIC": "1012345678",
      "BC1101": "HOANG LONG TRADING AND CONSTRUCTION JOINT STOCK COMPANY",
      "BC1102": "HOANG LONG TC JSC",
      "BC1103": "CÔNG TY TNHH THƯƠNG MẠI HOÀNG LONG",
      "BC1104": "0101234567",
      "BC1105": "0101234567",
      "BC1106": "05",
      "BC1107": "468",
      "BC1108": 2
    },
    "BC120": [
      "Số 25 Nguyễn Trãi, Phường Thanh Xuân Trung, Quận Thanh Xuân, Hà Nội",
      "Lô B2 KCN Quang Minh, Huyện Mê Linh, Hà Nội"
    ],
    "BC130": {
      "BC1301": [
        {
          "BC13011": "Tổng giám đốc",
          "BC13012": "Trần Quang Hưng"
        },
        {
          "BC13011": "Giám đốc tài chính",
          "BC13012": "Lê Thị Mai"
        }
      ],
      "TL000": ""
    },
    "BC140": {
      "BC1401": [
        {
          "BC14011": "Chủ tịch HĐQT",
          "BC14012": "Phạm Minh Đức"
        },
        {
          "BC14011": "Thành viên HĐQT",
          "BC14012": "Trần Quang Hưng"
        },
        {
          "BC14011": "Thành viên HĐQT",
          "BC14012": "Vũ Thị Hồng Nhung"
        }
      ],
      "TL000": ""
    }
  },
  "BC200": {
    "BC210": [
      {
        "BC2101": "2025",
        "BC2102": "B2",
        "BC2103": "2.35",
        "BC2104": "Rủi ro vỡ nợ trên trung bình: Doanh nghiệp có tiềm lực tài chính trung bình, hoạt động kinh doanh chưa đạt hiệu quả tốt.",
        "BC2105": "20260315"
      },
      {
        "BC2101": "2024",
        "BC2102": "B1",
        "BC2103": "1.52",
        "BC2104": "Rủi ro vỡ nợ trung bình: Doanh nghiệp có tiềm lực tài chính khá, có khả năng trang trải các khoản nợ ở mức trung bình khá, hoạt động kinh doanh tương đối hiệu quả.",
        "BC2105": "20250318"
      },
      {
        "BC2101": "2023",
        "BC2102": "B2",
        "BC2103": "2.80",
        "BC2104": "Rủi ro vỡ nợ trên trung bình: Doanh nghiệp có tiềm lực tài chính trung bình, hoạt động kinh doanh chưa đạt hiệu quả tốt.",
        "BC2105": "20240320"
      }
    ],
    "TL000": ""
  },
  "BC300": {
    "BC310": {
      "BC3101": {
        "BC31011": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310111": "20260930",
            "BC310112": [
              {
                "BC3101121": "01",
                "BC3101122": [
                  {
                    "BC31011221": "01",
                    "BC31011222": 20000000000,
                    "BC31011223": 0
                  }
                ]
              },
              {
                "BC3101121": "03",
                "BC3101122": [
                  {
                    "BC31011221": "01",
                    "BC31011222": 12000000000,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC310111": "20260930",
            "BC310112": [
              {
                "BC3101121": "01",
                "BC3101122": [
                  {
                    "BC31011221": "01",
                    "BC31011222": 10000000000,
                    "BC31011223": 0
                  },
                  {
                    "BC31011221": "02",
                    "BC31011222": 5000000000,
                    "BC31011223": 0
                  }
                ]
              },
              {
                "BC3101121": "02",
                "BC3101122": [
                  {
                    "BC31011221": "01",
                    "BC31011222": 5000000000,
                    "BC31011223": 0
                  }
                ]
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3102": {
        "BC31021": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310211": [
              {
                "BC3102111": "1",
                "BC3102112": 5,
                "BC3102113": 2000000000,
                "BC3102114": 1200000000,
                "BC3102115": "01",
                "BC3102116": "20260930",
                "BC3102117": 350000000,
                "BC3102118": 0,
                "BC3102119": 0
              },
              {
                "BC3102111": "0",
                "BC3102112": 2,
                "BC3102113": 500000000,
                "BC3102114": 0,
                "BC3102115": "01",
                "BC3102116": "20260930",
                "BC3102117": 0,
                "BC3102118": 0,
                "BC3102119": 0
              }
            ]
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC310211": [
              {
                "BC3102111": "1",
                "BC3102112": 3,
                "BC3102113": 2000000000,
                "BC3102114": 600000000,
                "BC3102115": "01",
                "BC3102116": "20260930",
                "BC3102117": 120000000,
                "BC3102118": 0,
                "BC3102119": 0
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3103": {
        "BC31031": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310311": 4000000000,
            "BC310312": 0,
            "BC310313": "01",
            "BC310314": "20260930"
          },
          {
            "TTC01": "01203003",
            "TTC02": "Ngân hàng TMCP DEF - CN Hà Nội",
            "BC310311": 3000000000,
            "BC310312": 0,
            "BC310313": "01",
            "BC310314": "20260930"
          }
        ],
        "TL000": ""
      },
      "BC3104": {
        "BC31041": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310411": 7000000000,
            "BC310412": 0,
            "BC310413": "01",
            "BC310414": "20260930"
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC310411": 5000000000,
            "BC310412": 0,
            "BC310413": "01",
            "BC310414": "20260930"
          }
        ],
        "TL000": ""
      },
      "BC3105": {
        "BC31051": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310511": 2000000000,
            "BC310512": 0,
            "BC310513": 0,
            "BC310514": "20260930"
          }
        ],
        "TL000": ""
      },
      "BC3106": {
        "BC31061": [
          {
            "TTC01": "01204004",
            "TTC02": "Ngân hàng TMCP GHI - CN Hà Nội",
            "BC310611": 3000000000,
            "BC310612": 0,
            "BC310613": "20260630",
            "BC310614": 120,
            "BC310615": "00VAMC01",
            "BC310616": "Công ty Quản lý tài sản của các TCTD Việt Nam (VAMC)"
          }
        ],
        "TL000": ""
      },
      "BC3107": {
        "BC31071": [
          {
            "TTC01": "VDB00001",
            "TTC02": "Ngân hàng Phát triển Việt Nam - CN Hà Nội",
            "BC310711": [
              {
                "BC3107111": "V1",
                "BC3107112": "03",
                "BC3107113": 5000000000,
                "BC3107114": 0,
                "BC3107115": "20260831"
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3110": {
        "BC31101": [
          {
            "TTC01": "TN000001",
            "TTC02": "Quỹ tín dụng nhân dân Mê Linh",
            "BC311011": 2000000000,
            "BC311012": 0,
            "BC311013": 500000000,
            "BC311014": 0,
            "BC311015": 0,
            "BC311016": 0,
            "BC311017": "20260930",
            "BC311018": 0,
            "BC311019": "01"
          },
          {
            "TTC01": "TN000002",
            "TTC02": "Tổ chức tài chính vi mô Hà Thành",
            "BC311011": 0,
            "BC311012": 0,
            "BC311013": 0,
            "BC311014": 0,
            "BC311015": 800000000,
            "BC311016": 0,
            "BC311017": "20260930",
            "BC311018": 15,
            "BC311019": "01"
          }
        ],
        "TL000": ""
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          { "BC320111": "102025", "BC320112": 40000000000, "BC320113": 1200000000, "BC320114": 3000000000, "BC320115": 5000000000, "BC320116": 8000000000,  "BC320117": 0, "BC320118": 54200000000 },
          { "BC320111": "112025", "BC320112": 41000000000, "BC320113": 1300000000, "BC320114": 3000000000, "BC320115": 5000000000, "BC320116": 8500000000,  "BC320117": 0, "BC320118": 55800000000 },
          { "BC320111": "122025", "BC320112": 42500000000, "BC320113": 1250000000, "BC320114": 3000000000, "BC320115": 5000000000, "BC320116": 9000000000,  "BC320117": 0, "BC320118": 57750000000 },
          { "BC320111": "012026", "BC320112": 43000000000, "BC320113": 1400000000, "BC320114": 3500000000, "BC320115": 5000000000, "BC320116": 9000000000,  "BC320117": 0, "BC320118": 58400000000 },
          { "BC320111": "022026", "BC320112": 44000000000, "BC320113": 1350000000, "BC320114": 3500000000, "BC320115": 5000000000, "BC320116": 9500000000,  "BC320117": 0, "BC320118": 59850000000 },
          { "BC320111": "032026", "BC320112": 45000000000, "BC320113": 1500000000, "BC320114": 3500000000, "BC320115": 5000000000, "BC320116": 10000000000, "BC320117": 0, "BC320118": 61500000000 },
          { "BC320111": "042026", "BC320112": 46000000000, "BC320113": 1450000000, "BC320114": 3500000000, "BC320115": 7000000000, "BC320116": 10000000000, "BC320117": 0, "BC320118": 64450000000 },
          { "BC320111": "052026", "BC320112": 47500000000, "BC320113": 1600000000, "BC320114": 4000000000, "BC320115": 7000000000, "BC320116": 10500000000, "BC320117": 0, "BC320118": 66600000000 },
          { "BC320111": "062026", "BC320112": 48000000000, "BC320113": 1550000000, "BC320114": 4000000000, "BC320115": 7000000000, "BC320116": 11000000000, "BC320117": 0, "BC320118": 67550000000 },
          { "BC320111": "072026", "BC320112": 49000000000, "BC320113": 1700000000, "BC320114": 4000000000, "BC320115": 7000000000, "BC320116": 11000000000, "BC320117": 0, "BC320118": 68700000000 },
          { "BC320111": "082026", "BC320112": 50000000000, "BC320113": 1650000000, "BC320114": 4000000000, "BC320115": 7000000000, "BC320116": 11500000000, "BC320117": 0, "BC320118": 70150000000 },
          { "BC320111": "092026", "BC320112": 52000000000, "BC320113": 1800000000, "BC320114": 4000000000, "BC320115": 7000000000, "BC320116": 12000000000, "BC320117": 0, "BC320118": 72800000000 }
        ],
        "TL000": ""
      },
      "BC3202": {
        "BC32021": [
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC320211": "072026",
            "BC320212": 2000000000
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC320211": "082026",
            "BC320212": 4000000000
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC320211": "092026",
            "BC320212": 5000000000
          },
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC320211": "062026",
            "BC320212": 1500000000
          }
        ],
        "TL000": ""
      },
      "BC3203": {
        "BC32031": [
          {
            "TTC01": "01204004",
            "TTC02": "Ngân hàng TMCP GHI - CN Hà Nội",
            "BC320311": [
              {
                "BC3203111": "20230615",
                "BC3203112": "03",
                "BC3203113": 2500000000,
                "BC3203114": 0
              },
              {
                "BC3203111": "20230915",
                "BC3203112": "04",
                "BC3203113": 3000000000,
                "BC3203114": 0
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3204": {
        "BC32041": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC320411": [
              {
                "BC3204111": "20250310",
                "BC3204112": "02",
                "BC3204113": 3,
                "BC3204114": 35
              },
              {
                "BC3204111": "20240122",
                "BC3204112": "01",
                "BC3204113": 0,
                "BC3204114": 8
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3206": {
        "BC32061": [
          {
            "TTC01": "TN000001",
            "TTC02": "Quỹ tín dụng nhân dân Mê Linh",
            "BC320611": 25,
            "BC320612": "02",
            "BC320613": 150000000
          },
          {
            "TTC01": "TN000002",
            "TTC02": "Tổ chức tài chính vi mô Hà Thành",
            "BC320611": 15,
            "BC320612": "01",
            "BC320613": 80000000
          }
        ],
        "TL000": ""
      }
    }
  },
  "BC400": {
    "BC420": {
      "BC4201": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC42011": [
            {
              "BC420111": "HDTD-2025/ABC-0001",
              "BC420112": "20260930",
              "BC420113": "20250401",
              "BC420114": "20270331",
              "BC420115": 25000000000,
              "BC420116": 20000000000,
              "BC420117": "00",
              "BC420118": "01",
              "BC420119": "468",
              "BC420120": "1A112",
              "BC420121": "01",
              "BC420122": "01",
              "BC420123": "14",
              "BC420124": "",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 0,
              "BC420128": 0,
              "BC420129": 0,
              "BC420130": 0,
              "BC420131": "02",
              "BC420132": "20250310",
              "BC420133": 18000000000,
              "BC420134": [
                {
                  "BC4201341": "Phạm Minh Đức",
                  "BC4201342": "001080012345",
                  "BC4201343": 4
                }
              ]
            },
            {
              "BC420111": "HDTD-2024/ABC-0087",
              "BC420112": "20260930",
              "BC420113": "20240615",
              "BC420114": "20290614",
              "BC420115": 15000000000,
              "BC420116": 12000000000,
              "BC420117": "00;37",
              "BC420118": "01",
              "BC420119": "431",
              "BC420120": "1A113",
              "BC420121": "03",
              "BC420122": "01",
              "BC420123": "11",
              "BC420124": "",
              "BC420125": 1,
              "BC420126": true,
              "BC420127": 0,
              "BC420128": 0,
              "BC420129": 0,
              "BC420130": 0,
              "BC420131": "01",
              "BC420132": "20260930",
              "BC420133": 12000000000,
              "BC420134": []
            }
          ]
        },
        {
          "TTC01": "01202002",
          "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
          "BC42011": [
            {
              "BC420111": "XYZ/TL/2025/00345",
              "BC420112": "20260930",
              "BC420113": "20250801",
              "BC420114": "20270801",
              "BC420115": 22000000000,
              "BC420116": 20000000000,
              "BC420117": "00",
              "BC420118": "02",
              "BC420119": "468",
              "BC420120": "1A112",
              "BC420121": "02",
              "BC420122": "01",
              "BC420123": "14",
              "BC420124": "",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 5000000000,
              "BC420128": 45,
              "BC420129": 120000000,
              "BC420130": 45,
              "BC420131": "02",
              "BC420132": "20260930",
              "BC420133": 5000000000,
              "BC420134": []
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC430": {
      "BC4301": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC43011": [
            {
              "BC430111": "THE-ABC-2023-0456",
              "BC430112": "20260930",
              "BC430113": 2000000000,
              "BC430114": 1,
              "BC430115": 5,
              "BC430116": 350,
              "BC430117": 0,
              "BC430118": 0,
              "BC430119": 1200000000,
              "BC430120": "01",
              "BC430121": 1,
              "BC430122": 3,
              "BC430123": 35
            },
            {
              "BC430111": "THE-ABC-2021-0112",
              "BC430112": "20260930",
              "BC430113": 500000000,
              "BC430114": 2,
              "BC430115": 2,
              "BC430116": 0,
              "BC430117": 0,
              "BC430118": 0,
              "BC430119": 0,
              "BC430120": "01",
              "BC430121": 0,
              "BC430122": 0,
              "BC430123": 0
            }
          ]
        },
        {
          "TTC01": "01202002",
          "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
          "BC43011": [
            {
              "BC430111": "XYZ-CARD-2024-7788",
              "BC430112": "20260930",
              "BC430113": 2000000000,
              "BC430114": 1,
              "BC430115": 3,
              "BC430116": 120,
              "BC430117": 0,
              "BC430118": 0,
              "BC430119": 600000000,
              "BC430120": "01",
              "BC430121": 0,
              "BC430122": 0,
              "BC430123": 0
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC440": {
      "BC4401": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC44011": [
            {
              "BC440111": "TP-HL-2026-001",
              "BC440112": "20260930",
              "BC440113": "20260415",
              "BC440114": "20260401",
              "BC440115": "20290401",
              "BC440116": 4000000000,
              "BC440117": 1000000000,
              "BC440118": "01",
              "BC440119": "00",
              "BC440120": "410",
              "BC440121": "011",
              "BC440122": "36 tháng",
              "BC440123": "01",
              "BC440124": 4000000000
            }
          ]
        },
        {
          "TTC01": "01203003",
          "TTC02": "Ngân hàng TMCP DEF - CN Hà Nội",
          "BC44011": [
            {
              "BC440111": "TP-HL-2026-002",
              "BC440112": "20260930",
              "BC440113": "20260620",
              "BC440114": "20260601",
              "BC440115": "20281201",
              "BC440116": 3000000000,
              "BC440117": 0,
              "BC440118": "01",
              "BC440119": "00",
              "BC440120": "410",
              "BC440121": "022",
              "BC440122": "30 tháng",
              "BC440123": "01",
              "BC440124": 3000000000
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC450": {
      "BC4501": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC45011": [
            {
              "BC450111": "BL-ABC-2026-0021",
              "BC450112": "20260930",
              "BC450113": "20260110",
              "BC450114": "20270110",
              "BC450115": 7000000000,
              "BC450116": "00",
              "BC450117": "01",
              "BC450118": "013",
              "BC450119": "Bảo lãnh thực hiện hợp đồng thi công công trình trường học tại Mê Linh",
              "BC450120": "01",
              "BC450121": 7000000000
            }
          ]
        },
        {
          "TTC01": "01202002",
          "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
          "BC45011": [
            {
              "BC450111": "LC-XYZ-2026-0105",
              "BC450112": "20260930",
              "BC450113": "20260501",
              "BC450114": "20261101",
              "BC450115": 5000000000,
              "BC450116": "00",
              "BC450117": "01",
              "BC450118": "033",
              "BC450119": "Thư tín dụng trả ngay nhập khẩu vật liệu xây dựng",
              "BC450120": "01",
              "BC450121": 5000000000
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC460": {
      "BC4601": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC46011": [
            {
              "BC460111": "UT-ABC-2025-0009",
              "BC460112": "20260930",
              "BC460113": "20250901",
              "BC460114": "20270901",
              "BC460115": 2500000000,
              "BC460116": "Quỹ đầu tư phát triển Thủ đô",
              "BC460117": "0109876543",
              "BC460118": 2000000000,
              "BC460119": "00",
              "BC460120": "410",
              "BC460121": "1A112",
              "BC460122": "02",
              "BC460123": "01",
              "BC460124": "11",
              "BC460125": 0,
              "BC460126": 0,
              "BC460127": 0,
              "BC460128": 0,
              "BC460129": 0,
              "BC460130": 0,
              "BC460131": 0,
              "BC460132": 0
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC470": {
      "BC4701": [
        {
          "TTC01": "TN000001",
          "TTC02": "Quỹ tín dụng nhân dân Mê Linh",
          "BC47011": [
            {
              "BC470111": "QTD-ML-2025-0150",
              "BC470112": "20260930",
              "BC470113": "20250701",
              "BC470114": "20270701",
              "BC470115": 3000000000,
              "BC470116": 2000000000,
              "BC470117": "00",
              "BC470119": "468",
              "BC470120": "1A112",
              "BC470121": "02",
              "BC470122": "01",
              "BC470123": "14",
              "BC470125": 0,
              "BC470126": false,
              "BC470127": 150000000,
              "BC470128": 25,
              "BC470129": 10000000,
              "BC470130": 25,
              "BC470131": 150000000,
              "BC470132": 25
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC480": {
      "BC4801": [
        {
          "TTC01": "TN000001",
          "TTC02": "Quỹ tín dụng nhân dân Mê Linh",
          "BC48011": [
            {
              "BC480111": "QTD-ML-BL-2026-0012",
              "BC480112": "20260930",
              "BC480113": "20260301",
              "BC480114": "20270301",
              "BC480115": 500000000,
              "BC480116": "00",
              "BC480118": "012",
              "BC480119": "Bảo lãnh thanh toán tiền mua vật tư xây dựng",
              "BC480120": 500000000,
              "BC480121": 0
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC490": {
      "BC4901": [
        {
          "TTC01": "TN000002",
          "TTC02": "Tổ chức tài chính vi mô Hà Thành",
          "BC49011": [
            {
              "BC490111": "VM-HT-UT-2026-0005",
              "BC490112": "20260930",
              "BC490113": "20260201",
              "BC490114": "20270201",
              "BC490115": 1000000000,
              "BC490116": "Hợp tác xã Nông nghiệp Mê Linh",
              "BC490117": "0108765432",
              "BC490118": 800000000,
              "BC490119": "00",
              "BC490120": "011",
              "BC490121": "1A12",
              "BC490122": "02",
              "BC490123": "01",
              "BC490124": "11",
              "BC490125": 0,
              "BC490126": 15,
              "BC490127": 5000000,
              "BC490128": 15,
              "BC490129": 80000000,
              "BC490130": 15,
              "BC490131": 5000000,
              "BC490132": 15
            }
          ]
        }
      ],
      "TL000": ""
    }
  },
  "BC500": {
    "BC510": [
      {
        "TTC01": "01201001",
        "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
        "BC5101": "20260930",
        "BC5102": [
          {
            "BC51021": "BL-2025-0001",
            "BC51022": "805",
            "BC51023": "Bảo lãnh của Công ty CP Đầu tư Hoàng Long Holding cho toàn bộ nghĩa vụ trả nợ",
            "BC51024": "HDTD-2025/ABC-0001"
          }
        ],
        "BC5103": [
          {
            "BC51031": "HDTD-2024/ABC-0087"
          }
        ],
        "BC5104": [
          {
            "BC51041": "BL-ABC-2026-0021"
          }
        ],
        "BC5105": [
          {
            "BC51051": "TSBD-2025-000458",
            "BC51052": "401",
            "BC51053": "20250401",
            "BC51054": "20300401",
            "BC51055": 35000000000,
            "BC51056": 30000,
            "BC51057": "Quyền sử dụng đất và tài sản gắn liền với đất tại Lô B2 KCN Quang Minh, Mê Linh, Hà Nội; diện tích 5.000 m2; GCN số CT12345/2024",
            "BC51058": "HDTD-2025/ABC-0001",
            "BC51059": false,
            "BC51060": false,
            "BC51061": false,
            "BC51062": [
              {
                "BC510621": "CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ XÂY DỰNG HOÀNG LONG",
                "BC510622": "0101234567"
              },
              {
                "BC510621": "Phạm Minh Đức",
                "BC510622": "001080012345"
              }
            ]
          },
          {
            "BC51051": "TSBD-2024-000912",
            "BC51052": "304",
            "BC51053": "20240615",
            "BC51054": "20290614",
            "BC51055": 8000000000,
            "BC51056": 8000,
            "BC51057": "02 xe tải nặng biển số 29H-123.45 và 29H-678.90",
            "BC51058": "HDTD-2024/ABC-0087",
            "BC51059": true,
            "BC51060": false,
            "BC51061": false,
            "BC51062": [
              {
                "BC510621": "CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ XÂY DỰNG HOÀNG LONG",
                "BC510622": "0101234567"
              }
            ]
          }
        ]
      },
      {
        "TTC01": "01202002",
        "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
        "BC5101": "20260930",
        "BC5102": [],
        "BC5103": [],
        "BC5104": [],
        "BC5105": [
          {
            "BC51051": "XYZ-TS-2025-0077",
            "BC51052": "202",
            "BC51053": "20250801",
            "BC51054": "20270801",
            "BC51055": 10000000000,
            "BC51056": 10000,
            "BC51057": "Hợp đồng tiền gửi có kỳ hạn số HDTG-2025-5521 tại Ngân hàng TMCP XYZ",
            "BC51058": "XYZ/TL/2025/00345",
            "BC51059": false,
            "BC51060": false,
            "BC51061": false,
            "BC51062": [
              {
                "BC510621": "CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ XÂY DỰNG HOÀNG LONG",
                "BC510622": "0101234567"
              }
            ]
          }
        ]
      }
    ],
    "TL000": ""
  },
  "BC600": [
    {
      "TTC01": "01201001",
      "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
      "BC610": "Thẩm định tín dụng/cấp tín dụng",
      "BC620": "20260915 14:32:10.456"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
      "BC610": "Theo dõi, kiểm tra sau cho vay",
      "BC620": "20260702 09:05:44.120"
    },
    {
      "TTC01": "01203003",
      "TTC02": "Ngân hàng TMCP DEF - CN Hà Nội",
      "BC610": "Thẩm định đầu tư trái phiếu doanh nghiệp",
      "BC620": "20260318 16:47:03.901"
    }
  ],
  "BC700": {
    "BC710": "Khách hàng có 01 khoản nợ cần chú ý tại TCTD XYZ - CN Thăng Long; không có thông tin khác."
  }
};
}

// -----------------------------------------------------------------------------
// 2. S11T: BÁO CÁO DOANH NGHIỆP CHI TIẾT
// -----------------------------------------------------------------------------
function getS11TReport(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return{
  "MASOPHIEU": "261005.957980987876808.S11T",
  "TL001": "S11T",
  "TL002": "2026/S11T.1",
  "TL003": "Ngân hàng TMCP Lộc Phát Việt Nam",
  "TL004": "Tòa nhà LienVietPostBank, Số 210 đường Trần Quang Khải, Phường Tràng Tiền, Quận Hoàn Kiếm, Thành phố Hà Nội, Việt Nam",
  "TL005": "Nguyễn Thành Trung",
  "TL006": "h357tunguat",
  "TL007": "20261013 08:22:50.282",
  "TL008": "20261013 08:22:51.241",
  "CCCD_HOCHIEU": "010000000077",
  "TENKH": "Nguyễn Thị 77",
  "TL099": "OUT_06: Có duy nhất 1 mã CIC có thông tin",
  "TL100": "0",
  "BC100": {
    "BC110": {
      "TTC04": "Nguyễn Thị 77",
      "MACIC": "9939000242",
      "BC1109": "1",
      "BC1110": "19750402",
      "BC1111": "0868355116",
      "BC1112": 1,
      "BC1113": "190",
      "BC1114": "010000000077",
      "BC1115": true,
      "BC1116": "011691355"
    },
    "BC120": [
      "Địa chỉ của khách hàng 77"
    ]
  },
 "BC200": {
    "TL000": "Hiện tại, CIC không đủ thông tin để chấm điểm tín dụng của khách hàng."
  },
  "BC300": {
    "BC310": {
      "BC3101": {
        "BC31011": [],
        "TL000": "Hiện tại, khách hàng không còn thông tin dư nợ vay và cấp tín dụng khác."
      },
      "BC3102": {
        "BC31021": [
          {
            "TTC01": "01302001",
            "TTC02": "Ngân hàng TMCP Hàng hải Việt Nam",
            "BC310211": [
              {
                "BC3102111": "0",
                "BC3102112": 1,
                "BC3102114": 0,
                "BC3102115": "01",
                "BC3102116": "20260703",
                "BC3102117": 0,
                "BC3102118": 0,
                "BC3102119": 0
              }
            ]
          },
          {
            "TTC01": "01348005",
            "TTC02": "Ngân hàng TMCP Sài Gòn- Hà Nội - Chi nhánh Vạn Phúc",
            "BC310211": [
              {
                "BC3102111": "1",
                "BC3102112": 1,
                "BC3102113": 25,
                "BC3102114": 0,
                "BC3102115": "01",
                "BC3102116": "20260821",
                "BC3102117": 0,
                "BC3102118": 0,
                "BC3102119": 0
              }
            ]
          }
        ]
      },
      "BC3104": {
        "BC31041": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản cam kết ngoại bảng của khách hàng."
      },
      "BC3105": {
        "BC31051": [],
        "TL000": "Hiện tại, CIC không có thông tin cấp tín dụng từ nguồn vốn nhận ủy thác TCTD không chịu rủi ro (không bao gồm khoản nhận ủy thác từ TCTD khác) của khách hàng tại các TCTD."
      },
      "BC3106": {
        "BC31061": [],
        "TL000": "Hiện tại, CIC không có thông tin dư nợ đã bán cho các công ty mua bán nợ của khách hàng."
      },
      "BC3107": {
        "BC31071": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản dư nợ khác tại Ngân hàng Phát triển Việt Nam của khách hàng tại các TCTD."
      },
      "BC3110": {
        "BC31101": [],
        "TL000": "Hiện tại, CIC không có thông tin TCTN khách hàng đang quan hệ."
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          {
            "BC320111": "202607",
            "BC320112": 0,
            "BC320113": 9,
            "BC320114": 25,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 9,
            "BC320115": 0
          },
          {
            "BC320111": "202606",
            "BC320112": 0,
            "BC320113": 0,
            "BC320114": 55,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 0,
            "BC320115": 0
          },
          {
            "BC320111": "202605",
            "BC320112": 0,
            "BC320113": 0,
            "BC320114": 55,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 0,
            "BC320115": 0
          },
          {
            "BC320111": "202604",
            "BC320112": 0,
            "BC320113": 0,
            "BC320114": 55,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 0,
            "BC320115": 0
          },
          {
            "BC320111": "202603",
            "BC320112": 0,
            "BC320113": 30,
            "BC320114": 55,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 30,
            "BC320115": 0
          },
          {
            "BC320111": "202602",
            "BC320112": 0,
            "BC320113": 0,
            "BC320114": 25,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 0,
            "BC320115": 0
          },
          {
            "BC320111": "202601",
            "BC320112": 0,
            "BC320113": 25,
            "BC320114": 25,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 25,
            "BC320115": 0
          },
          {
            "BC320111": "202512",
            "BC320112": 0,
            "BC320113": 55,
            "BC320114": 55,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 55,
            "BC320115": 0
          },
          {
            "BC320111": "202511",
            "BC320112": 4,
            "BC320113": 55,
            "BC320114": 55,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 59,
            "BC320115": 0
          },
          {
            "BC320111": "202510",
            "BC320112": 4,
            "BC320113": 55,
            "BC320114": 55,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 59,
            "BC320115": 0
          }
        ]
      },
      "BC3202": {
        "BC32021": [
          {
            "TTC01": "01833001",
            "TTC02": "Công ty Tài chính tín dụng tiêu dùng TNHH MB Shinsei",
            "BC320211": "202511",
            "BC320212": 4
          },
          {
            "TTC01": "01833001",
            "TTC02": "Công ty Tài chính tín dụng tiêu dùng TNHH MB Shinsei",
            "BC320211": "202510",
            "BC320212": 4
          }
        ]
      },
      "BC3203": {
        "BC32031": [],
        "TL000": "CIC không có thông tin lịch sử nợ xấu tín dụng của khách hàng trong 05 năm gần nhất."
      },
      "BC3204": {
        "BC32041": [],
        "TL000": "CIC không có thông tin lịch sử chậm thanh toán thẻ tín dụng của khách hàng trong 05 năm gần nhất."
      },
      "BC3206": {
        "BC32061": [],
        "TL000": "CIC không có thông tin lịch sử nợ quá hạn tại TCTN của khách hàng trong 05 năm gần nhất."
      }
    }
  },
  "BC400": {
    "BC420": {
      "BC4201": [
        {
          "TTC01": "01833001",
          "TTC02": "Công ty Tài chính tín dụng tiêu dùng TNHH MB Shinsei",
          "BC42011": [
            {
              "BC420111": "1000724110011221",
              "BC420112": "20251212",
              "BC420115": 0,
              "BC420116": 0,
              "BC420117": "VND",
              "BC420118": "02",
              "BC420119": "970",
              "BC420120": "",
              "BC420121": "02",
              "BC420122": "01",
              "BC420123": "11",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 4,
              "BC420128": 60,
              "BC420130": 60,
              "BC420131": "02",
              "BC420132": "20251130",
              "BC420133": 4,
              "BC420134": []
            }
          ]
        }
      ]
    },
    "BC430": {
      "BC4301": [
        {
          "TTC01": "01348005",
          "TTC02": "Ngân hàng TMCP Sài Gòn- Hà Nội - Chi nhánh Vạn Phúc",
          "BC43011": [
            {
              "BC430111": "XXXX141",
              "BC430112": "20260821",
              "BC430113": 25,
              "BC430114": 2,
              "BC430115": 1,
              "BC430116": 0,
              "BC430117": 0,
              "BC430118": 0,
              "BC430119": 0,
              "BC430120": "01"
            }
          ]
        }
      ]
    },
    "BC450": {
      "TL000": "CIC không có thông tin về hợp đồng cam kết ngoại bảng của khách hàng."
    },
    "BC460": {
      "TL000": "CIC không có thông tin về hợp đồng cấp tín dụng từ nguồn vốn ủy thác TCTD không chịu rủi ro (không bao gồm khoản nhận ủy thác từ TCTD khác) của khách hàng."
    },
    "BC470": {
      "TL000": "CIC không có thông tin chi tiết hợp đồng vay tại TCTN của khách hàng."
    },
    "BC480": {
      "TL000": "CIC không có thông tin chi tiết hợp đồng cam kết ngoại bảng tại TCTN của khách hàng."
    },
    "BC490": {
      "TL000": "CIC không có thông tin chi tiết hợp đồng cấp tín dụng từ nguồn vốn ủy thác TCTN không chịu rủi ro (không bao gồm khoản nhận ủy thác từ TCTN khác) của khách hàng."
    }
  },
  "BC500": {
    "BC510": [
      {
        "TTC01": "04208001",
        "TTC02": "Ngân hàng Phát triển Việt Nam - Phòng giao dịch Cao Bằng",
        "BC5101": "20220331",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      },
      {
        "TTC01": "24208001",
        "TTC02": "Ngân hàng Phát triển Việt Nam - Chi nhánh Khu vực Bắc Đông Bắc",
        "BC5101": "20250630",
        "BC5102": [],
        "BC5103": [
          {
            "BC51031": ""
          }
        ],
        "BC5104": [],
        "BC5105": []
      }
    ]
  },
  "BC600": [
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261012 18:08:23.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261012 17:47:49.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261012 16:30:45.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261012 16:29:23.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261012 15:33:07.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261012 15:29:37.000"
    },
    {
      "TTC01": "311",
      "TTC02": "Ngân hàng Thương mại cổ phần Quân Đội",
      "BC610": "credit",
      "BC620": "20261012 14:45:52.000"
    },
    {
      "TTC01": "01202001",
      "TTC02": "NH TMCP BIDV - CN Hoàn Kiếm",
      "BC610": "Hỗ trợ đơn vị và cá nhân trong việc thẩm định, xem xét phê duyệt tín dụng",
      "BC620": "20261010 08:27:27.000"
    },
    {
      "TTC01": "632",
      "TTC02": "Ngân hàng FAR EAST NATIONAL BANK - CN TP Hồ Chí Minh",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 18:29:41.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261008 15:38:33.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261008 15:29:56.000"
    },
    {
      "TTC01": "632",
      "TTC02": "Ngân hàng FAR EAST NATIONAL BANK - CN TP Hồ Chí Minh",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 14:36:10.000"
    },
    {
      "TTC01": "632",
      "TTC02": "Ngân hàng FAR EAST NATIONAL BANK - CN TP Hồ Chí Minh",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 14:22:14.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 14:13:29.000"
    },
    {
      "TTC01": "632",
      "TTC02": "Ngân hàng FAR EAST NATIONAL BANK - CN TP Hồ Chí Minh",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 10:58:58.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 09:55:38.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 09:42:30.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261008 09:20:48.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261008 08:34:35.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261008 08:31:18.000"
    },
    {
      "TTC01": "632",
      "TTC02": "Ngân hàng FAR EAST NATIONAL BANK - CN TP Hồ Chí Minh",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261007 11:15:39.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261007 09:22:29.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261007 09:20:33.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261006 17:29:11.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Phê duyệt cấp tín dụng",
      "BC620": "20261006 17:22:01.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261006 11:20:38.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261006 11:15:21.000"
    },
    {
      "TTC01": "01604001",
      "TTC02": "Ngân hàng TNHH MTV Standard Chartered Việt Nam - Sở Giao dịch",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20261006 09:56:06.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Lý do 1",
      "BC620": "20261001 17:44:30.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Vấn tin cic khách hàng",
      "BC620": "20260930 10:25:07.000"
    },
    {
      "TTC01": "01201001",
      "TTC02": "NH TMCP Vietcombank - CN Hà Nội",
      "BC610": "Vấn tin cic khách hàng",
      "BC620": "20260930 10:19:08.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260925 17:26:33.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260925 17:09:20.000"
    },
    {
      "TTC01": "01505001",
      "TTC02": "Ngân hàng Liên doanh Việt - Nga",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260924 11:08:01.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260924 11:07:17.000"
    },
    {
      "TTC01": "01505001",
      "TTC02": "Ngân hàng Liên doanh Việt - Nga",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260924 10:46:39.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260924 10:33:29.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260924 09:56:45.000"
    },
    {
      "TTC01": "79307001",
      "TTC02": "Ngân hàng TMCP Á Châu ",
      "BC610": "1: Phê duyệt cấp tín dụng",
      "BC620": "20260924 09:45:06.000"
    },
    {
      "TTC01": "01309001",
      "TTC02": "Ngân hàng TMCP Việt Nam Thịnh Vượng",
      "BC620": "20260417 18:07:46.000"
    },
    {
      "TTC01": "01302001",
      "TTC02": "Ngân hàng TMCP Hàng hải Việt Nam",
      "BC620": "20260318 10:32:47.000"
    },
    {
      "TTC01": "01309001",
      "TTC02": "Ngân hàng TMCP Việt Nam Thịnh Vượng",
      "BC620": "20260303 19:57:28.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260212 10:04:34.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260210 11:12:08.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260206 13:49:43.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260204 17:34:50.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260204 16:58:33.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260129 17:49:20.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260129 17:18:39.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260128 10:08:55.000"
    },
    {
      "TTC01": "94356001",
      "TTC02": "Ngân hàng TMCP Việt Nam Thương Tín",
      "BC620": "20260122 15:16:52.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 16:34:52.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 16:34:51.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 16:34:50.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 16:34:49.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 10:00:39.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 09:59:48.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 09:59:06.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260116 09:49:56.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260115 16:20:47.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260114 14:41:38.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260113 11:17:36.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20260108 09:16:50.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251226 18:21:53.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251226 18:07:07.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251226 17:53:07.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251226 17:38:14.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251225 14:39:13.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251225 11:18:21.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251219 17:25:13.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251219 17:08:03.000"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam - Chi nhánh Sở Giao dịch 1",
      "BC620": "20251219 16:53:20.000"
    }
  ]
};
}

function getS11TReportVT(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return {
  "MASOPHIEU": maPhieu,
  "TL001": "S11T",
  "TL002": "2026/S11T",
  "TL003": "Ngân hàng TMCP ABC - CN Hà Nội - Nguyễn Văn An (user: annv) - 0243xxxxxxx",
  "TL004": "Số 10 Phố Huế, Quận Hai Bà Trưng, Hà Nội",
  "TL005": "Nguyễn Văn An",
  "TL006": "annv",
  "TL007": "20261011 10:20:05.321",
  "TL008": "20261011 10:20:08.904",
  "CCCD_HOCHIEU": "001185012345",
  "TENKH": "NGUYỄN THỊ LAN",
  "TL099": "OUT_06: Có duy nhất một mã CIC có thông tin",
  "TL100": "",
  "BC100": {
    "BC110": {
      "TTC04": "NGUYỄN THỊ LAN",
      "MACIC": "2098765432",
      "BC1109": "0",
      "BC1110": "19850620",
      "BC1111": "0912345678;0987654321",
      "BC1112": 1,
      "BC1113": "190",
      "BC1114": "001185012345",
      "BC1115": true,
      "BC1116": "",
      "BC1117": "Trần Văn Hùng",
      "BC1118": "001083054321"
    },
    "BC120": [
      "Số 12 Ngõ 45 Phố Chùa Bộc, Phường Trung Liệt, Quận Đống Đa, Hà Nội",
      "Căn hộ 1205, Tòa A2, Chung cư Hà Thành, Quận Cầu Giấy, Hà Nội"
    ]
  },
  "BC200": {
    "BC220": {
      "BC2201": 612,
      "BC2202": 8,
      "BC2203": "20260915",
      "BC2204": 78
    },
    "TL000": ""
  },
  "BC300": {
    "BC310": {
      "BC3101": {
        "BC31011": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310111": "20260930",
            "BC310112": [
              {
                "BC3101121": "03",
                "BC3101122": [
                  { "BC31011221": "01", "BC31011222": 1800000000, "BC31011223": 0 }
                ]
              },
              {
                "BC3101121": "02",
                "BC3101122": [
                  { "BC31011221": "01", "BC31011222": 450000000, "BC31011223": 0 },
                  { "BC31011221": "02", "BC31011222": 150000000, "BC31011223": 0 }
                ]
              }
            ]
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC310111": "20260930",
            "BC310112": [
              {
                "BC3101121": "01",
                "BC3101122": [
                  { "BC31011221": "01", "BC31011222": 120000000, "BC31011223": 0 }
                ]
              },
              {
                "BC3101121": "02",
                "BC3101122": [
                  { "BC31011221": "01", "BC31011222": 0, "BC31011223": 10000 }
                ]
              }
            ]
          },
          {
            "TTC01": "01203003",
            "TTC02": "Ngân hàng TMCP DEF - CN Cầu Giấy",
            "BC310111": "20260930",
            "BC310112": [
              {
                "BC3101121": "01",
                "BC3101122": [
                  { "BC31011221": "01", "BC31011222": 500000000, "BC31011223": 0 }
                ]
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3102": {
        "BC31021": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310211": [
              {
                "BC3102111": "1",
                "BC3102112": 3,
                "BC3102113": 150000000,
                "BC3102114": 45000000,
                "BC3102115": "01",
                "BC3102116": "20260930",
                "BC3102117": 8500000,
                "BC3102118": 0,
                "BC3102119": 0
              },
              {
                "BC3102111": "0",
                "BC3102112": 1,
                "BC3102113": 50000000,
                "BC3102114": 0,
                "BC3102115": "01",
                "BC3102116": "20260930",
                "BC3102117": 0,
                "BC3102118": 0,
                "BC3102119": 0
              }
            ]
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC310211": [
              {
                "BC3102111": "1",
                "BC3102112": 1,
                "BC3102113": 100000000,
                "BC3102114": 32000000,
                "BC3102115": "02",
                "BC3102116": "20260930",
                "BC3102117": 6200000,
                "BC3102118": 3,
                "BC3102119": 25
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3104": {
        "BC31041": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310411": 400000000,
            "BC310412": 0,
            "BC310413": "01",
            "BC310414": "20260930"
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC310411": 200000000,
            "BC310412": 0,
            "BC310413": "01",
            "BC310414": "20260930"
          }
        ],
        "TL000": ""
      },
      "BC3105": {
        "BC31051": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC310511": 220000000,
            "BC310512": 0,
            "BC310513": 0,
            "BC310514": "20260930"
          }
        ],
        "TL000": ""
      },
      "BC3106": {
        "BC31061": [
          {
            "TTC01": "01204004",
            "TTC02": "Ngân hàng TMCP GHI - CN Hà Nội",
            "BC310611": 180000000,
            "BC310612": 0,
            "BC310613": "20260331",
            "BC310614": 200,
            "BC310615": "00VAMC01",
            "BC310616": "Công ty Quản lý tài sản của các TCTD Việt Nam (VAMC)"
          }
        ],
        "TL000": ""
      },
      "BC3107": {
        "BC31071": [
          {
            "TTC01": "VDB00001",
            "TTC02": "Ngân hàng Phát triển Việt Nam - CN Hà Nội",
            "BC310711": [
              {
                "BC3107111": "V1",
                "BC3107112": "03",
                "BC3107113": 350000000,
                "BC3107114": 0,
                "BC3107115": "20260831"
              }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3110": {
        "BC31101": [
          {
            "TTC01": "TN000001",
            "TTC02": "Quỹ tín dụng nhân dân Đống Đa",
            "BC311011": 200000000,
            "BC311012": 0,
            "BC311013": 0,
            "BC311014": 0,
            "BC311015": 0,
            "BC311016": 0,
            "BC311017": "20260930",
            "BC311018": 15,
            "BC311019": "01"
          },
          {
            "TTC01": "TN000002",
            "TTC02": "Tổ chức tài chính vi mô Hà Thành",
            "BC311011": 0,
            "BC311012": 0,
            "BC311013": 0,
            "BC311014": 0,
            "BC311015": 100000000,
            "BC311016": 0,
            "BC311017": "20260930",
            "BC311018": 0,
            "BC311019": "01"
          },
          {
            "TTC01": "TN000003",
            "TTC02": "Quỹ tín dụng nhân dân Cầu Giấy",
            "BC311011": 0,
            "BC311012": 0,
            "BC311013": 50000000,
            "BC311014": 0,
            "BC311015": 0,
            "BC311016": 0,
            "BC311017": "20260930",
            "BC311018": 0,
            "BC311019": "01"
          }
        ],
        "TL000": ""
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          { "BC320111": "102025", "BC320112": 3050000000, "BC320113": 60000000, "BC320114": 200000000, "BC320116": 400000000, "BC320117": 750000000, "BC320118": 4260000000 },
          { "BC320111": "112025", "BC320112": 3080000000, "BC320113": 58000000, "BC320114": 200000000, "BC320116": 400000000, "BC320117": 750000000, "BC320118": 4288000000 },
          { "BC320111": "122025", "BC320112": 3100000000, "BC320113": 72000000, "BC320114": 200000000, "BC320116": 400000000, "BC320117": 750000000, "BC320118": 4322000000 },
          { "BC320111": "012026", "BC320112": 3120000000, "BC320113": 90000000, "BC320114": 250000000, "BC320116": 500000000, "BC320117": 750000000, "BC320118": 4460000000 },
          { "BC320111": "022026", "BC320112": 3150000000, "BC320113": 65000000, "BC320114": 250000000, "BC320116": 500000000, "BC320117": 750000000, "BC320118": 4465000000 },
          { "BC320111": "032026", "BC320112": 3180000000, "BC320113": 70000000, "BC320114": 250000000, "BC320116": 500000000, "BC320117": 750000000, "BC320118": 4500000000 },
          { "BC320111": "042026", "BC320112": 3200000000, "BC320113": 66000000, "BC320114": 250000000, "BC320116": 600000000, "BC320117": 750000000, "BC320118": 4616000000 },
          { "BC320111": "052026", "BC320112": 3230000000, "BC320113": 72000000, "BC320114": 250000000, "BC320116": 600000000, "BC320117": 750000000, "BC320118": 4652000000 },
          { "BC320111": "062026", "BC320112": 3250000000, "BC320113": 80000000, "BC320114": 250000000, "BC320116": 600000000, "BC320117": 750000000, "BC320118": 4680000000 },
          { "BC320111": "072026", "BC320112": 3260000000, "BC320113": 75000000, "BC320114": 250000000, "BC320116": 600000000, "BC320117": 750000000, "BC320118": 4685000000 },
          { "BC320111": "082026", "BC320112": 3270000000, "BC320113": 68000000, "BC320114": 250000000, "BC320116": 600000000, "BC320117": 750000000, "BC320118": 4688000000 },
          { "BC320111": "092026", "BC320112": 3280000000, "BC320113": 77000000, "BC320114": 250000000, "BC320116": 600000000, "BC320117": 750000000, "BC320118": 4707000000 }
        ],
        "TL000": ""
      },
      "BC3202": {
        "BC32021": [
          { "TTC01": "01201001", "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội", "BC320211": "082026", "BC320212": 150000000 },
          { "TTC01": "01201001", "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội", "BC320211": "092026", "BC320212": 150000000 },
          { "TTC01": "01202002", "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long", "BC320211": "072026", "BC320212": 32000000 },
          { "TTC01": "01202002", "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long", "BC320211": "082026", "BC320212": 32000000 },
          { "TTC01": "01202002", "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long", "BC320211": "092026", "BC320212": 32000000 }
        ],
        "TL000": ""
      },
      "BC3203": {
        "BC32031": [
          {
            "TTC01": "01204004",
            "TTC02": "Ngân hàng TMCP GHI - CN Hà Nội",
            "BC320311": [
              { "BC3203111": "20240215", "BC3203112": "03", "BC3203113": 180000000, "BC3203114": 0 }
            ]
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC320311": [
              { "BC3203111": "20220810", "BC3203112": "03", "BC3203113": 90000000, "BC3203114": 0 }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3204": {
        "BC32041": [
          {
            "TTC01": "01201001",
            "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
            "BC320411": [
              { "BC3204111": "20250910", "BC3204112": "02", "BC3204113": 5, "BC3204114": 33 },
              { "BC3204111": "20250310", "BC3204112": "01", "BC3204113": 0, "BC3204114": 12 }
            ]
          },
          {
            "TTC01": "01202002",
            "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
            "BC320411": [
              { "BC3204111": "20260915", "BC3204112": "02", "BC3204113": 3, "BC3204114": 25 },
              { "BC3204111": "20260215", "BC3204112": "02", "BC3204113": 6, "BC3204114": 52 }
            ]
          }
        ],
        "TL000": ""
      },
      "BC3206": {
        "BC32061": [
          { "TTC01": "TN000001", "TTC02": "Quỹ tín dụng nhân dân Đống Đa", "BC320611": 15, "BC320612": "01", "BC320613": 10000000 },
          { "TTC01": "TN000002", "TTC02": "Tổ chức tài chính vi mô Hà Thành", "BC320611": 0, "BC320612": "01", "BC320613": 0 },
          { "TTC01": "TN000003", "TTC02": "Quỹ tín dụng nhân dân Cầu Giấy", "BC320611": 0, "BC320612": "01", "BC320613": 0 }
        ],
        "TL000": ""
      }
    }
  },
  "BC400": {
    "BC420": {
      "BC4201": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC42011": [
            {
              "BC420111": "HDTD-2022/ABC-0412",
              "BC420112": "20260930",
              "BC420113": "20220801",
              "BC420114": "20420801",
              "BC420115": 2000000000,
              "BC420116": 1800000000,
              "BC420117": "00",
              "BC420118": "01",
              "BC420119": "981",
              "BC420120": "1B212",
              "BC420121": "03",
              "BC420122": "01",
              "BC420123": "11",
              "BC420124": "",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 0,
              "BC420128": 0,
              "BC420129": 0,
              "BC420130": 0,
              "BC420131": "01",
              "BC420132": "20260930",
              "BC420133": 1800000000,
              "BC420134": [
                {
                  "BC4201341": "Trần Văn Hùng",
                  "BC4201342": "001083054321",
                  "BC4201343": 1
                }
              ]
            },
            {
              "BC420111": "HDTD-2024/ABC-1187",
              "BC420112": "20260930",
              "BC420113": "20240310",
              "BC420114": "20270310",
              "BC420115": 200000000,
              "BC420116": 150000000,
              "BC420117": "00",
              "BC420118": "02",
              "BC420119": "981",
              "BC420120": "204",
              "BC420121": "02",
              "BC420122": "01",
              "BC420123": "11",
              "BC420124": "",
              "BC420125": 1,
              "BC420126": true,
              "BC420127": 20000000,
              "BC420128": 40,
              "BC420129": 2000000,
              "BC420130": 40,
              "BC420131": "02",
              "BC420132": "20260930",
              "BC420133": 150000000,
              "BC420134": []
            },
            {
              "BC420111": "HDTD-2025/ABC-0733",
              "BC420112": "20260930",
              "BC420113": "20250215",
              "BC420114": "20300215",
              "BC420115": 700000000,
              "BC420116": 450000000,
              "BC420117": "00",
              "BC420118": "01",
              "BC420119": "981",
              "BC420120": "201",
              "BC420121": "02",
              "BC420122": "01",
              "BC420123": "11",
              "BC420124": "",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 0,
              "BC420128": 0,
              "BC420129": 0,
              "BC420130": 0,
              "BC420131": "01",
              "BC420132": "20260930",
              "BC420133": 450000000,
              "BC420134": [
                {
                  "BC4201341": "Trần Văn Hùng",
                  "BC4201342": "001083054321",
                  "BC4201343": 1
                }
              ]
            }
          ]
        },
        {
          "TTC01": "01202002",
          "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
          "BC42011": [
            {
              "BC420111": "XYZ/TD/2025/09871",
              "BC420112": "20260930",
              "BC420113": "20250601",
              "BC420114": "20270601",
              "BC420115": 300000000,
              "BC420116": 120000000,
              "BC420117": "00",
              "BC420118": "01",
              "BC420119": "981",
              "BC420120": "205",
              "BC420121": "01",
              "BC420122": "01",
              "BC420123": "16",
              "BC420124": "",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 0,
              "BC420128": 0,
              "BC420129": 0,
              "BC420130": 0,
              "BC420131": "01",
              "BC420132": "20260930",
              "BC420133": 120000000,
              "BC420134": []
            },
            {
              "BC420111": "XYZ/TD/2025/10452",
              "BC420112": "20260930",
              "BC420113": "20250901",
              "BC420114": "20290901",
              "BC420115": 300000000,
              "BC420116": 260000000,
              "BC420117": "37",
              "BC420118": "01",
              "BC420119": "981",
              "BC420120": "202",
              "BC420121": "02",
              "BC420122": "01",
              "BC420123": "11",
              "BC420124": "",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 0,
              "BC420128": 0,
              "BC420129": 0,
              "BC420130": 0,
              "BC420131": "01",
              "BC420132": "20260930",
              "BC420133": 260000000,
              "BC420134": [
                {
                  "BC4201341": "Lê Thị Hoa",
                  "BC4201342": "001060098765",
                  "BC4201343": 2
                }
              ]
            }
          ]
        },
        {
          "TTC01": "01203003",
          "TTC02": "Ngân hàng TMCP DEF - CN Cầu Giấy",
          "BC42011": [
            {
              "BC420111": "DEF/CG/2026/00231",
              "BC420112": "20260930",
              "BC420113": "20260115",
              "BC420114": "20270115",
              "BC420115": 500000000,
              "BC420116": 500000000,
              "BC420117": "00",
              "BC420118": "01",
              "BC420119": "981",
              "BC420120": "204",
              "BC420121": "01",
              "BC420122": "01",
              "BC420123": "11",
              "BC420124": "",
              "BC420125": 0,
              "BC420126": false,
              "BC420127": 0,
              "BC420128": 0,
              "BC420129": 0,
              "BC420130": 0,
              "BC420131": "01",
              "BC420132": "20260930",
              "BC420133": 500000000,
              "BC420134": []
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC430": {
      "BC4301": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC43011": [
            {
              "BC430111": "THE-ABC-2023-0456",
              "BC430112": "20260930",
              "BC430113": 150000000,
              "BC430114": 1,
              "BC430115": 3,
              "BC430116": 9,
              "BC430117": 0,
              "BC430118": 0,
              "BC430119": 45000000,
              "BC430120": "01",
              "BC430121": 2,
              "BC430122": 5,
              "BC430123": 33
            },
            {
              "BC430111": "THE-ABC-2019-0087",
              "BC430112": "20260930",
              "BC430113": 50000000,
              "BC430114": 2,
              "BC430115": 1,
              "BC430116": 0,
              "BC430117": 0,
              "BC430118": 0,
              "BC430119": 0,
              "BC430120": "01",
              "BC430121": 0,
              "BC430122": 0,
              "BC430123": 0
            }
          ]
        },
        {
          "TTC01": "01202002",
          "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
          "BC43011": [
            {
              "BC430111": "XYZ-CARD-2024-7788",
              "BC430112": "20260930",
              "BC430113": 100000000,
              "BC430114": 2,
              "BC430115": 1,
              "BC430116": 6,
              "BC430117": 3,
              "BC430118": 25,
              "BC430119": 32000000,
              "BC430120": "02",
              "BC430121": 3,
              "BC430122": 6,
              "BC430123": 52
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC450": {
      "BC4501": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC45011": [
            {
              "BC450111": "CK-ABC-2026-0033",
              "BC450112": "20260930",
              "BC450113": "20260301",
              "BC450114": "20270301",
              "BC450115": 300000000,
              "BC450116": "00",
              "BC450117": "01",
              "BC450118": "02",
              "BC450119": "Cam kết cho vay không hủy ngang theo hợp đồng hạn mức tiêu dùng",
              "BC450120": "01",
              "BC450121": 300000000
            },
            {
              "BC450111": "BL-ABC-2026-0107",
              "BC450112": "20260930",
              "BC450113": "20260501",
              "BC450114": "20270501",
              "BC450115": 100000000,
              "BC450116": "00",
              "BC450117": "01",
              "BC450118": "016",
              "BC450119": "Bảo lãnh nghĩa vụ thuê nhà của khách hàng",
              "BC450120": "01",
              "BC450121": 100000000
            }
          ]
        },
        {
          "TTC01": "01202002",
          "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
          "BC45011": [
            {
              "BC450111": "BL-XYZ-2026-0215",
              "BC450112": "20260930",
              "BC450113": "20260401",
              "BC450114": "20270401",
              "BC450115": 200000000,
              "BC450116": "00",
              "BC450117": "01",
              "BC450118": "012",
              "BC450119": "Bảo lãnh thanh toán tiền mua hàng hóa",
              "BC450120": "01",
              "BC450121": 200000000
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC460": {
      "BC4601": [
        {
          "TTC01": "01201001",
          "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
          "BC46011": [
            {
              "BC460111": "UT-ABC-2025-0042",
              "BC460112": "20260930",
              "BC460113": "20250901",
              "BC460114": "20270901",
              "BC460115": 300000000,
              "BC460116": "Quỹ hỗ trợ nông dân thành phố Hà Nội",
              "BC460117": "0108888999",
              "BC460118": 220000000,
              "BC460119": "00",
              "BC460120": "011",
              "BC460121": "204",
              "BC460122": "02",
              "BC460123": "01",
              "BC460124": "11",
              "BC460125": 0,
              "BC460126": 0,
              "BC460127": 0,
              "BC460128": 0,
              "BC460129": 0,
              "BC460130": 0,
              "BC460131": 0,
              "BC460132": 0
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC470": {
      "BC4701": [
        {
          "TTC01": "TN000001",
          "TTC02": "Quỹ tín dụng nhân dân Đống Đa",
          "BC47011": [
            {
              "BC470111": "QTD-DD-2025-0231",
              "BC470112": "20260930",
              "BC470113": "20250701",
              "BC470114": "20270701",
              "BC470115": 200000000,
              "BC470116": 150000000,
              "BC470117": "00",
              "BC470119": "981",
              "BC470120": "204",
              "BC470121": "02",
              "BC470122": "01",
              "BC470123": "11",
              "BC470125": 0,
              "BC470126": false,
              "BC470127": 10000000,
              "BC470128": 15,
              "BC470129": 1000000,
              "BC470130": 15,
              "BC470131": 10000000,
              "BC470132": 15
            },
            {
              "BC470111": "QTD-DD-2026-0045",
              "BC470112": "20260930",
              "BC470113": "20260201",
              "BC470114": "20270201",
              "BC470115": 50000000,
              "BC470116": 50000000,
              "BC470117": "00",
              "BC470119": "981",
              "BC470120": "203",
              "BC470121": "01",
              "BC470122": "01",
              "BC470123": "11",
              "BC470125": 0,
              "BC470126": false,
              "BC470127": 0,
              "BC470128": 0,
              "BC470129": 0,
              "BC470130": 0,
              "BC470131": 0,
              "BC470132": 0
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC480": {
      "BC4801": [
        {
          "TTC01": "TN000003",
          "TTC02": "Quỹ tín dụng nhân dân Cầu Giấy",
          "BC48011": [
            {
              "BC480111": "QTD-CG-BL-2026-0009",
              "BC480112": "20260930",
              "BC480113": "20260601",
              "BC480114": "20270601",
              "BC480115": 50000000,
              "BC480116": "00",
              "BC480118": "012",
              "BC480119": "Bảo lãnh thanh toán tiền thuê mặt bằng",
              "BC480120": 50000000,
              "BC480121": 0
            }
          ]
        }
      ],
      "TL000": ""
    },
    "BC490": {
      "BC4901": [
        {
          "TTC01": "TN000002",
          "TTC02": "Tổ chức tài chính vi mô Hà Thành",
          "BC49011": [
            {
              "BC490111": "VM-HT-UT-2026-0018",
              "BC490112": "20260930",
              "BC490113": "20260301",
              "BC490114": "20270301",
              "BC490115": 150000000,
              "BC490116": "Hội Liên hiệp Phụ nữ quận Đống Đa",
              "BC490117": "0107777888",
              "BC490118": 100000000,
              "BC490119": "00",
              "BC490120": "981",
              "BC490121": "204",
              "BC490122": "01",
              "BC490123": "01",
              "BC490124": "11",
              "BC490125": 0,
              "BC490126": 0,
              "BC490127": 0,
              "BC490128": 0,
              "BC490129": 0,
              "BC490130": 0,
              "BC490131": 0,
              "BC490132": 0
            }
          ]
        }
      ],
      "TL000": ""
    }
  },
  "BC500": {
    "BC510": [
      {
        "TTC01": "01201001",
        "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
        "BC5101": "20260930",
        "BC5102": [],
        "BC5103": [
          { "BC51031": "HDTD-2024/ABC-1187" }
        ],
        "BC5104": [],
        "BC5105": [
          {
            "BC51051": "TSBD-2022-000381",
            "BC51052": "401",
            "BC51053": "20220801",
            "BC51054": "20420801",
            "BC51055": 3500000000,
            "BC51056": 3500,
            "BC51057": "Căn hộ 1205 tầng 12 tòa A2 chung cư Hà Thành, Cầu Giấy, Hà Nội; diện tích 85 m2; GCN số CH09876/2022",
            "BC51058": "HDTD-2022/ABC-0412",
            "BC51059": false,
            "BC51060": false,
            "BC51061": false,
            "BC51062": [
              { "BC510621": "Nguyễn Thị Lan", "BC510622": "001185012345" },
              { "BC510621": "Trần Văn Hùng", "BC510622": "001083054321" }
            ]
          },
          {
            "BC51051": "TSBD-2025-000219",
            "BC51052": "304",
            "BC51053": "20250215",
            "BC51054": "20300215",
            "BC51055": 900000000,
            "BC51056": 900,
            "BC51057": "Xe ô tô con 07 chỗ, biển số 30H-567.89, số khung RLHXXXXXXXX12345",
            "BC51058": "HDTD-2025/ABC-0733",
            "BC51059": false,
            "BC51060": false,
            "BC51061": false,
            "BC51062": [
              { "BC510621": "Nguyễn Thị Lan", "BC510622": "001185012345" }
            ]
          }
        ]
      },
      {
        "TTC01": "01202002",
        "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
        "BC5101": "20260930",
        "BC5102": [
          {
            "BC51021": "BL-XYZ-2025-0910",
            "BC51022": "806",
            "BC51023": "Bảo lãnh của bà Lê Thị Hoa (mẹ đẻ) cho nghĩa vụ trả nợ khoản vay du học",
            "BC51024": "XYZ/TD/2025/10452"
          }
        ],
        "BC5103": [],
        "BC5104": [
          { "BC51041": "XYZ/TD/2025/09871" }
        ],
        "BC5105": []
      },
      {
        "TTC01": "01203003",
        "TTC02": "Ngân hàng TMCP DEF - CN Cầu Giấy",
        "BC5101": "20260930",
        "BC5102": [],
        "BC5103": [],
        "BC5104": [],
        "BC5105": [
          {
            "BC51051": "DEF-TS-2026-0031",
            "BC51052": "201",
            "BC51053": "20260115",
            "BC51054": "20270115",
            "BC51055": 600000000,
            "BC51056": 600,
            "BC51057": "Sổ tiết kiệm kỳ hạn 12 tháng số STK-0123456789 tại Ngân hàng TMCP DEF",
            "BC51058": "DEF/CG/2026/00231",
            "BC51059": false,
            "BC51060": false,
            "BC51061": false,
            "BC51062": [
              { "BC510621": "Nguyễn Thị Lan", "BC510622": "001185012345" }
            ]
          }
        ]
      }
    ],
    "TL000": ""
  },
  "BC600": [
    {
      "TTC01": "01201001",
      "TTC02": "Ngân hàng TMCP ABC - CN Hà Nội",
      "BC610": "Thẩm định tín dụng/cấp tín dụng",
      "BC620": "20260915 14:32:10.456"
    },
    {
      "TTC01": "01202002",
      "TTC02": "Ngân hàng TMCP XYZ - CN Thăng Long",
      "BC610": "Theo dõi, kiểm tra sau cho vay",
      "BC620": "20260702 09:05:44.120"
    },
    {
      "TTC01": "01203003",
      "TTC02": "Ngân hàng TMCP DEF - CN Cầu Giấy",
      "BC610": "Thẩm định tín dụng/cấp tín dụng",
      "BC620": "20260110 16:47:03.901"
    }
  ],
  "BC700": {
    "BC710": "Khách hàng có 01 khoản nợ cần chú ý tại TCTD ABC và 01 thẻ tín dụng chậm thanh toán tại TCTD XYZ; không có thông tin khác."
  }
};
}
// -----------------------------------------------------------------------------
// 3. R10T: BÁO CÁO QUẢN TRỊ RỦI RO DOANH NGHIỆP (BC320 đầy đủ 12 tháng)
// -----------------------------------------------------------------------------
function getR10TReportVT(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return{
  "MASOPHIEU": maPhieu,
  "TL001": "R10T",
  "TL002": "2026/R10T.1",
  "TL003": "Ngân hàng TMCP Lộc Phát Việt Nam",
  "TL004": "Tòa nhà LienVietPostBank, Số 210 đường Trần Quang Khải, Phường Tràng Tiền, Quận Hoàn Kiếm, Thành phố Hà Nội, Việt Nam",
  "TL005": "Nguyễn Thành Trung",
  "TL006": "h357tunguat",
  "TL007": "20261012 21:12:29.108",
  "TL008": "20261012 21:12:29.977",
  "MSTHUE_DKKD": "0300000013",
  "TENKH": "Công ty TNHH 13",
  "TL099": "OUT_06: Có duy nhất 1 mã CIC có thông tin",
  "TL100": "0",
  "BC100": {
    "BC110": {
      "TTC04": "Công ty TNHH 13",
      "MACIC": "9900000146",
      "BC1104": "0300000013",
      "BC1105": ""
    },
    "BC120": [
      "Địa chỉ của khách hàng 13"
    ]
  },
  "BC200": {
    "BC210": [
      {
        "BC2101": "2025",
        "BC2102": "E",
        "BC2103": "N/A",
        "BC2104": "Không có thông tin: Doanh nghiệp thiếu thông tin để thực hiện việc đánh giá, xếp hạng tại CIC.",
        "BC2105": "20261012"
      },
      {
        "BC2101": "2024",
        "BC2102": "E",
        "BC2103": "N/A",
        "BC2104": "Không có thông tin: Doanh nghiệp thiếu thông tin để thực hiện việc đánh giá, xếp hạng tại CIC.",
        "BC2105": "20261012"
      }
    ]
  },
  "BC300": {
    "BC310": {
      "BC3103": {
        "BC31031": [],
        "TL000": "Hiện tại, CIC không có thông tin đầu tư trái phiếu doanh nghiệp của khách hàng."
      },
      "BC3104": {
        "BC31041": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản cam kết ngoại bảng của khách hàng."
      },
      "BC3106": {
        "BC31061": [],
        "TL000": "Hiện tại, CIC không có thông tin dư nợ đã bán cho các công ty mua bán nợ của khách hàng."
      },
      "BC3108": {
        "BC31081": [
          {
            "BC310811": "01",
            "BC310812": 5000,
            "BC310813": 2187860,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "02",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "03",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "33",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "04",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          }
        ]
      },
      "BC3109": {
        "BC31091": [
          {
            "TTC01": "01307003",
            "TTC02": "Ngân hàng TMCP Á Châu - Chi nhánh Đông Đô",
            "BC310911": "20240716"
          },
          {
            "TTC01": "01307006",
            "TTC02": "Ngân hàng TMCP Á Châu - Chi nhánh Hoàng Cầu",
            "BC310911": "20260821"
          },
          {
            "TTC01": "01311035",
            "TTC02": "Ngân hàng TMCP Quân Đội - Chi nhánh Đông Anh",
            "BC310911": "20260818"
          }
        ]
      },
      "BC3110": {
        "BC31101": [],
        "TL000": "Hiện tại, CIC không có thông tin TCTN khách hàng đang quan hệ."
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          {
            "BC320111": "202608",
            "BC320112": 60437,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 60437
          },
          {
            "BC320111": "202607",
            "BC320112": 60272,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 60272
          },
          {
            "BC320111": "202606",
            "BC320112": 69034,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 69034
          },
          {
            "BC320111": "202605",
            "BC320112": 69822,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 69822
          },
          {
            "BC320111": "202604",
            "BC320112": 70109,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 70109
          },
          {
            "BC320111": "202603",
            "BC320112": 64890,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 64890
          },
          {
            "BC320111": "202602",
            "BC320112": 76403,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 76403
          },
          {
            "BC320111": "202601",
            "BC320112": 74205,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 74205
          },
          {
            "BC320111": "202512",
            "BC320112": 70742,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 70742
          },
          {
            "BC320111": "202511",
            "BC320112": 77608,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 77608
          },
          {
            "BC320111": "202510",
            "BC320112": 82466,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 82466
          }
        ]
      },
      "BC3202": {
        "BC32021": [],
        "TL000": "CIC không có thông tin nợ cần chú ý của khách hàng trong vòng 12 tháng gần nhất."
      },
      "BC3203": {
        "BC32031": [],
        "TL000": "CIC không có thông tin lịch sử nợ xấu tín dụng của khách hàng trong 05 năm gần nhất."
      },
      "BC3205": {
        "TL000": "CIC không có thông tin lịch sử chậm thanh toán thẻ tín dụng của khách hàng trong 03 năm gần nhất."
      },
      "BC3206": {
        "BC32061": [],
        "TL000": "CIC không có thông tin lịch sử nợ quá hạn tại TCTN của khách hàng trong 03 năm gần nhất."
      }
    }
  },
  "BC500": {
    "BC520": {
      "BC5201": 1,
      "BC5202": 13,
      "BC5203": 3
    }
  }
};
}
function getR10TReport(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return {
  "MASOPHIEU": maPhieu,
  "TL001": "R10T",
  "TL002": "2026/R10T.1",
  "TL003": "Ngân hàng TMCP Lộc Phát Việt Nam",
  "TL004": "Tòa nhà LienVietPostBank, Số 210 đường Trần Quang Khải, Phường Tràng Tiền, Quận Hoàn Kiếm, Thành phố Hà Nội, Việt Nam",
  "TL005": "Nguyễn Thành Trung",
  "TL006": "h357tunguat",
  "TL007": "20261012 21:12:29.108",
  "TL008": "20261012 21:12:29.977",
  "MSTHUE_DKKD": "0300000013",
  "TENKH": "Công ty TNHH 13",
  "TL099": "OUT_06: Có duy nhất 1 mã CIC có thông tin",
  "TL100": "0",
  "BC100": {
    "BC110": {
      "TTC04": "Công ty TNHH 13",
      "MACIC": "9900000146",
      "BC1104": "0300000013",
      "BC1105": ""
    },
    "BC120": [
      "Địa chỉ của khách hàng 13"
    ]
  },
  "BC200": {
    "BC210": [
      {
        "BC2101": "2025",
        "BC2102": "E",
        "BC2103": "N/A",
        "BC2104": "Không có thông tin: Doanh nghiệp thiếu thông tin để thực hiện việc đánh giá, xếp hạng tại CIC.",
        "BC2105": "20261012"
      },
      {
        "BC2101": "2024",
        "BC2102": "E",
        "BC2103": "N/A",
        "BC2104": "Không có thông tin: Doanh nghiệp thiếu thông tin để thực hiện việc đánh giá, xếp hạng tại CIC.",
        "BC2105": "20261012"
      }
    ]
  },
  "BC300": {
    "BC310": {
      "BC3103": {
        "BC31031": [],
        "TL000": "Hiện tại, CIC không có thông tin đầu tư trái phiếu doanh nghiệp của khách hàng."
      },
      "BC3104": {
        "BC31041": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản cam kết ngoại bảng của khách hàng."
      },
      "BC3106": {
        "BC31061": [],
        "TL000": "Hiện tại, CIC không có thông tin dư nợ đã bán cho các công ty mua bán nợ của khách hàng."
      },
      "BC3108": {
        "BC31081": [
          {
            "BC310811": "01",
            "BC310812": 5000,
            "BC310813": 2187860,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "02",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "03",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "33",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "04",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          }
        ]
      },
      "BC3109": {
        "BC31091": [
          {
            "TTC01": "01307003",
            "TTC02": "Ngân hàng TMCP Á Châu - Chi nhánh Đông Đô",
            "BC310911": "20240716"
          },
          {
            "TTC01": "01307006",
            "TTC02": "Ngân hàng TMCP Á Châu - Chi nhánh Hoàng Cầu",
            "BC310911": "20260821"
          },
          {
            "TTC01": "01311035",
            "TTC02": "Ngân hàng TMCP Quân Đội - Chi nhánh Đông Anh",
            "BC310911": "20260818"
          }
        ]
      },
      "BC3110": {
        "BC31101": [],
        "TL000": "Hiện tại, CIC không có thông tin TCTN khách hàng đang quan hệ."
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          {
            "BC320111": "202608",
            "BC320112": 60437,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 60437
          },
          {
            "BC320111": "202607",
            "BC320112": 60272,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 60272
          },
          {
            "BC320111": "202606",
            "BC320112": 69034,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 69034
          },
          {
            "BC320111": "202605",
            "BC320112": 69822,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 69822
          },
          {
            "BC320111": "202604",
            "BC320112": 70109,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 70109
          },
          {
            "BC320111": "202603",
            "BC320112": 64890,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 64890
          },
          {
            "BC320111": "202602",
            "BC320112": 76403,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 76403
          },
          {
            "BC320111": "202601",
            "BC320112": 74205,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 74205
          },
          {
            "BC320111": "202512",
            "BC320112": 70742,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 70742
          },
          {
            "BC320111": "202511",
            "BC320112": 77608,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 77608
          },
          {
            "BC320111": "202510",
            "BC320112": 82466,
            "BC320113": 0,
            "BC320114": 0,
            "BC320115": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 82466
          }
        ]
      },
      "BC3202": {
        "BC32021": [],
        "TL000": "CIC không có thông tin nợ cần chú ý của khách hàng trong vòng 12 tháng gần nhất."
      },
      "BC3203": {
        "BC32031": [],
        "TL000": "CIC không có thông tin lịch sử nợ xấu tín dụng của khách hàng trong 05 năm gần nhất."
      },
      "BC3205": {
        "TL000": "CIC không có thông tin lịch sử chậm thanh toán thẻ tín dụng của khách hàng trong 03 năm gần nhất."
      },
      "BC3206": {
        "BC32061": [],
        "TL000": "CIC không có thông tin lịch sử nợ quá hạn tại TCTN của khách hàng trong 03 năm gần nhất."
      }
    }
  },
  "BC500": {
    "BC520": {
      "BC5201": 1,
      "BC5202": 13,
      "BC5203": 3
    }
  }
};
}
// -----------------------------------------------------------------------------
// 4. R11T: BÁO CÁO QUẢN TRỊ RỦI RO CÁ NHÂN (BC320 đầy đủ 12 tháng & nhiều TCTD)
// -----------------------------------------------------------------------------
function getR11TReportVT(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return{
  "MASOPHIEU": maPhieu,
  "TL001": "R11T",
  "TL002": "2026/R11T.1",
  "TL003": "Ngân hàng TMCP Lộc Phát Việt Nam",
  "TL004": "Tòa nhà LienVietPostBank, Số 210 đường Trần Quang Khải, Phường Tràng Tiền, Quận Hoàn Kiếm, Thành phố Hà Nội, Việt Nam",
  "TL005": "Nguyễn Thành Trung",
  "TL006": "h357tunguat",
  "TL007": "20261012 21:17:38.564",
  "TL008": "20261012 21:17:39.137",
  "CCCD_HOCHIEU": "010000000284",
  "TENKH": "Nguyễn Văn 284",
  "TL099": "OUT_06: Có duy nhất 1 mã CIC có thông tin",
  "TL100": "0",
  "BC100": {
    "BC110": {
      "TTC04": "Nguyễn Văn 284",
      "MACIC": "9939000081",
      "BC1114": "010000000284",
      "BC1115": true,
      "BC1116": "Chứng minh thư: 251006221/Hộ chiếu: 010000000284"
    },
    "BC120": [
      "Địa chỉ của khách hàng 284"
    ]
  },
  "BC200": {
    "BC220": {
      "BC2201": 557,
      "BC2202": 6,
      "BC2203": "20210803",
      "BC2204": 13
    }
  },
  "BC300": {
    "BC310": {
      "BC3108": {
        "BC31081": [
          {
            "BC310811": "01",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "02",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "03",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "33",
            "BC310812": 7,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "04",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          }
        ]
      },
      "BC3109": {
        "BC31091": [
          {
            "TTC01": "79830001",
            "TTC02": "Công ty Tài chính TNHH MTV Home Credit Việt Nam",
            "BC310911": "20260820"
          }
        ]
      },
      "BC3106": {
        "BC31061": [],
        "TL000": "Hiện tại, CIC không có thông tin dư nợ đã bán cho các công ty mua bán nợ của khách hàng."
      },
      "BC3104": {
        "BC31041": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản cam kết ngoại bảng của khách hàng."
      },
      "BC3110": {
        "BC31101": [],
        "TL000": "Hiện tại, CIC không có thông tin TCTN khách hàng đang quan hệ."
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          {
            "BC320111": "202608",
            "BC320112": 0,
            "BC320113": 0,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 0
          },
          {
            "BC320111": "202607",
            "BC320112": 2,
            "BC320113": 8,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 10
          },
          {
            "BC320111": "202606",
            "BC320112": 5,
            "BC320113": 7,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 12
          },
          {
            "BC320111": "202605",
            "BC320112": 7,
            "BC320113": 8,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 15
          },
          {
            "BC320111": "202604",
            "BC320112": 9,
            "BC320113": 10,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 19
          },
          {
            "BC320111": "202603",
            "BC320112": 11,
            "BC320113": 11,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 22
          },
          {
            "BC320111": "202602",
            "BC320112": 13,
            "BC320113": 12,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 25
          },
          {
            "BC320111": "202601",
            "BC320112": 15,
            "BC320113": 12,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 27
          },
          {
            "BC320111": "202512",
            "BC320112": 16,
            "BC320113": 18,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 34
          },
          {
            "BC320111": "202511",
            "BC320112": 18,
            "BC320113": 19,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 37
          },
          {
            "BC320111": "202510",
            "BC320112": 20,
            "BC320113": 20,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 40
          }
        ]
      },
      "BC3202": {
        "BC32021": [],
        "TL000": "CIC không có thông tin nợ cần chú ý của khách hàng trong vòng 12 tháng gần nhất."
      },
      "BC3203": {
        "BC32031": [],
        "TL000": "CIC không có thông tin lịch sử nợ xấu tín dụng của khách hàng trong 05 năm gần nhất."
      },
      "BC3205": {
        "BC32051": true,
        "BC32052": 4,
        "BC32053": 8
      },
      "BC3206": {
        "BC32061": [],
        "TL000": "CIC không có thông tin lịch sử nợ quá hạn tại TCTN của khách hàng trong 03 năm gần nhất."
      }
    }
  },
  "BC500": {
    "BC520": {
      "BC5201": 1,
      "BC5202": 0,
      "BC5203": 1
    }
  }
};
}


function getR11TReport(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return{
  "MASOPHIEU": maPhieu,
  "TL001": "R11T",
  "TL002": "2026/R11T.1",
  "TL003": "Ngân hàng TMCP Lộc Phát Việt Nam",
  "TL004": "Tòa nhà LienVietPostBank, Số 210 đường Trần Quang Khải, Phường Tràng Tiền, Quận Hoàn Kiếm, Thành phố Hà Nội, Việt Nam",
  "TL005": "Nguyễn Thành Trung",
  "TL006": "h357tunguat",
  "TL007": "20261012 21:17:38.564",
  "TL008": "20261012 21:17:39.137",
  "CCCD_HOCHIEU": "010000000284",
  "TENKH": "Nguyễn Văn 284",
  "TL099": "OUT_06: Có duy nhất 1 mã CIC có thông tin",
  "TL100": "0",
  "BC100": {
    "BC110": {
      "TTC04": "Nguyễn Văn 284",
      "MACIC": "9939000081",
      "BC1114": "010000000284",
      "BC1115": true,
      "BC1116": "Chứng minh thư: 251006221/Hộ chiếu: 010000000284"
    },
    "BC120": [
      "Địa chỉ của khách hàng 284"
    ]
  },
 "BC200": {
    "TL000": "Hiện tại, CIC không đủ thông tin để chấm điểm tín dụng của khách hàng."
  },
  "BC300": {
    "BC310": {
      "BC3108": {
        "BC31081": [
          {
            "BC310811": "01",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "02",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "03",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "33",
            "BC310812": 7,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          },
          {
            "BC310811": "04",
            "BC310812": 0,
            "BC310813": 0,
            "BC310814": 0,
            "BC310815": 0,
            "BC310816": 0,
            "BC310817": 0,
            "BC310818": 0,
            "BC310819": 0,
            "BC310820": 0,
            "BC310821": 0,
            "BC310822": 0,
            "BC310823": 0,
            "BC310824": 0,
            "BC310825": 0
          }
        ]
      },
      "BC3109": {
        "BC31091": [
          {
            "TTC01": "79830001",
            "TTC02": "Công ty Tài chính TNHH MTV Home Credit Việt Nam",
            "BC310911": "20260820"
          }
        ]
      },
      "BC3106": {
        "BC31061": [],
        "TL000": "Hiện tại, CIC không có thông tin dư nợ đã bán cho các công ty mua bán nợ của khách hàng."
      },
      "BC3104": {
        "BC31041": [],
        "TL000": "Hiện tại, CIC không có thông tin các khoản cam kết ngoại bảng của khách hàng."
      },
      "BC3110": {
        "BC31101": [],
        "TL000": "Hiện tại, CIC không có thông tin TCTN khách hàng đang quan hệ."
      }
    },
    "BC320": {
      "BC3201": {
        "BC32011": [
          {
            "BC320111": "202608",
            "BC320112": 0,
            "BC320113": 0,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 0
          },
          {
            "BC320111": "202607",
            "BC320112": 2,
            "BC320113": 8,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 10
          },
          {
            "BC320111": "202606",
            "BC320112": 5,
            "BC320113": 7,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 12
          },
          {
            "BC320111": "202605",
            "BC320112": 7,
            "BC320113": 8,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 15
          },
          {
            "BC320111": "202604",
            "BC320112": 9,
            "BC320113": 10,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 19
          },
          {
            "BC320111": "202603",
            "BC320112": 11,
            "BC320113": 11,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 22
          },
          {
            "BC320111": "202602",
            "BC320112": 13,
            "BC320113": 12,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 25
          },
          {
            "BC320111": "202601",
            "BC320112": 15,
            "BC320113": 12,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 27
          },
          {
            "BC320111": "202512",
            "BC320112": 16,
            "BC320113": 18,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 34
          },
          {
            "BC320111": "202511",
            "BC320112": 18,
            "BC320113": 19,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 37
          },
          {
            "BC320111": "202510",
            "BC320112": 20,
            "BC320113": 20,
            "BC320114": 0,
            "BC320116": 0,
            "BC320117": 0,
            "BC320118": 40
          }
        ]
      },
      "BC3202": {
        "BC32021": [],
        "TL000": "CIC không có thông tin nợ cần chú ý của khách hàng trong vòng 12 tháng gần nhất."
      },
      "BC3203": {
        "BC32031": [],
        "TL000": "CIC không có thông tin lịch sử nợ xấu tín dụng của khách hàng trong 05 năm gần nhất."
      },
      "BC3205": {
        "BC32051": true,
        "BC32052": 4,
        "BC32053": 8
      },
      "BC3206": {
        "BC32061": [],
        "TL000": "CIC không có thông tin lịch sử nợ quá hạn tại TCTN của khách hàng trong 03 năm gần nhất."
      }
    }
  },
  "BC500": {
    "BC520": {
      "BC5201": 1,
      "BC5202": 0,
      "BC5203": 1
    }
  }
};
}

// -----------------------------------------------------------------------------
// 5. B11T: BÁO CÁO THÔNG TIN TÍN DỤNG KHÁCH HÀNG CÁ NHÂN (Chuẩn schema B11T)
// -----------------------------------------------------------------------------
function getB11TReport(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return {
    ma_sophieu: maPhieu,
    tl001: "CN01",
    tl002: "PGD HOAN KIEM",
    tl003: "NV001",
    tl004: "NGUYEN VAN TAO",
    tl005: "NV002",
    tl006: rawDateTime,
    tl007: rawDateTime,
    tl008: rawDateTime,
    cccd: "001090012345",
    ten_kh: "NGUYỄN VĂN AN",
    tl099: "OUT_06: Có dữ liệu từ CIC",
    tl100: "Báo cáo Khách hàng cá nhân",
    bc100: {
      ttc04: "NGUYỄN VĂN AN",
      ma_cic: "9876543210",
      cn003: "Số 45 Phố Tràng Thi, Hoàn Kiếm, Hà Nội",
      cn008: "001090012345",
      cn100: true,
      cn101: "012345678",
    },
    bc200: {
      bc210: 500000000,
      bc220: 0,
      bc230: "0",
      bc240: 0,
      bc250: "0",
      bc260: 0,
      bc270: "0",
      bc280: 100000000,
      bc290: "0",
    },
  };
}
function getB11TReportVanTin(maPhieu) {
  const { rawDateTime } = getNowFormatted();
  return {
    ma_sophieu: maPhieu,
    tl001: "CN01",
    tl002: "PGD HOAN KIEM",
    tl003: "NV001",
    tl004: "NGUYEN VAN TAO",
    tl005: "NV002",
    tl006: rawDateTime,
    tl007: rawDateTime,
    tl008: rawDateTime,
    cccd: "001090012345",
    ten_kh: "NGUYỄN VĂN AN",
    tl099: "OUT_14: Có dữ liệu từ CIC",
    tl100: "Báo cáo Khách hàng cá nhân",
    bc100: {
      ttc04: "NGUYỄN VĂN AN",
      ma_cic: "9876543210",
      cn003: "Số 45 Phố Tràng Thi, Hoàn Kiếm, Hà Nội",
      cn008: "001090012345",
      cn100: true,
      cn101: "012345678",
    },
    bc200: {
      bc210: 50000000,   // Tổng dư nợ (50 triệu) -> #TONGDUNO#
      bc220: 2,          // Số TCTD đang quan hệ -> #TCTD_QH#
      bc230: "0",        // Dư nợ cần chú ý 12 tháng ("0": Không, "1": Có) -> #DUNO_CCY#
      bc240: 0,          // Số TCTD có dư nợ cần chú ý -> #TCTD_CCY#
      bc250: "0",        // Dư nợ xấu 36 tháng ("0": Không, "1": Có) -> #DUNO_XAU#
      bc260: 0,          // Số TCTD có dư nợ xấu -> #TCTD_XAU#
      bc270: "0",        // Chậm thanh toán thẻ 36 tháng ("0": Không, "1": Có) -> #NO_NHOM5#
      bc280: 10000000,   // (BỔ SUNG) Dư nợ thẻ/khác (10 triệu) -> #BC280#
      bc290: "0",        // (BỔ SUNG) Nợ khác/nhóm 5 ("0": Không, "1": Có) -> #BC290#
    },
  };
}

// Hàm routing phân loại sản phẩm theo MaSp hoặc MaPhieu
function getReportByProductAndPhieu(maPhieu, maSp) {
  const pCode = (
    maSp ||
    (maPhieu.includes("S10T")
      ? "S10T"
      : maPhieu.includes("S11T")
        ? "S11T"
        : maPhieu.includes("R10T")
          ? "R10T"
          : maPhieu.includes("R11T")
            ? "R11T"
            : "B11T")
  ).toUpperCase();

  if (pCode === "S10T") return getS10TReport(maPhieu);
  if (pCode === "S11T") return getS11TReport(maPhieu);
  if (pCode === "R10T") return getR10TReport(maPhieu);
  if (pCode === "R11T") return getR11TReport(maPhieu);
  return getB11TReport(maPhieu);
}

function getReportByProductAndPhieuVanTin(maPhieu, maSp) {
  const pCode = (
    maSp ||
    (maPhieu.includes("S10T")
      ? "S10T"
      : maPhieu.includes("S11T")
        ? "S11T"
        : maPhieu.includes("R10T")
          ? "R10T"
          : maPhieu.includes("R11T")
            ? "R11T"
            : "B11T")
  ).toUpperCase();

  if (pCode === "S10T") return getS10TReportVT(maPhieu);
  if (pCode === "S11T") return getS11TReportVT(maPhieu);
  if (pCode === "R10T") return getR10TReportVT(maPhieu);
  if (pCode === "R11T") return getR11TReportVT(maPhieu);
  return getB11TReport(maPhieu);
}

// =============================================================================
// II. AUTHENTICATION & LOGIN APIS
// =============================================================================
const handleEsbAuth = (req, res) => {
  const mockJwt = "Bearer CIC_MOCK_JWT_TOKEN_" + Date.now();
  return res.status(200).json({
    issued_at: new Date().toISOString(),
    expired_time: new Date(Date.now() + 7200 * 1000).toISOString(),
    ttl: 7200,
    token_header: "Authorization",
    token_prefix: "Bearer ",
    token: mockJwt,
    Token_prefix: "Bearer ",
    Token: mockJwt,
  });
};
app.post("/gw/internal/esb-auth-service", handleEsbAuth);
app.post("/esb-auth-service", handleEsbAuth);
// =============================================================================
// V. CÁC API TLL (1. XÁC NHẬN TLL & 2. DANH SÁCH TLL)
// =============================================================================

// -----------------------------------------------------------------------------
// 1. API XÁC NHẬN TLL (Xác nhận đồng ý / từ chối nhận thông tin trả lời lại)
// -----------------------------------------------------------------------------
const handleXacNhanTLL = (req, res) => {
    const header = req.body?.header || {};
    const productCode = header.product_code || 'CIC_XACNHANTLL';
    const msgId = header.msg_id || 'msg-xacnhan-tll-' + Date.now();
    
    // Đọc thông tin phiếu và loại thao tác từ body
    const tllInfo = req.body?.body?.tll || {};
    const masoPhieu = tllInfo.maso_phieu || '';
    const loaiTT = tllInfo.loai_tt || '1'; // 1: Đồng ý nhận TLL | 2: Từ chối

    console.log(`\n================================================================`);
    console.log(`>>> [XÁC NHẬN TLL] Product: ${productCode}`);
    console.log(`    - Mã phiếu : ${masoPhieu}`);
    console.log(`    - Loại TT  : ${loaiTT === '1' ? '1 (Đồng ý nhận TLL)' : '2 (Từ chối)'}`);
    console.log(`================================================================`);

    // Trả về response chuẩn mã 00 (Thành công)
    return res.status(200).json({
        res_code: {
            error_code: "00",
            error_desc: "Thành công",
            ref_code: "00",
            ref_desc: "Xác nhận TLL thành công"
        },
        data: {
            header: {
                msg_id: msgId,
                service_id: "590001",
                product_code: productCode
            },
            payload: {
                tl099: `0: Xác nhận TLL thành công cho phiếu ${masoPhieu}`
            }
        }
    });
};

// Đăng ký các route cho Xác nhận TLL
app.post('/gw/internal/cic-query-service/api/v1/qa/xacnhantll', handleXacNhanTLL);
app.post('/cic-query-service/api/v1/qa/xacnhantll', handleXacNhanTLL);
app.post('/gw/internal/cic-query-service/api/v1/qa/b11t/xacnhantll', handleXacNhanTLL);
app.post('/cic-query-service/api/v1/qa/b11t/xacnhantll', handleXacNhanTLL);


// -----------------------------------------------------------------------------
// 2. API DANH SÁCH TLL (Kiểm tra trạng thái duyệt TLL theo danh sách phiếu)
// -----------------------------------------------------------------------------
const handleDanhSachTLL = (req, res) => {
    const header = req.body?.header || {};
    const productCode = header.product_code || 'CIC_DANHSACHTLL';
    const msgId = header.msg_id || 'msg-danhsach-tll-' + Date.now();
    
    // Đọc danh sách mã số phiếu cần kiểm tra
    const dsPhieu = req.body?.body?.tll?.ds_maso_phieu || [];

    console.log(`\n================================================================`);
    console.log(`>>> [DANH SÁCH TLL] Product: ${productCode}`);
    console.log(`    - DS Phiếu kiểm tra:`, dsPhieu);
    console.log(`================================================================`);

    // Trả về danh sách phiếu kèm TrangThai = "1" (Đã duyệt TLL -> Gateway sẽ kích hoạt Vấn Tin)
    const payloadItems = dsPhieu.map(phieuId => ({
        MASOPHIEU: phieuId,
        TrangThai: "1" // "1": Đã duyệt TLL thành công (hoặc "0": Chờ duyệt)
    }));

    return res.status(200).json({
        res_code: {
            error_code: "00",
            error_desc: "Thành công",
            ref_code: "00",
            ref_desc: "Thành công"
        },
        data: {
            header: {
                msg_id: msgId,
                service_id: "590001",
                product_code: productCode
            },
            payload: payloadItems
        }
    });
};

// Đăng ký các route cho Danh sách TLL
app.post('/gw/internal/cic-query-service/api/v1/qa/danhsachtll', handleDanhSachTLL);
app.post('/cic-query-service/api/v1/qa/danhsachtll', handleDanhSachTLL);
app.post('/gw/internal/cic-query-service/api/v1/qa/b11t/danhsachtll', handleDanhSachTLL);
app.post('/cic-query-service/api/v1/qa/b11t/danhsachtll', handleDanhSachTLL);
const handleAuthGeneral = (req, res) => {
  const token = "Bearer CIC_MOCK_TOKEN_" + Date.now();
  return res.status(200).json({
    IsSuccess: true,
    RequestId: req.body?.RequestId || "req-auth-id",
    Data: token,
    Token: token,
  });
};
app.post("/api/gateway/auth/LoginStateBank", handleAuthGeneral);
app.post("/api/gateway/auth/Login", handleAuthGeneral);

// =============================================================================
// III. CÁC API HỎI TIN (TRẢ VỀ OUT_06 KÈM DỮ LIỆU ĐẦY ĐỦ)
// =============================================================================

// 1. Hỏi tin B11T
const handleHoiTinB11T = (req, res) => {
  const msgId = req.body?.header?.msg_id || "msg-hoitin-b11t";
  const masoPhieu =
    req.body?.body?.hoitin_b11t?.maso_phieu || "MOCK_B11T_PHIEU_01";
  const reportData = getB11TReportVanTin(masoPhieu);

  console.log(
    `\n[HỎI TIN B11T] Phiếu: ${masoPhieu} -> Trả về HTTP [${TEST_CONFIG.HTTP_STATUS}] | Mã [${TEST_CONFIG.OUT_CODE}]`,
  );

  return res.status(TEST_CONFIG.HTTP_STATUS).json({
    res_code: {
      error_code: "0",
      error_message: TEST_CONFIG.MESSAGE,
      ref_code: TEST_CONFIG.OUT_CODE,
      ref_desc: TEST_CONFIG.TL099_FULL,
    },
    data: {
      header: {
        msg_id: msgId,
        service_id: "590001",
        product_code: "CIC_HOITIN_B11T",
      },
      payload: {
        ph_hoitin_b11t: {
          data: reportData,
        }
      },
    },
  });
};

const handleHoiTin = (req, res) => {
    try {
        const reqHeader = req.body?.header || {};
        const reqBody = req.body?.body?.hoi_tin || {};
        const ttChung = reqBody?.tt_chung || {};
        const dsKhachHang = reqBody?.ds_khach_hang?.dong || [];
        const msgId = reqHeader.msg_id || (typeof uuidv4 !== 'undefined' ? uuidv4() : 'MSG_' + Date.now());
        const serviceId = reqHeader.service_id || '590001';
        const productCode = reqHeader.product_code || 'CIC_HOITIN';

        console.log(`\n======================================================`);
        console.log(`-> [HoiTin] Nhận ${dsKhachHang.length} phiếu. Loại SP: ${ttChung.loai_sp || 'N/A'}`);

        // 1. KIỂM TRA NẾU CÓ KHÁCH HÀNG MUỐN TEST TIMEOUT (Tên chứa 'TIMEOUT' hoặc CMND '000')
        const hasTimeout = dsKhachHang.some(kh => 
            (kh.ten_kh && kh.ten_kh.toUpperCase().includes('TIMEOUT')) || 
            (kh.so_cmt && kh.so_cmt.startsWith('000'))
        );
        if (hasTimeout) {
            console.log('==> [TEST AUTO] Phát hiện yêu cầu TIMEOUT -> Treo kết nối 60s');
            return setTimeout(() => {
                res.status(504).send("The upstream server is timing out");
            }, 60000);
        }

        // 2. KIỂM TRA NẾU MUỐN TEST LỖI GATEWAY 99 (Tên chứa 'LOI99' hoặc CMND '999')
        const hasLoi99 = dsKhachHang.some(kh => 
            (kh.ten_kh && kh.ten_kh.toUpperCase().includes('LOI99')) || 
            (kh.so_cmt && kh.so_cmt.startsWith('999'))
        );
        if (hasLoi99) {
            console.log('==> [TEST AUTO] Phát hiện yêu cầu LỖI GATEWAY 99 (CMM_999)');
            return res.status(200).json({
            res_code: {
                error_code: "00",
                error_desc: "Thành công",
                ref_code: "CMM_000",
                ref_desc: "Nhận thông tin thành công"
            },
            data: {
                header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                payload: {
                    ttphan_hoi: {
                        trang_thai: "0",
                        ma: "00",
                        mo_ta: "Hỏi tin thành công",
                        loai_sp: ttChung.loai_sp || "",
                        slthanh_cong: String(dsKhachHang.length),
                        slthat_bai: "0"
                    }
                }
            }
        });

        }

        // 3. KIỂM TRA NẾU MUỐN TEST LỖI TOÀN LÔ BATCH (Tên chứa 'LOIBATCH' hoặc CMND '888')
        const hasLoiBatch = dsKhachHang.some(kh => 
            (kh.ten_kh && kh.ten_kh.toUpperCase().includes('LOIBATCH')) || 
            (kh.so_cmt && kh.so_cmt.startsWith('888'))
        );
        if (hasLoiBatch) {
            console.log('==> [TEST AUTO] Phát hiện yêu cầu LỖI TOÀN LÔ (CMM_005)');
            return res.status(200).json({
                res_code: { error_code: "00", error_desc: "Thành công", ref_code: "CMM_000", ref_desc: "OK" },
                data: {
                    header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                    payload: {
                        ttphan_hoi: {
                            trang_thai: "1",
                            ma: "CMM_005",
                            mo_ta: "Cấu trúc gói tin hỏi tin không hợp lệ theo chuẩn CIC",
                            loai_sp: ttChung.loai_sp || "S10",
                            slthanh_cong: "0",
                            slthat_bai: String(dsKhachHang.length)
                        },
                        dskhach_hang_kq: { dong_kq: [] } // Rỗng -> Lỗi cả lô
                    }
                }
            });
        }

        // 4. KIỂM TRA LỖI TỪNG PHIẾU (Tên chứa 'LOIKH' -> QNA_101, Tên chứa 'DATONTAI' -> QNA_104)
        const dsLoiKQ = [];
        dsKhachHang.forEach(kh => {
            const ten = (kh.ten_kh || '').toUpperCase();
            const cmt = kh.so_cmt || '';

            if (ten.includes('LOIKH') || cmt.startsWith('777')) {
                console.log(`==> [TEST AUTO] Phiếu ${kh.ma_so_phieu} bị lỗi QNA_101`);
                dsLoiKQ.push({
                    ma_so_phieu: kh.ma_so_phieu,
                    ten_kh: kh.ten_kh,
                    so_cmt: kh.so_cmt,
                    dsloi: {
                        loi: [{ ma_loi: "QNA_101", mo_ta_loi: "Thông tin số CMND/CCCD hoặc Tên KH không khớp dữ liệu CIC" }]
                    }
                });
            } else if (ten.includes('DATONTAI') || cmt.startsWith('104')) {
                console.log(`==> [TEST AUTO] Phiếu ${kh.ma_so_phieu} bị lỗi QNA_104 (Đã tồn tại)`);
                dsLoiKQ.push({
                    ma_so_phieu: kh.ma_so_phieu,
                    ten_kh: kh.ten_kh,
                    so_cmt: kh.so_cmt,
                    dsloi: {
                        loi: [{ ma_loi: "QNA_104", mo_ta_loi: "Mã số phiếu đã tồn tại trên hệ thống CIC" }]
                    }
                });
            }
        });

        // Nếu có phiếu bị lỗi trong lô
        if (dsLoiKQ.length > 0) {
            console.log(`==> [TEST AUTO] Trả về lô có ${dsLoiKQ.length} phiếu lỗi`);
            return res.status(200).json({
                res_code: { error_code: "00", error_desc: "Thành công", ref_code: "CMM_000", ref_desc: "OK" },
                data: {
                    header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                    payload: {
                        ttphan_hoi: {
                            trang_thai: "1",
                            ma: "QNA_001",
                            mo_ta: "Có lỗi trong danh sách hỏi tin",
                            loai_sp: ttChung.loai_sp || "S10",
                            slthanh_cong: String(dsKhachHang.length - dsLoiKQ.length),
                            slthat_bai: String(dsLoiKQ.length)
                        },
                        dskhach_hang_kq: { dong_kq: dsLoiKQ }
                    }
                }
            });
        }

        // 5. MẶC ĐỊNH: THÀNH CÔNG TOÀN BỘ
        console.log(`==> [TEST AUTO] Toàn bộ ${dsKhachHang.length} phiếu thành công 100%`);
        return res.status(200).json({
            res_code: {
                error_code: "00",
                error_desc: "Thành công",
                ref_code: "CMM_000",
                ref_desc: "Nhận thông tin thành công"
            },
            data: {
                header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                payload: {
                    ttphan_hoi: {
                        trang_thai: "0",
                        ma: "00",
                        mo_ta: "Hỏi tin thành công",
                        loai_sp: ttChung.loai_sp || "",
                        slthanh_cong: String(dsKhachHang.length),
                        slthat_bai: "0"
                    }
                }
            }
        });

    } catch (error) {
        console.error('Lỗi xử lý Hỏi Tin:', error);
        return res.status(500).json({
            res_code: {
                error_code: "99",
                error_desc: "Internal Server Error",
                ref_code: "CMM_999",
                ref_desc: error.message
            }
        });
    }
};
app.post(
  "/gw/internal/cic-query-service/api/v1/qa/b11t/hoitin",
  handleHoiTinB11T,
);
app.post("/cic-query-service/api/v1/qa/b11t/hoitin", handleHoiTinB11T);
app.post("/gw/internal/cic-query-service/api/v1/qa/hoitin", handleHoiTin);



// 2. Hỏi tin nhóm S (S10T, S11T)
const handleHoiTinS = (req, res) => {
  const msgId = req.body?.header?.msg_id || "msg-hoitin-s";
  const bodyInfo = req.body?.body?.hoitin_s || req.body?.body?.hoitin_sr || {};
  const masoPhieu = bodyInfo.maso_phieu || "MOCK_S10T_PHIEU_01";
  const maSp = (bodyInfo.ma_sp || "S10T").toUpperCase();
  const reportData = getReportByProductAndPhieu(masoPhieu, maSp);

  console.log(
    `\n[HỎI TIN NHÓM S - ${maSp}] Phiếu: ${masoPhieu} -> Trả về HTTP [${TEST_CONFIG.HTTP_STATUS}] | Mã [${TEST_CONFIG.OUT_CODE}]`,
  );

  return res.status(TEST_CONFIG.HTTP_STATUS).json({
    res_code: {
      error_code: "0",
      error_message: TEST_CONFIG.MESSAGE,
      ref_code: TEST_CONFIG.OUT_CODE,
      ref_desc: TEST_CONFIG.TL099_FULL,
    },
    data: {
      header: {
        msg_id: msgId,
        service_id: "590001",
        product_code: `CIC_HOITIN_${maSp}`,
      },
      payload: reportData,
    },
  });
};
app.post("/gw/internal/cic-query-service/api/v2/qa/hoitin-s", handleHoiTinS);
app.post("/cic-query-service/api/v2/qa/hoitin-s", handleHoiTinS);

// 3. Hỏi tin nhóm R (R10T, R11T)
const handleHoiTinR = (req, res) => {
  const msgId = req.body?.header?.msg_id || "msg-hoitin-r";
  const bodyInfo = req.body?.body?.hoitin_r || req.body?.body?.hoitin_sr || {};
  const masoPhieu = bodyInfo.maso_phieu || "MOCK_R11T_PHIEU_01";
  const maSp = (bodyInfo.ma_sp || "R11T").toUpperCase();
  const reportData = getReportByProductAndPhieu(masoPhieu, maSp);

  console.log(
    `\n[HỎI TIN NHÓM R - ${maSp}] Phiếu: ${masoPhieu} -> Trả về HTTP [${TEST_CONFIG.HTTP_STATUS}] | Mã [${TEST_CONFIG.OUT_CODE}]`,
  );

  return res.status(TEST_CONFIG.HTTP_STATUS).json({
    res_code: {
      error_code: "0",
      error_message: TEST_CONFIG.MESSAGE,
      ref_code: TEST_CONFIG.OUT_CODE,
      ref_desc: TEST_CONFIG.TL099_FULL,
    },
    data: {
      header: {
        msg_id: msgId,
        service_id: "590001",
        product_code: `CIC_HOITIN_${maSp}`,
      },
      payload: reportData,
    },
  });
};
app.post("/gw/internal/cic-query-service/api/v2/qa/hoitin-r", handleHoiTinR);
app.post("/cic-query-service/api/v2/qa/hoitin-r", handleHoiTinR);

// =============================================================================
// IV. CÁC API VẤN TIN (TRẢ VỀ OUT_06 KÈM MẢNG DỮ LIỆU ĐẦY ĐỦ CHO TỪNG PHIẾU)
// =============================================================================

// 1. Vấn tin B11T
const handleVanTinB11T = (req, res) => {
  const msgId = req.body?.header?.msg_id || "msg-vantin-b11t";
  const dsPhieu = req.body?.body?.vantin_b11t?.ds_maso_phieu || [
    "MOCK_B11T_PHIEU_01",
  ];

  console.log(
    `\n[VẤN TIN B11T] Trả HTTP [${TEST_CONFIG.HTTP_STATUS}] | Mã [${TEST_CONFIG.OUT_CODE}] cho danh sách:`,
    dsPhieu,
  );

  const payloadList = dsPhieu.map((phieuId) => getB11TReport(phieuId));

  return res.status(TEST_CONFIG.HTTP_STATUS).json({
    res_code: {
      error_code: "00",
      error_message: TEST_CONFIG.MESSAGE,
      ref_code: TEST_CONFIG.OUT_CODE,
      ref_desc: TEST_CONFIG.TL099_FULL,
    },
    data: {
      header: {
        msg_id: msgId,
        service_id: "590001",
        product_code: "CIC_VANTIN_B11T",
      },
      payload: payloadList,
    },
  });
};
app.post(
  "/gw/internal/cic-query-service/api/v1/qa/b11t/vantin",
  handleVanTinB11T,
);
app.post("/cic-query-service/api/v1/qa/b11t/vantin", handleVanTinB11T);

// 2. Vấn tin nhóm S (S10T, S11T)
const handleVanTinS = (req, res) => {
  const msgId = req.body?.header?.msg_id || "msg-vantin-s";
  const dsPhieu = req.body?.body?.vantin?.ds_maso_phieu ||
    req.body?.body?.vantin_s?.ds_maso_phieu || ["MOCK_S10T_PHIEU_01"];
  const maSp = (req.body?.body?.vantin?.ma_sp || "S10T").toUpperCase();

  console.log(
    `\n[VẤN TIN NHÓM S - ${maSp}] Trả HTTP [${TEST_CONFIG.HTTP_STATUS}] cho:`,
    dsPhieu,
  );

  const payloadList = dsPhieu.map((phieuId) =>
    getReportByProductAndPhieuVanTin(phieuId, maSp),
  );

  return res.status(TEST_CONFIG.HTTP_STATUS).json({
    res_code: {
      error_code: "00",
      error_message: TEST_CONFIG.MESSAGE,
      ref_code: TEST_CONFIG.OUT_CODE,
      ref_desc: TEST_CONFIG.TL099_FULL,
    },
    data: {
      header: {
        msg_id: msgId,
        service_id: "590001",
        product_code: "CIC_VANTIN_S",
      },
      payload: payloadList,
    },
  });
};
app.post("/gw/internal/cic-query-service/api/v2/qa/vantin-s", handleVanTinS);
app.post("/cic-query-service/api/v2/qa/vantin-s", handleVanTinS);

// 3. Vấn tin nhóm R (R10T, R11T)
const handleVanTinR = (req, res) => {
  const msgId = req.body?.header?.msg_id || "msg-vantin-r";
  const dsPhieu = req.body?.body?.vantin?.ds_maso_phieu ||
    req.body?.body?.vantin_r?.ds_maso_phieu || ["MOCK_R11T_PHIEU_01"];
  const maSp = (req.body?.body?.vantin?.ma_sp || "R11T").toUpperCase();

  console.log(
    `\n[VẤN TIN NHÓM R - ${maSp}] Trả HTTP [${TEST_CONFIG.HTTP_STATUS}] cho:`,
    dsPhieu,
  );

  const payloadList = dsPhieu.map((phieuId) =>
    getReportByProductAndPhieuVanTin(phieuId, maSp),
  );

  return res.status(TEST_CONFIG.HTTP_STATUS).json({
    res_code: {
      error_code: "00",
      error_message: TEST_CONFIG.MESSAGE,
      ref_code: TEST_CONFIG.OUT_CODE,
      ref_desc: TEST_CONFIG.TL099_FULL,
    },
    data: {
      header: {
        msg_id: msgId,
        service_id: "590001",
        product_code: "CIC_VANTIN_R",
      },
      payload: payloadList,
    },
  });
};
app.post("/gw/internal/cic-query-service/api/v2/qa/vantin-r", handleVanTinR);
app.post("/cic-query-service/api/v2/qa/vantin-r", handleVanTinR);

// 4. Vấn tin danh sách phiếu chung
const handleVanTinChung = (req, res) => {
  const msgId = req.body?.header?.msg_id || "msg-vantin-chung";
  const dsPhieu = req.body?.body?.vantin?.ds_maso_phieu ||
    req.body?.body?.vantin_b11t?.ds_maso_phieu || ["MOCK_PHIEU"];

  console.log(`\n[VẤN TIN CHUNG] Trả danh sách phiếu:`, dsPhieu);

  const payloadList = dsPhieu.map((phieuId) =>
    getReportByProductAndPhieu(phieuId, null),
  );

  return res.status(TEST_CONFIG.HTTP_STATUS).json({
    res_code: {
      error_code: "00",
      error_message: TEST_CONFIG.MESSAGE,
      ref_code: TEST_CONFIG.OUT_CODE,
      ref_desc: TEST_CONFIG.TL099_FULL,
    },
    data: {
      header: {
        msg_id: msgId,
        service_id: "590001",
        product_code: "CIC_VANTINDSPHIEU",
      },
      payload: payloadList,
    },
  });
};


const handleVanTinChungCU = async (req, res) => {
    try {
        // =========================================================================
        // 👉 ĐỔI TRƯỜNG HỢP CẦN TEST TẠI ĐÂY:
        //
        // "CMM_005"     : ⭐️ Lỗi CMM_005 (Sai định dạng input, 4 phiếu: 2 thành công, 2 lỗi)
        // "MIXED"       : 1 Phiếu có Data + 1 Phiếu lỗi QNA_132 + 1 Phiếu lỗi QNA_128
        // "SUCCESS"     : 1. Thành công toàn bộ (có dữ liệu XML báo cáo)
        // "PROCESSING"  : 2. CIC đang xử lý (data rỗng, sltra_loi = 0)
        // "ERROR_132"   : 3. Lỗi toàn bộ QNA_132 (dừng retry Queue_Status = 'L')
        // "BATCH_ERROR" : 4. Lỗi toàn bộ lô CMM_999 (tiếp tục retry)
        // "TIMEOUT"     : 5. Giả lập Timeout (delay 65s)
        // =========================================================================
        const CURRENT_CASE = "CMM_005"; 

        const reqHeader = req.body?.header || {};
        const reqBody = req.body?.body?.van_tin_ds_phieu || {};
        const dsMaSoPhieu = reqBody?.ds_ma_so_phieu?.ma_so_phieu || [];
        const msgId = reqHeader.msg_id || (typeof uuidv4 === 'function' ? uuidv4() : '01610415-d41f-4d81-8609-f672b77f6350');
        const serviceId = reqHeader.service_id || '590001';
        const productCode = reqHeader.product_code || 'CIC_VANTINDSPHIEU';

        console.log(`-> [VanTin] Nhận yêu cầu vấn tin cho ${dsMaSoPhieu.length} phiếu:`, dsMaSoPhieu);
        console.log(`-> [VanTin] Đang chạy Kịch Bản Test: [${CURRENT_CASE}]`);

        // Format ngày giờ
        const now = new Date();
        const yyyy = now.getFullYear();
        const MM = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const dateOnly = `${yyyy}-${MM}-${dd}`;
        const timeMinute = `${yyyy}${MM}${dd} ${hh}:${mm}`;
        const timeSecond = `${yyyy}${MM}${dd} ${hh}:${mm}:${ss}`;
        const isoStr = `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;

        // -------------------------------------------------------------------------
        // ⭐️ TRƯỜNG HỢP: CMM_005 (Sai định dạng input - 4 phiếu: 2 trả lời, 2 lỗi)
        // -------------------------------------------------------------------------
        if (CURRENT_CASE === "CMM_005") {
            // Lấy danh sách phiếu test (nếu request truyền >= 4 phiếu thì lấy theo request, nếu không lấy 4 phiếu mẫu)
            const listPhieu = dsMaSoPhieu.length >= 4 
                ? dsMaSoPhieu.slice(0, 4) 
                : (dsMaSoPhieu.concat(['BANK260623.0357.CC06', 'BANK260623.0355.CC06', 'BANK260623.0304.CC06', 'BANK260623.0358.CC06'])).slice(0, 4);

            const countHoi = 4;
            const countTraLoi = 2; // 2 phiếu có kết quả
            const countLoi = 2;    // 2 phiếu bị lỗi

            // 2 phiếu đầu tiên có kết quả trả về trong dong_kq
            const dongKqList = [
                {
                    ma_so_phieu: listPhieu[0],
                    loai_sp: "S11A",
                    ngay_hoi: `${yyyy}${MM}${dd} 08:45:54`,
                    data: `<NOIDUNG_BANTLTIN><TT_NGUOITRACUU><DONVITRACUU>Ngân hàng TMCP Lộc Phát Việt Nam</DONVITRACUU><DIACHI>Số 8, ngõ 1, đường Tôn Đức Thắng, phố 11, Phường Hoa Lư, Tỉnh Ninh Bình</DIACHI><TENTRUYCAP>h37357004thuong</TENTRUYCAP><DTHOAI></DTHOAI><MSPHIEU>BANK261026.3084.CC06</MSPHIEU><THOIGIANYC>20261026 18:35</THOIGIANYC><THOIGIANTL>20261026 18:35</THOIGIANTL><TT_TRALOI>1</TT_TRALOI></TT_NGUOITRACUU><NOIDUNG><TTPHAPLY><MACIC>7731334278</MACIC><TENKH>NGUYỄN THỊ THU VÂN</TENKH><DIACHI_TRUSOCHINH>Tổ 4-kp thanh tân-TT Đất Đỏ-đất đỏ-Bà Rịa Vũng Tàu</DIACHI_TRUSOCHINH><CMND_HC>077181006998</CMND_HC><GIAYTOKHAC>273058251</GIAYTOKHAC><DKKD></DKKD><MST></MST><TGD_GD></TGD_GD><NGUOI_DAIDIENPL></NGUOI_DAIDIENPL><GHICHU></GHICHU><XTHSKH>1</XTHSKH></TTPHAPLY><QHTDHT><QHTD><DONG><NGAYSL>20261015</NGAYSL><MATCTD>79204060</MATCTD><TENTCTD>Ngân hàng Nông nghiệp và Phát triển nông thôn Việt Nam – Chi nhánh Bà Rịa - Vũng Tàu</TENTCTD><CTLOAIVAY><DONG><LOAIVAY>02</LOAIVAY><NHOMNO>01</NHOMNO><DUNO_VND>90</DUNO_VND><DUNO_USD>0</DUNO_USD></DONG></CTLOAIVAY><TONG_VND>90</TONG_VND><TONG_USD>0</TONG_USD></DONG><DONG><NGAYSL>20261015</NGAYSL><MATCTD>79207001</MATCTD><TENTCTD>Ngân hàng Chính sách xã hội Việt Nam - Chi nhánh thành phố Hồ Chí Minh</TENTCTD><CTLOAIVAY><DONG><LOAIVAY>02</LOAIVAY><NHOMNO>01</NHOMNO><DUNO_VND>220</DUNO_VND><DUNO_USD>0</DUNO_USD></DONG></CTLOAIVAY><TONG_VND>220</TONG_VND><TONG_USD>0</TONG_USD></DONG></QHTD><DUNO_THETD></DUNO_THETD><DUNO_VAMC></DUNO_VAMC><HDTD><DONG><SOHDTD>6000LAV202401367</SOHDTD><MATCTD>79204060</MATCTD><TENTCTD>Ngân hàng Nông nghiệp và Phát triển nông thôn Việt Nam – Chi nhánh Bà Rịa - Vũng Tàu</TENTCTD><NGAYKY_HDTD>20240805</NGAYKY_HDTD><NGAYKT_HDTD>20290805</NGAYKT_HDTD></DONG><DONG><SOHDTD>6600000726606608</SOHDTD><MATCTD>79207001</MATCTD><TENTCTD>Ngân hàng Chính sách xã hội Việt Nam - Chi nhánh thành phố Hồ Chí Minh</TENTCTD><NGAYKY_HDTD>20231128</NGAYKY_HDTD><NGAYKT_HDTD>20280909</NGAYKT_HDTD></DONG><DONG><SOHDTD>6600000729040455</SOHDTD><MATCTD>79207001</MATCTD><TENTCTD>Ngân hàng Chính sách xã hội Việt Nam - Chi nhánh thành phố Hồ Chí Minh</TENTCTD><NGAYKY_HDTD>20240810</NGAYKY_HDTD><NGAYKT_HDTD>20270909</NGAYKT_HDTD></DONG><DONG><SOHDTD>6600000731274776</SOHDTD><MATCTD>79207001</MATCTD><TENTCTD>Ngân hàng Chính sách xã hội Việt Nam - Chi nhánh thành phố Hồ Chí Minh</TENTCTD><NGAYKY_HDTD>20250528</NGAYKY_HDTD><NGAYKT_HDTD>20300509</NGAYKT_HDTD></DONG></HDTD></QHTDHT><LSQHTD><DUNO_12THANG><DONG><THANG>202609</THANG><DUNOVAY>310</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>310</TONGDUNO></DONG><DONG><THANG>202608</THANG><DUNOVAY>310</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>310</TONGDUNO></DONG><DONG><THANG>202607</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202606</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202605</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202604</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202603</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202602</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202601</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202512</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202511</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG><DONG><THANG>202510</THANG><DUNOVAY>340</DUNOVAY><DUNOTHE></DUNOTHE><TONGDUNO>340</TONGDUNO></DONG></DUNO_12THANG><NHOM2_12THANG></NHOM2_12THANG><NOXAU_60THANG></NOXAU_60THANG> <LS_CHAMTT_THETD_36THANG></LS_CHAMTT_THETD_36THANG></LSQHTD><TSDB><SL_TCTD>1</SL_TCTD><SL_TSDB>1</SL_TSDB><MOTA_TSDB>Có</MOTA_TSDB></TSDB><LS_TRACUU_12THANG><DONG><MASP>QHTD</MASP><NGAYTRACUU>20251124 09:20:23</NGAYTRACUU><MATCTD>01357005</MATCTD><TENTCTD>Ngân hàng TMCP Lộc Phát Việt Nam- Hội Sở Chính</TENTCTD></DONG><DONG><MASP>QHTD</MASP><NGAYTRACUU>20261026 18:35:47</NGAYTRACUU><MATCTD>37357004</MATCTD><TENTCTD>Ngân hàng TMCP Lộc Phát Việt Nam - Hội Sở Chính</TENTCTD></DONG></LS_TRACUU_12THANG><DIEMTD><DIEM>637</DIEM><HANG>2</HANG><NGAYCHAM>20261019</NGAYCHAM><XEPHANGKH>92</XEPHANGKH><MOTA_XEPHANGKH>Điểm tín dụng của khách hàng cao hơn điểm tín dụng của 92% tổng số khách hàng cá nhân được chấm điểm tại kho dữ liệu CIC</MOTA_XEPHANGKH></DIEMTD><TTKHAC></TTKHAC></NOIDUNG></NOIDUNG_BANTLTIN>`
                },
                {
                    ma_so_phieu: listPhieu[1],
                    loai_sp: "S11A",
                    ngay_hoi: `${yyyy}${MM}${dd} 08:45:54`,
                    data: `<NOIDUNG_BANTLTIN><TT_NGUOITRACUU><DONVITRACUU>Ngân hàng TMCP Lộc Phát Việt Nam</DONVITRACUU><DIACHI>Số 8, ngõ 1, đường Tôn Đức Thắng, phố 11, Phường Hoa Lư, Tỉnh Ninh Bình</DIACHI><TENTRUYCAP>h01357005yen</TENTRUYCAP><MSPHIEU>${listPhieu[1]}</MSPHIEU><THOIGIANYC>${timeMinute}</THOIGIANYC><THOIGIANTL>${timeMinute}</THOIGIANTL><TT_TRALOI>1</TT_TRALOI></TT_NGUOITRACUU><NOIDUNG><TTPHAPLY><MACIC>4631362971</MACIC><TENKH>HỒ XUÂN BẢY</TENKH><CMND_HC>046077000965</CMND_HC><XTHSKH>1</XTHSKH></TTPHAPLY><QHTDHT><QHTD><DONG><NGAYSL>20260615</NGAYSL><MATCTD>79823001</MATCTD><TENTCTD>Công ty Tài chính TNHH HD SAISON</TENTCTD><TONG_VND>8</TONG_VND><TONG_USD>0</TONG_USD></DONG></QHTD></QHTDHT><DIEMTD><DIEM>511</DIEM><HANG>7</HANG><NGAYCHAM>20260529</NGAYCHAM><XEPHANGKH>12</XEPHANGKH><MOTA_XEPHANGKH>Điểm tín dụng của khách hàng cao hơn 12% khách hàng cá nhân</MOTA_XEPHANGKH></DIEMTD></NOIDUNG></NOIDUNG_BANTLTIN>`
                }
                // listPhieu[2] và listPhieu[3] không có trong dong_kq (tương ứng với 2 phiếu lỗi)
            ];

            return res.status(200).json({
                res_code: {
                    error_code: "47",
                    error_desc: "Lỗi khác",
                    ref_code: "CMM_005",
                    ref_desc: "Sai định dạng input"
                },
                data: {
                    header: {
                        msg_id: msgId,
                        service_id: serviceId,
                        product_code: productCode
                    },
                    payload: {
                        ttphan_hoi: {
                            trang_thai: "1",
                            ma: "CMM_005",
                            mo_ta: "Sai định dạng input",
                            check_sum: "8fc222e3d02bb834b95df66ea88013d3b3cb60028e08c558107631fe1c0709b3",
                            slhoi: String(countHoi),
                            sltra_loi: String(countTraLoi),
                            slloi: String(countLoi)
                        },
                        dskhach_hang_kq: {
                            dong_kq: dongKqList
                        }
                    }
                }
            });
        }

        // -------------------------------------------------------------------------
        // ⭐️ TRƯỜNG HỢP: MIXED (1 Phiếu có Data, 1 Phiếu QNA_132, 1 Phiếu QNA_128)
        // -------------------------------------------------------------------------
        if (CURRENT_CASE === "MIXED") {
            let countTraLoi = 0;
            let countLoi = 0;
            const dongKqList = dsMaSoPhieu.map((maSoPhieu, index) => {
                if (index === 0) {
                    countTraLoi++;
                    const xmlData = `<NOIDUNG_BANTLTIN><TT_NGUOITRACUU><DONVITRACUU>Ngân hàng TMCP Lộc Phát Việt Nam</DONVITRACUU><DIACHI>Hà Nội</DIACHI><TENTRUYCAP>h01357005yen</TENTRUYCAP><MSPHIEU>${maSoPhieu}</MSPHIEU><THOIGIANYC>${timeMinute}</THOIGIANYC><THOIGIANTL>${timeMinute}</THOIGIANTL><TT_TRALOI>1</TT_TRALOI></TT_NGUOITRACUU><NOIDUNG><TTPHAPLY><MACIC>6631842992</MACIC><TENKH>NGUYỄN VĂN THÀNH CÔNG</TENKH><CMND_HC>066086003772</CMND_HC><XTHSKH>1</XTHSKH></TTPHAPLY><DIEMTD><DIEM>448</DIEM><HANG>9</HANG><NGAYCHAM>20260623</NGAYCHAM><XEPHANGKH>3</XEPHANGKH><MOTA_XEPHANGKH>Điểm tín dụng tốt</MOTA_XEPHANGKH></DIEMTD></NOIDUNG></NOIDUNG_BANTLTIN>`;
                    return {
                        ma_so_phieu: maSoPhieu,
                        data: xmlData,
                        loai_sp: "S10A",
                        ngay_hoi: dateOnly,
                        ngay_nhan_gan_nhat: isoStr
                    };
                }
                if (index === 1) {
                    countLoi++;
                    return {
                        ma_so_phieu: maSoPhieu,
                        loai_sp: "S10A",
                        data: "",
                        ngay_hoi: dateOnly,
                        ngay_nhan_gan_nhat: isoStr,
                        dsloi: {
                            loi: [
                                {
                                    ma_loi: "QNA_132",
                                    mo_ta_loi: "Phiếu yêu cầu không hợp lệ hoặc đã bị hủy trên CIC"
                                }
                            ]
                        }
                    };
                }
                countLoi++;
                return {
                    ma_so_phieu: maSoPhieu,
                    loai_sp: "S10A",
                    data: "",
                    ngay_hoi: dateOnly,
                    ngay_nhan_gan_nhat: isoStr,
                    dsloi: {
                        loi: [
                            {
                                ma_loi: "QNA_128",
                                mo_ta_loi: "Loại sản phẩm yêu cầu tra cứu không phù hợp"
                            }
                        ]
                    }
                };
            });
            return res.status(200).json({
                res_code: { error_code: "00", error_desc: "Thành công", ref_code: "CMM_000", ref_desc: "Nhận thông tin thành công" },
                data: {
                    header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                    payload: {
                        ttphan_hoi: {
                            trang_thai: countLoi > 0 && countTraLoi === 0 ? "1" : "0",
                            ma: "CMM_000",
                            mo_ta: "Xử lý hoàn tất",
                            check_sum: typeof uuidv4 === 'function' ? uuidv4() : 'checksum-123',
                            slhoi: String(dsMaSoPhieu.length),
                            sltra_loi: String(countTraLoi),
                            slloi: String(countLoi)
                        },
                        dskhach_hang_kq: { dong_kq: dongKqList }
                    }
                }
            });
        }

        // -------------------------------------------------------------------------
        // 5. TRƯỜNG HỢP: TIMEOUT (Sleep 65s)
        // -------------------------------------------------------------------------
        if (CURRENT_CASE === "TIMEOUT") {
            console.log("-> [VanTin] Giả lập TIMEOUT (đang chờ 65s)...");
            await new Promise(r => setTimeout(r, 65000));
            return res.status(504).json({ message: "Gateway Timeout" });
        }

        // -------------------------------------------------------------------------
        // 4. TRƯỜNG HỢP: LỖI TOÀN BỘ LÔ (CMM_999)
        // -------------------------------------------------------------------------
        if (CURRENT_CASE === "BATCH_ERROR") {
            return res.status(200).json({
                res_code: { error_code: "47", error_desc: "Lỗi khác", ref_code: "CMM_999", ref_desc: "Lỗi không xác định" },
                data: {
                    header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                    payload: {
                        ttphan_hoi: {
                            trang_thai: "1",
                            ma: "CMM_999",
                            mo_ta: "Lỗi không xác định từ hệ thống CIC",
                            check_sum: typeof uuidv4 === 'function' ? uuidv4() : 'checksum-123',
                            slhoi: String(dsMaSoPhieu.length),
                            sltra_loi: "0",
                            slloi: String(dsMaSoPhieu.length)
                        }
                    }
                }
            });
        }

        // -------------------------------------------------------------------------
        // 3. TRƯỜNG HỢP: LỖI TỪNG PHIẾU (QNA_132)
        // -------------------------------------------------------------------------
        if (CURRENT_CASE === "ERROR_132") {
            const dongKqList = dsMaSoPhieu.map(maSoPhieu => ({
                ma_so_phieu: maSoPhieu,
                loai_sp: "S10A",
                data: "",
                ngay_hoi: dateOnly,
                ngay_nhan_gan_nhat: isoStr,
                dsloi: {
                    loi: [
                        {
                            ma_loi: "QNA_132",
                            mo_ta_loi: "Phiếu yêu cầu không hợp lệ hoặc đã bị hủy trên CIC"
                        }
                    ]
                }
            }));
            return res.status(200).json({
                res_code: { error_code: "00", error_desc: "Thành công", ref_code: "CMM_000", ref_desc: "Nhận thông tin thành công" },
                data: {
                    header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                    payload: {
                        ttphan_hoi: {
                            trang_thai: "1",
                            ma: "CMM_000",
                            mo_ta: "Có lỗi từng phiếu",
                            check_sum: typeof uuidv4 === 'function' ? uuidv4() : 'checksum-123',
                            slhoi: String(dsMaSoPhieu.length),
                            sltra_loi: "0",
                            slloi: String(dsMaSoPhieu.length)
                        },
                        dskhach_hang_kq: { dong_kq: dongKqList }
                    }
                }
            });
        }

        // -------------------------------------------------------------------------
        // 2. TRƯỜNG HỢP: ĐANG XỬ LÝ (data rỗng)
        // -------------------------------------------------------------------------
        if (CURRENT_CASE === "PROCESSING") {
            const dongKqList = dsMaSoPhieu.map(maSoPhieu => ({
                ma_so_phieu: maSoPhieu,
                loai_sp: "S10A",
                data: "",
                ngay_hoi: dateOnly,
                ngay_nhan_gan_nhat: isoStr
            }));
            return res.status(200).json({
                res_code: { error_code: "00", error_desc: "Thành công", ref_code: "CMM_000", ref_desc: "Nhận thông tin thành công" },
                data: {
                    header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                    payload: {
                        ttphan_hoi: {
                            trang_thai: "0",
                            ma: "CMM_000",
                            mo_ta: "Đang xử lý",
                            check_sum: typeof uuidv4 === 'function' ? uuidv4() : 'checksum-123',
                            slhoi: String(dsMaSoPhieu.length),
                            sltra_loi: "0",
                            slloi: "0"
                        },
                        dskhach_hang_kq: { dong_kq: dongKqList }
                    }
                }
            });
        }

        // -------------------------------------------------------------------------
        // 1. TRƯỜNG HỢP: THÀNH CÔNG (Toàn bộ có Data)
        // -------------------------------------------------------------------------
        const dongKqList = dsMaSoPhieu.map(maSoPhieu => {
            const xmlData = `<NOIDUNG_BANTLTIN><TT_NGUOITRACUU><DONVITRACUU>Ngân hàng TMCP Lộc Phát Việt Nam</DONVITRACUU><DIACHI>Hà Nội</DIACHI><TENTRUYCAP>h01357005yen</TENTRUYCAP><MSPHIEU>${maSoPhieu}</MSPHIEU><THOIGIANYC>${timeMinute}</THOIGIANYC><THOIGIANTL>${timeMinute}</THOIGIANTL><TT_TRALOI>1</TT_TRALOI></TT_NGUOITRACUU><NOIDUNG><TTPHAPLY><MACIC>6631842992</MACIC><TENKH>TẠ NGỌC BÌNH</TENKH><CMND_HC>066086003772</CMND_HC><XTHSKH>1</XTHSKH></TTPHAPLY><DIEMTD><DIEM>448</DIEM><HANG>9</HANG><NGAYCHAM>20260623</NGAYCHAM><XEPHANGKH>3</XEPHANGKH><MOTA_XEPHANGKH>Điểm tín dụng tốt</MOTA_XEPHANGKH></DIEMTD></NOIDUNG></NOIDUNG_BANTLTIN>`;
            return {
                ma_so_phieu: maSoPhieu,
                data: xmlData,
                loai_sp: "S10A",
                ngay_hoi: dateOnly,
                ngay_nhan_gan_nhat: isoStr
            };
        });

        return res.status(200).json({
            res_code: { error_code: "00", error_desc: "Thành công", ref_code: "CMM_000", ref_desc: "Nhận thông tin thành công" },
            data: {
                header: { msg_id: msgId, service_id: serviceId, product_code: productCode },
                payload: {
                    ttphan_hoi: {
                        trang_thai: "0",
                        ma: "CMM_000",
                        mo_ta: "Thành công",
                        check_sum: typeof uuidv4 === 'function' ? uuidv4() : 'checksum-123',
                        slhoi: String(dsMaSoPhieu.length),
                        sltra_loi: String(dsMaSoPhieu.length),
                        slloi: "0"
                    },
                    dskhach_hang_kq: { dong_kq: dongKqList }
                }
            }
        });

    } catch (error) {
        console.error('Lỗi Vấn Tin:', error);
        return res.status(500).json({ res_code: { error_code: "99", error_desc: error.message } });
    }
};

app.post(
  "/gw/internal/cic-query-service/api/v1/qa/vantindsphieu",
  handleVanTinChungCU,
);

// =============================================================================
// V. HEALTH CHECK & KHỞI CHẠY SERVER
// =============================================================================
app.get("/health", (req, res) =>
  res.json({
    status: "OK",
    server: "CIC Mock Server Full Schemas",
    code: TEST_CONFIG.OUT_CODE,
  }),
);

app.use((req, res) => {
  console.log(`[404 NOT FOUND] ${req.method} ${req.url}`);
  res
    .status(404)
    .json({ error: "Endpoint not found on mock server", url: req.url });
});
app.on("checkContinue", (req, res) => {
  res.writeContinue(); // Đáp ứng bắt tay 100 Continue cho C#
  app(req, res);       // Đưa tiếp request vào Express xử lý
});
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `================================================================`,
  );
  console.log(
    `CIC Mock Server Full Schemas đang chạy tại cổng: ${PORT}`,
  );
  console.log(
    `   - Trạng thái trả về: HTTP [${TEST_CONFIG.HTTP_STATUS}] | Mã: [${TEST_CONFIG.OUT_CODE}]`,
  );
  console.log(
    `   - Đã chuẩn hóa 100% data BC3200 (BC3201..BC3205) cho cả 5 sản phẩm`,
  );
  console.log(
    `================================================================`,
  );
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
