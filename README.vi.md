# GBA Duo Companion Builder

**Đã gỡ phát hành 1.2.0.** Website và catalog công khai trở về **Builder 1.1.5 với 15 profile**. Mười lăm bản mới trong mã nguồn đang được triển khai và nghiệm thu lại đầy đủ tính năng, chưa phải bản được chấp nhận để phát hành. Xem [các phần còn thiếu](docs/ANALYSIS-GAPS-1.2.0.vi.md).

**Đính chính về 15 bản mới:** 10 bản chưa có Battle Analysis hoạt động; 5 bản chỉ kiểm chứng Analysis trong một số ca có điều kiện. Chưa nghiệm thu đầy đủ thao tác trong app companion trên thiết bị thật. CI đạt và số phiên bản 1.0.0 không chứng minh đã hoàn thiện tính năng. Xem [phần còn thiếu và công việc cần làm](docs/ANALYSIS-GAPS-1.2.0.vi.md).

**Builder 1.2.0** phát hành thêm 15 companion, nâng catalogue lên **30 profile, đều ở companion 1.0.0**. Đợt mới sửa theo dõi unit trong màn chỉ số, RNG và chọn trên Map, cùng các bộ đọc riêng cho từng ROM. Mười lăm bộ đọc cũ được giữ nguyên. Xem [ghi chú phát hành và danh sách ROM](docs/RELEASE-1.2.0.md), gồm 10 Analysis còn khóa, giới hạn Pokemblem và phạm vi kiểm chứng.

Đợt cập nhật ngày **28/10/2026** giữ Builder **1.1.5** và phiên bản các companion:
đóng gói dự án Studio theo đúng ROM, chọn mẫu từ bộ đọc có sẵn và báo lỗi tham
chiếu trước khi xuất. Xem [ghi chú cập nhật](docs/AUTHORING-UPDATE-2026-10-28.md)
và [hướng dẫn dự án tùy chỉnh](docs/custom-projects.vi.md).

[Danh sách game được hỗ trợ](https://levi-soft.github.io/gba-duo-companion-builder/supported-games.html?lang=vi)
có trang riêng, hiển thị phiên bản companion và thông tin ROM chính xác. Danh sách
lấy từ cùng `site/profiles.js` mà Builder sử dụng; khi thêm profile, danh sách tự
cập nhật theo, không cần sửa nội dung màn hình chọn ROM.

[English](README.md)

Tạo companion từ ROM được hỗ trợ ngay trên máy của bạn. Website tạo ZIP để nhập thủ công; GBA Duo Plus có thể dùng cùng bộ tạo để tự tạo, cài và gán companion trong giả lập.

**Website:** [levi-soft.github.io/gba-duo-companion-builder](https://levi-soft.github.io/gba-duo-companion-builder/)

Đây là dự án do [levi-soft](https://github.com/levi-soft) duy trì. Tính năng tìm/tạo/cài tự động là **phần mở rộng riêng của GBA Duo Plus**, không phải tính năng của GBA Duo chính thức. Cách nhập ZIP thủ công vẫn được giữ. Khi bản chính thức hỗ trợ đầy đủ, Plus có thể thay phần tích hợp riêng, tiếp tục dùng định dạng catalog và companion này.

## Bản trước: Builder 1.1.5 — mười lăm companion ở 1.0.0

Đợt này chốt **Storge, The Hag in White, Sacred Echoes, Vision Quest và The Last Promise** lên companion **1.0.0**, cùng mười profile đã phát hành. Cả năm kế thừa UI tiếng Anh với Units, Map, Talk, Growth và Battle Analysis có điều kiện.

- **Storge:** bảng class mở rộng, font nhỏ riêng của ROM và sự kiện Talk theo chương.
- **The Hag in White:** Str/Mag riêng, Growth/Analysis tám chỉ số, skill gốc và chia nhỏ công việc Analysis để tránh treo.
- **Sacred Echoes:** đọc trang bị, phép/tầm đánh từ ROM, phép mất HP, đánh đôi cách nhau 2 AS, growth theo chế độ và tám nhóm vũ khí của engine.
- **Vision Quest:** sáu ô skill, Talk và tên/số chương từ ROM, kể cả chương phụ.
- **The Last Promise:** bảng FE7 chuyển địa chỉ, Talk, Preparations và giới hạn cấp 20/30 theo class.

Builder **1.1.5** được chốt riêng cho đợt phát hành này. Phiên bản companion độc lập; thêm hoặc sửa companion không tự tăng phiên bản Builder. Xem [phạm vi, kiểm chứng và giới hạn còn lại](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/RELEASE-1.1.5.md).

| Profile | Game code | CRC32 | Companion |
|---|---|---|---|
| FE7 Vietnamese | `AE7E` | `32CD990D` | 1.0.0 |
| FE6 Vietnamese | `BE8E` | `BD53D5F3` | 1.0.0 |
| FE8 Vietnamese | `BE8E` | `3CD932D7` | 1.0.0 |
| FE7 English | `AE7E` | `2A524221` | 1.0.0 |
| FE8 Europe | `BE8P` | `B3005195` | 1.0.0 |
| FE8 English - USA/Australia | `BE8E` | `A47246AE` | 1.0.0 |
| FE6 T-EN | `AFEJ` | `197DE10B` | 1.0.0 |
| Project Ember | `AFEJ` | `636F7B05` | 1.0.0 |
| Project Ember Reverse Recruitment | `AFEJ` | `29BC2257` | 1.0.0 |
| Void's Blitzarre Adventure | `BE8E` | `9D22107C` | 1.0.0 |
| Fire Emblem: Storge | `BE8E` | `079106D8` | 1.0.0 |
| The Hag in White | `BE8E` | `7479D7E2` | 1.0.0 |
| Fire Emblem: Sacred Echoes | `BE8E` | `13F15F23` | 1.0.0 |
| Fire Emblem: Vision Quest | `BE8E` | `2BCFEC83` | 1.0.0 |
| Fire Emblem: The Last Promise | `AE7E` | `D1C6E5D5` | 1.0.0 |

FE6 T-EN là FE6 gốc; FE6 Việt hóa Remastered là ROM hack trên nền FE8. ROM khác hoặc bản vá khác cần profile riêng. Các profile tiếng Anh dùng UI, Growth và Analysis tiếng Anh. Void hỗ trợ sáu ô skill và Talk; lớp phủ phạm vi trên Map hiện chưa tính skill thay đổi tầm/di chuyển. Xem [phạm vi và kiểm chứng](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/RELEASE-1.1.5.md).

## Dùng website

Với companion đã chỉnh sửa hoặc game ngoài danh mục, bật **Dùng dự án Studio
của tôi** và chọn JSON đã lưu cùng đúng ROM. Builder có thể giữ giao diện cũ
hoặc dựng thẻ nhân vật/bảng chỉ số bằng các trường của bộ đọc có sẵn; nhãn được
nhập bằng tiếng Việt. Tính năng này không tự tạo bộ đọc cho game mới. Xem
[hướng dẫn dự án tùy chỉnh và chọn mẫu](docs/custom-projects.vi.md).

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

## Danh sách ROM

Mười lăm profile và CRC32 được liệt kê ở trên và trên [trang game hỗ trợ](https://levi-soft.github.io/gba-duo-companion-builder/supported-games.html?lang=vi).

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

`site/` chứa website tĩnh. Build tạo `site/catalog.json` và bundle theo nội dung `site/releases/builder-1.1.5-<sha256>.zip` từ mã trong `site/`, không đọc ROM hay sửa các gói 0.9.6 đã chốt trước đây.

Kiểm tra tự động bao gồm hash catalog, phiên bản ROM, nguồn asset cục bộ, template không chứa dữ liệu game đã xuất, đóng ZIP format 2 với dữ liệu giả lập phục vụ kiểm thử, hủy tác vụ và truyền ZIP theo khối. Các kiểm tra này không thay thế việc thử chọn tệp trên trình duyệt và chạy Plus trên máy thật.

Mã Lua dễ đọc nằm trong `runtime/<profile>/` và `runtime/shared/`. Bắt đầu từ `main.lua` của profile; không chỉnh trực tiếp chuỗi Lua trong JavaScript được sinh ra. Xem [cấu trúc Lua và cách đối chiếu](docs/runtime-modules.vi.md). Cả `npm test` và `npm run build` đều tạo lại bộ module từ các file nguồn này.

## Đưa lên GitHub Pages

Build và chạy kiểm tra, sau đó đưa **nội dung bên trong** `site/` lên thư mục gốc của nhánh `gh-pages`. Trong Settings → Pages, chọn **Deploy from a branch**, nhánh `gh-pages`, thư mục `/ (root)`. Đã có `.nojekyll`. Nhánh `main` giữ mã nguồn. Cách này không cần token có quyền tạo workflow Actions.

Có thêm [workflow mẫu](docs/examples/pages.yml) nếu muốn chuyển sang GitHub Actions sau này. Hướng dẫn chính thức: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Nguồn gốc và tri ân

Cảm ơn **[khumam](https://github.com/khumam)**, tác giả **[GBA Duo](https://github.com/khumam/gba-duo)**, đã xây dựng giả lập, ý tưởng companion hai màn hình và định dạng companion. [GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) phát triển từ nền đó; [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio) cung cấp công cụ thiết kế và compiler dùng tại đây.

Nguồn ban đầu chỉ lấy từ **Public Kit 0.9.6** đã kiểm tra; checksum ở [SOURCE.json](SOURCE.json). Repo không chứa ROM, bộ ảnh nhân vật/sprite đã trích xuất, bảng text game, save hoặc Local ZIP đã tạo. Game và asset Fire Emblem thuộc các chủ sở hữu tương ứng. Công cụ độc lập này không cấp quyền chia sẻ ROM hay asset game vừa tạo.

Mã nguồn theo [GPL v3](LICENSE). Xem [CREDITS.md](CREDITS.md), `site/THIRD-PARTY` và giấy phép JSZip/icon/font đi kèm.
