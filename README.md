# Tạo workspace Discord “Sketch2Life”

Script này tạo workspace cho capstone Sketch2Life: điều hành, nghiên cứu Montessori, bốn work packages và thử nghiệm. Chạy lại cũng an toàn: phần đã có sẽ được bỏ qua. Khi chạy với `REPLACE_STARTER_LAYOUT=true`, script chỉ xóa các category/kênh layout mẫu ban đầu mà chính script nhận diện; không động tới cấu trúc Sketch2Life.

Script cũng tự tạo:
- Kênh `#bot-log` (trong category `🔒 NHẬT KÝ HỆ THỐNG`), ẩn với `@everyone`, chỉ tài khoản có quyền **Administrator** mới xem được. Mỗi lần chạy script, toàn bộ log (tạo gì, bỏ qua gì, lỗi gì) được gửi vào đây thay vì chỉ hiện trên console.
- 5 AutoMod rule để bảo vệ workspace có dữ liệu liên quan trẻ em:
  - Chặn ngôn từ nhạy cảm theo preset có sẵn của Discord (tục tĩu, khiêu dâm, phân biệt — chỉ nhận diện tốt tiếng Anh)
  - Chặn ngôn từ nhạy cảm tiếng Việt theo danh sách từ khóa tự định nghĩa trong `VIETNAMESE_PROFANITY_KEYWORDS` (đầu file `setup-server.js`), vì preset của Discord không bắt được tiếng Việt
  - Chặn link rút gọn/invite lạ
  - Chặn spam tin nhắn
  - Chặn spam mention

  Mỗi khi rule chặn nội dung, cảnh báo được gửi vào `#bot-log`. Muốn thêm/sửa từ khóa tiếng Việt, có 2 cách:
  - Sửa biến `VIETNAMESE_PROFANITY_KEYWORDS` (dạng danh sách phân tách bằng dấu phẩy) trong `.env`, ví dụ: `VIETNAMESE_PROFANITY_KEYWORDS=*đm*,*vcl*,*lồn*,*cặc*`. Cách này không cần sửa code, phù hợp khi chỉ muốn tùy biến nhanh.
  - Hoặc sửa trực tiếp mảng `DEFAULT_VIETNAMESE_PROFANITY_KEYWORDS` trong `setup-server.js` nếu muốn danh sách đó là mặc định luôn, không phụ thuộc `.env`.

  Nếu đặt biến trong `.env` thì danh sách đó sẽ **thay thế hoàn toàn** danh sách mặc định trong code (không cộng dồn). Bỏ trống hoặc không set biến thì script dùng danh sách mặc định có sẵn.

Ba kênh trong `🌱 THỬ NGHIỆM & DEMO` (`guide-feedback`, `parent-feedback`, `demo-showcase`) được đặt sẵn slowmode 10 giây/tin nhắn để hạn chế spam feedback dồn dập. Muốn đổi thời gian hoặc thêm slowmode cho kênh khác, sửa field `slowmode` (đơn vị giây) trong mảng `layout` ở `setup-server.js`.


## 1. Tạo và mời bot vào server

1. Mở [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Chọn **Bot** → **Reset Token** → sao chép token. Giữ token như mật khẩu, không gửi cho ai và không commit vào Git.
3. Vào **Installation** (hoặc **OAuth2 → URL Generator**), chọn scope `bot`.
4. Cấp tối thiểu các quyền: **View Channels**, **Send Messages**, **Manage Channels**, **Manage Roles**, **Manage Server** (cần cho AutoMod).
5. Mở link tạo ra và chọn server **Vẽ Cùng Héo 3D**.

Bot cần `Manage Channels` để tạo category/channel, `Manage Roles` để tạo role, và `Manage Server` để tạo AutoMod rule. Discord xác nhận những thao tác này cần các quyền tương ứng; role do bot tạo chỉ nên được cấp quyền quản trị sau khi bạn xem lại.

## 2. Lấy Server ID

Trong Discord: **User Settings → Advanced → bật Developer Mode**. Sau đó click phải tên server **Vẽ Cùng Héo 3D** → **Copy Server ID**.

## 3. Chạy script

Mở PowerShell tại thư mục này, rồi chạy:

```powershell
npm install
Copy-Item .env.example .env
```

Mở file `.env` bằng Notepad, thay hai giá trị bằng token bot và Server ID của bạn. Sau đó kiểm tra trước (chưa thay đổi Discord):

```powershell
npm run preview
```

Khi đúng, chạy:

```powershell
npm run setup-server
```

## Layout sẽ được tạo

```text
📜 QUY ĐỊNH
  # rules (chỉ đọc)

📢 CẬP NHẬT
  # thông-báo (chỉ đọc)
  # sự-kiện
  # cơ-hội-việc-làm

🎨 CỘNG ĐỒNG 3D
  # chung
  # khoe-tác-phẩm
  # hỏi-đáp-3d
  # tài-nguyên
  # random

🔊 PHÒNG THOẠI
  🔊 Chung
  🔊 Cùng vẽ
  🔊 Góp ý tác phẩm
```

Nó cũng tạo role `Admin`, `Mod`, `Member`, nhưng **không tự gán role cho bất cứ ai** và không cấp quyền Administrator. Sau khi chạy xong, hãy tự gán role Admin cho tài khoản của bạn trong Server Settings → Members rồi xem lại quyền theo nhu cầu.

Tài liệu Discord về [quản lý server/channel](https://docs.discord.com/developers/platform/server-and-channel-management) và [OAuth2/quyền của bot](https://docs.discord.com/developers/platform/oauth2-and-permissions) là nguồn tham chiếu cho các quyền bot trên.

## Bot vận hành hằng ngày

Sau khi chạy setup một lần, khởi động bot thường trực bằng:

```powershell
npm start
```

File `index.js` chỉ khởi động bot. Các tính năng được tách riêng trong `src/commands` và `src/services`; dữ liệu task, lịch họp và thông báo nằm cục bộ tại `data/bot-data.json` (được bỏ qua khi commit Git).

Các slash command hiện có:

- `/task create`, `/task list`, `/task status`, `/task remove`: tạo, theo dõi và cập nhật công việc.
- `/meeting schedule`, `/meeting list`, `/meeting cancel`: lên lịch cuộc họp và gửi nhắc trước 15 phút.
- `/notify send`, `/notify remind`, `/notify list`, `/notify cancel`: gửi hoặc hẹn thông báo. Nhóm lệnh này cần quyền **Manage Server**.
- `/daily`: điểm danh một lần/ngày, lưu chuỗi ngày liên tiếp theo múi giờ Việt Nam.
- `/poll create`, `/poll results`, `/poll close`: tạo bình chọn bằng nút, cập nhật số phiếu ngay khi bấm và tự đóng khi hết giờ. Tạo/đóng poll cần quyền **Manage Server**.
- `/translate`: dịch Việt–Anh hoặc Anh–Việt. Cần thêm `DEEPL_API_KEY` vào `.env` (DeepL có gói API miễn phí).

Thời gian nhập trong `/meeting schedule` và `/notify remind` theo dạng `YYYY-MM-DD HH:mm`, ví dụ `2026-08-20 14:30`. Bot cũng tự nhắc task còn mở trước hạn 24 giờ. Có thể cấu hình kênh và giờ báo cáo hằng ngày trong `.env` bằng các biến mẫu đã có trong `.env.example`.
