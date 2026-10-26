# Quy tắc phiên bản / Version policy

Builder và companion có phiên bản độc lập. Mốc ổn định đầu tiên của builder và
cả ba companion FE Việt hóa là **1.0.0**.

| Thay đổi | Phiên bản builder | Phiên bản companion |
|---|---|---|
| Sửa Lua, thông tin unit, thuật toán hoặc giao diện của profile hiện có | Giữ nguyên | Tăng phiên bản companion được sửa |
| Sửa giao diện chung của ba companion | Giữ nguyên | Tăng cả ba phiên bản companion |
| Sửa website hoặc đóng gói mà không thêm profile | Giữ nguyên | Chỉ tăng nếu nội dung pack thay đổi |
| Bổ sung profile mới | Giữ nguyên trong lúc phát triển; chỉ tăng khi chủ dự án chốt đợt phát hành có profile mới | Profile mới có phiên bản riêng; profile cũ không bắt buộc đổi |

## Nguồn và kiểm tra

- `package.json` và `package-lock.json`: phiên bản builder.
- `release-policy.json`: lịch sử phiên bản builder và tập ID profile đi kèm.
  Giữ bản ghi đã phát hành; chỉ thêm bản ghi khi chủ dự án chốt phiên bản Builder mới và tập profile được mở rộng. Không tạo một phiên bản Builder cho mỗi profile.
- `site/profiles.js`: profile, ROM chính xác và tên đầu ra kèm phiên bản companion.
- `site/profiles/<id>/template.js`: manifest của companion tương ứng.
- Build từ chối khi phiên bản builder không khớp chính sách, tập profile không
  thiếu profile đã phát hành, trùng danh tính ROM hoặc phiên bản manifest khác tên đầu ra. Catalogue được phép thêm profile mới mà vẫn giữ phiên bản Builder hiện tại.

Ví dụ: sửa FE7 sau mốc ổn định thì FE7 có thể lên `1.0.1`, còn builder, FE6 và
FE8 vẫn là `1.0.0`. Không tăng builder để xử lý cache hoặc phân biệt bản build.

## Cập nhật mà không tăng builder

Mỗi bundle được đặt tên bằng phiên bản builder và SHA-256 của chính nội dung:
`releases/builder-<version>-<sha256>.zip`. Khi companion được sửa, đường dẫn và
checksum tự đổi, kể cả khi builder vẫn là `1.0.0`. Bundle đã công bố không bị
ghi đè. `catalog.json` luôn trỏ tới bundle hiện tại và liệt kê phiên bản riêng
của từng companion.

Script và CSS trên web cũng dùng checksum nội dung làm cache key. Người dùng
không bị giữ lại Lua/UI cũ chỉ vì phiên bản builder không đổi. Plus hiện tại đã
lưu cache bundle theo SHA-256, nên quy tắc này không cần thay APK.

Riêng `plus-runner.html` giữ đường dẫn script/CSS **không có query** để tương
thích bộ chặn tài nguyên của Plus protocol 1. WebView này đã tắt cache; bundle
được kiểm tra SHA-256 và giải nén vào thư mục riêng cho từng lượt chạy. Cache key
`?v=...` chỉ dùng cho các trang web thông thường.

Website và Plus lấy bản hiện tại theo catalogue. Tag/release GitHub là snapshot
đã công bố; không di chuyển tag cũ để đưa một bản sửa companion mới vào cùng tag.

## Nguồn code

- Logic Lua: `runtime/<profile>/` và `runtime/shared/`.
- Giao diện dùng chung: `ui/theme.layout.json`, `ui/theme.css`, `ui/theme-factory.js`.
- `site/runtime-modules.js` và `site/theme.js` là file sinh tự động.
- `npm run build` và `npm test` tự sinh lại UI/Lua từ nguồn dễ đọc. Không sửa
  chuỗi Lua hoặc CSS trong các file sinh tự động.

## English

Builder versions advance only for an explicitly finalized release containing new
profiles. Adding a profile during development does not automatically increment
Builder. Companion fixes advance affected companion versions independently. Release history is validated
at build time. Content-addressed immutable bundles and script/style fingerprints
provide updates and cache invalidation without changing the builder version.
Always resolve the current bundle through `catalog.json`; do not assume a fixed
`builder-1.0.0.zip` filename or move a previously published tag.
