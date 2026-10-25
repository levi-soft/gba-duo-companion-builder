# Rà soát để chốt 1.0.0

Phạm vi: builder, Lua, giao diện chung và ba profile ROM chính xác FE7 Việt,
FE6 Việt Remastered dựa trên FE8, FE8 Việt. APK GBA Duo Plus không thuộc phần sửa.

## Sửa tương thích Plus sau phát hành

Gói 1.0.0 đầu tiên thêm cache query `?v=...` vào cả trang runner. Bộ chặn nội bộ
của Plus 0.1.7-plus.2 từ chối mọi query, khiến script không chạy và màn hình dừng
ở “Creating companion from your local ROM…”. Tải catalog/ZIP vẫn thành công.
Đây là lỗi tích hợp bị bỏ sót trong các gate ban đầu.

Trang runner đã được sửa để dùng đường dẫn không query; các trang web thông
thường vẫn có cache key theo nội dung. Plus tắt WebView cache và tải bundle theo
SHA-256 nên không cần đổi APK, phiên bản builder hoặc phiên bản companion.
Đã thêm regression kiểm tra toàn bộ script/CSS của runner theo bộ chặn protocol 1:
thất bại với gói đầu tiên và đạt sau sửa. Tổng số test hiện tại là 43.
Kiểm tra HTTP từ Thor xác nhận catalog và ZIP tải được; điều này không tự thay
thế việc chạy trọn luồng tạo/cài trong ứng dụng.

## Lỗi đã phát hiện và sửa

| Phần | Lỗi có bằng chứng | Cách sửa |
|---|---|---|
| Minimap FE6/FE8 | Bảng hoặc hàng RAM không hợp lệ có thể gây đọc ngoài EWRAM khi chuyển trạng thái | Kiểm tra toàn bộ giới hạn bảng và từng hàng trước khi đọc ô |
| Unit FE6/FE8 | Unit từ con trỏ bản đồ chưa được kiểm tra lại đầy đủ | Kiểm tra slot, metadata, HP, trạng thái chết/chưa triển khai và fog; vẫn chấp nhận unit chưa ra trận trong Preparations |
| Fog FE6/FE8 | Roster đã ẩn enemy nhưng marker đỏ vẫn lộ vị trí | Ẩn marker khi unit còn cờ fog |
| Giao diện FE6 | Icon Str và Mag trùng ID | Đặt ID riêng cho icon Mag |
| CSS chung/FE6 | `flex:1 1 0` bị bộ phân tích CSS native từ chối | Dùng zero basis có đơn vị `0vmin` |

Các regression mới tái hiện những lỗi Lua trước sửa và vượt qua sau sửa.
Không sửa công thức riêng EXP, Growth, skill hoặc giả lập Thumb của game/mod.

## Tổ chức code

- Mỗi profile có `main.lua` điều phối các module `game`, `features`, `presentation`.
- Phần thực sự dùng chung nằm trong `runtime/shared`; địa chỉ ROM/RAM ở profile.
- Layout/CSS/factory chung đã tách sang `ui/`; `site/theme.js` là file sinh tự động.
- Loại 87 quy tắc CSS top-level trùng hệt nhau, giữ lần xuất hiện cuối. Các override
  khác nội dung vẫn giữ thứ tự cascade.
- Điều phối tạo pack và runner được xuống dòng, chia bước rõ; API/protocol giữ nguyên.
- Luồng build tự sinh nguồn, kiểm tra phiên bản và profile, tạo bundle có checksum.

## Quy tắc phiên bản

Builder và cả ba companion bắt đầu mốc ổn định ở **1.0.0**. Builder chỉ tăng khi
thêm profile mới. Companion được sửa sẽ tăng phiên bản riêng. Bundle và cache
web nhận biết nội dung bằng SHA-256; không tăng builder để xử lý cache.
Xem [VERSIONING](VERSIONING.md). Build từ chối manifest/đầu ra không khớp,
profile trùng danh tính ROM hoặc thay phiên bản builder sai chính sách.

## Bằng chứng kiểm tra

- 42 test tự động: runtime Lua, Preparations, bộ nhớ/bản đồ/fog, UI, core/runner,
  hủy và lỗi ZIP stream/adapter, policy phát hành và cache theo nội dung.
- StyLua `--check` đạt theo cấu hình Lua 5.4 của dự án.
- Tạo cả ba pack từ đúng ROM; tài nguyên ảnh được chuẩn bị khớp baseline.
- Đối chiếu ZIP cuối và runtime: 345 lượt cập nhật map/Forecast giữ kết quả như
  baseline trong các tình huống hợp lệ được chụp trước đó.
- Thor: 24 lượt chạy Lua native, 708 lần cập nhật cho Units, Map, Growth,
  Analysis; output cũ/mới khớp trên các fixture hợp lệ và RAM không đổi.
- Thor: thêm 18 lần cập nhật Preparations cho ba profile, chỉ đọc fixture.
- 15 kiểm tra render Android dùng pack cuối cho Units, Map, Growth, Analysis và
  mô tả dài; kiểm tra parser CSS/layout và cuộn đến dòng cuối của mô tả.

Các fixture riêng, ROM, RAM và ZIP đã trích xuất tài nguyên game không được đưa
lên GitHub. Ghi nhận này là kiểm tra code/đầu ra cụ thể; không thay cho chấp nhận
trực quan trên máy ở mọi chương, mọi skill và mọi tổ hợp vật phẩm. Không có cam
kết chính xác 95%/100% cho dự đoán toàn game. Tình huống chưa hỗ trợ tiếp tục phải
báo không khả dụng thay vì tạo kết quả giả.

Không còn lỗi chặn phát hành đã biết trong phạm vi rà soát sau khi hoàn tất các
gate trên. Mốc ổn định không có nghĩa là mọi đường đi của cả ba game đều đã được
chứng minh không có lỗi. [Phạm vi tính năng và kiểm chứng](../site/FEATURE-CONTRACT.md).
