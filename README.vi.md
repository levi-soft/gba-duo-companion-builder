# GBA Duo Companion Builder

[Danh sách game được hỗ trợ](https://levi-soft.github.io/gba-duo-companion-builder/supported-games.html?lang=vi)
có trang riêng, hiển thị phiên bản companion và thông tin ROM chính xác. Danh sách
lấy từ cùng `site/profiles.js` mà Builder sử dụng; khi thêm profile, danh sách tự
cập nhật theo, không cần sửa nội dung màn hình chọn ROM.

[English](README.md)

Tạo companion từ ROM được hỗ trợ ngay trên máy của bạn. Website tạo ZIP để nhập thủ công; GBA Duo Plus có thể dùng cùng bộ tạo để tự tạo, cài và gán companion trong giả lập.

**Website:** [levi-soft.github.io/gba-duo-companion-builder](https://levi-soft.github.io/gba-duo-companion-builder/)

Đây là dự án do [levi-soft](https://github.com/levi-soft) duy trì. Tính năng tìm/tạo/cài tự động là **phần mở rộng riêng của GBA Duo Plus**, không phải tính năng của GBA Duo chính thức. Cách nhập ZIP thủ công vẫn được giữ. Khi bản chính thức hỗ trợ đầy đủ, Plus có thể thay phần tích hợp riêng, tiếp tục dùng định dạng catalog và companion này.

## Chốt 1.0.0 và tách phiên bản

Builder và cả ba companion FE Việt hóa được chốt **1.0.0** sau đợt rà soát.
**Builder chỉ tăng phiên bản khi thêm profile mới.** Khi sửa companion hiện có,
chỉ tăng phiên bản companion tương ứng. Checksum nội dung giúp tải đúng bản mới
mà không cần tăng builder hoặc thay APK Plus.
[Quy tắc phiên bản](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/VERSIONING.md) · [Kết quả rà soát và giới hạn](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/STABLE-1.0.0-AUDIT.md).

## Dùng website

1. Mở website bằng Chrome hoặc Edge hiện hành.
2. Chọn tiếng Việt hoặc tiếng Anh, rồi chọn ROM `.gba` hoặc ZIP chứa đúng một ROM `.gba`.
3. Bấm **Tạo companion** và chờ xử lý trên máy.
4. Tải Local ZIP, lưu game/state, rồi nhập và gán ZIP trong GBA Duo Plus. Tệp dự án JSON tùy chọn có thể mở bằng [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio).

Website tải mã và chất liệu UI của công cụ. ROM được xử lý cục bộ: không tải ROM, ảnh hay văn bản game lên máy chủ và không sửa ROM. Tệp vừa tạo chứa asset từ ROM, nên giữ riêng để sử dụng cá nhân. Hãy chia sẻ website builder.

## Sửa Preparations trong bản 0.9.8

Cả ba companion đã đọc unit đang chọn trong danh sách ra trận, Items và bảng
chỉ số của Preparations, kể cả unit chưa được chọn ra trận. Bộ đọc dùng chung
nằm trong module Lua riêng, địa chỉ của từng game đặt trong profile. Hãy tạo
lại/nhập companion để nhận bản sửa; pack đã cài không bị thay đổi ngầm.
Xem [kiểm chứng và giới hạn](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/site/FEATURE-CONTRACT.md).

## Sửa khung mô tả vật phẩm trong bản 0.9.9

Mô tả dài giữ chiều cao dòng và có thể cuộn trong khung thông tin, không bị ép
hoặc mất phần cuối. Tạo lại/nhập companion để cập nhật giao diện. Không cần
cập nhật APK Plus.

## Profile chính xác trong builder 1.0.0

| Profile | Mã game | CRC32 ROM | Phiên bản companion |
| --- | --- | --- | --- |
| FE7 Việt hóa | AE7E | 32CD990D | 1.0.0 |
| FE6 Việt hóa Remastered, trên nền FE8 | BE8E | BD53D5F3 | 1.0.0 |
| FE8 Việt hóa | BE8E | 3CD932D7 | 1.0.0 |

Các bản ROM khác bị từ chối. Profile FE6 này không dành cho FE6 gốc. Builder hoạt động theo profile đã có, chưa tự dò cấu trúc RAM cho mọi game. Phạm vi kiểm chứng dự đoán và giới hạn thiết bị nằm trong [FEATURE-CONTRACT.md](site/FEATURE-CONTRACT.md).

## Tích hợp Plus

[Catalog công khai](https://levi-soft.github.io/gba-duo-companion-builder/catalog.json) khai báo ROM tương ứng, phiên bản bộ tạo, dung lượng và SHA-256. Plus có hỗ trợ giao thức sẽ tải và kiểm tra bộ tạo, đọc ROM qua đường dẫn nội bộ rồi cài ZIP vừa tạo. Nhập thủ công vẫn độc lập; tự tạo không được âm thầm ghi đè companion tùy chỉnh người dùng đã chọn.

Website và Plus dùng chung `builder-core.js`, profile đọc ROM, chất liệu UI, compiler và phần đóng ZIP. GitHub chỉ cung cấp bộ hướng dẫn tạo; ảnh và văn bản game được lấy từ ROM trên máy. Sau khi lưu cache, companion có thể dùng offline. Cần bản Plus triển khai [giao thức runner 1](docs/PLUS-PROTOCOL.md); bản Plus cũ vẫn nhập ZIP thủ công được.

## Build và kiểm tra

Cần Node.js 20 trở lên. `npm ci` cài bộ máy Lua đã ghim phiên bản để kiểm thử trên máy tính; thư viện này không được đưa vào website hoặc Plus.

```sh
npm ci
npm run build
npm test
```

`site/` chứa website tĩnh. Build tạo `site/catalog.json` và bundle theo nội dung `site/releases/builder-1.0.0-<sha256>.zip` từ mã trong `site/`, không đọc ROM hay sửa các gói 0.9.6 đã chốt trước đây.

Kiểm tra tự động bao gồm hash catalog, phiên bản ROM, nguồn asset cục bộ, template không chứa dữ liệu game đã xuất, đóng ZIP format 2 với dữ liệu giả lập phục vụ kiểm thử, hủy tác vụ và truyền ZIP theo khối. Các kiểm tra này không thay thế việc thử chọn tệp trên trình duyệt và chạy Plus trên máy thật.

Mã Lua dễ đọc nằm trong `runtime/<profile>/` và `runtime/shared/`. Bắt đầu từ `main.lua` của profile; không chỉnh trực tiếp chuỗi Lua trong JavaScript được sinh ra. Xem [cấu trúc Lua và cách đối chiếu](docs/runtime-modules.vi.md). Cả `npm test` và `npm run build` đều tạo lại bộ module từ các file nguồn này.

## Đưa lên GitHub Pages

Build và chạy kiểm tra, sau đó đưa **nội dung bên trong** `site/` lên thư mục gốc của nhánh `gh-pages`. Trong Settings → Pages, chọn **Deploy from a branch**, nhánh `gh-pages`, thư mục `/ (root)`. Đã có `.nojekyll`. Nhánh `main` giữ mã nguồn. Cách này không cần token có quyền tạo workflow Actions.

Có thêm [workflow mẫu](docs/examples/pages.yml) nếu muốn chuyển sang GitHub Actions sau này. Hướng dẫn chính thức: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Nguồn gốc và tri ân

Cảm ơn **[khumam](https://github.com/khumam)**, tác giả **[GBA Duo](https://github.com/khumam/gba-duo)**, đã xây dựng giả lập, ý tưởng companion hai màn hình và định dạng companion. [GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) phát triển từ nền đó; [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio) cung cấp công cụ thiết kế và compiler dùng tại đây.

Nguồn ban đầu chỉ lấy từ **Public Kit 0.9.6** đã kiểm tra; checksum ở [SOURCE.json](SOURCE.json). Repo không chứa ROM, bộ ảnh nhân vật/sprite đã trích xuất, bảng text game, save hoặc Local ZIP đã tạo. Game và asset Fire Emblem thuộc các chủ sở hữu tương ứng. Công cụ độc lập này không cấp quyền chia sẻ ROM hay asset game vừa tạo.

Mã nguồn theo [GPL v3](LICENSE). Xem [CREDITS.md](CREDITS.md), `site/THIRD-PARTY` và giấy phép JSZip/icon/font đi kèm.
