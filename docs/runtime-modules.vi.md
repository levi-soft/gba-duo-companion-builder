# Tổ chức Lua thành module dễ đọc

[English](runtime-modules.md)

Builder tách phần logic do người phát triển viết khỏi bảng dữ liệu được tạo từ ROM của người chơi. Ba profile FE7 Việt hóa, FE6 Remastered và FE8 Việt hóa dùng chung cách đóng gói; địa chỉ RAM và công thức riêng của từng game vẫn được giữ riêng.

## Chỉnh code ở đâu

`runtime/<profile>/` chứa các file Lua nguồn dễ đọc. `runtime/shared/` chứa những hàm và phần trình bày thực sự dùng chung. `main.lua` của mỗi profile thể hiện thứ tự xử lý: đọc game, áp dụng tính năng, rồi chuẩn bị dữ liệu hiển thị. Module nhận dependency rõ ràng; bộ đếm và cache nằm trong closure riêng của phiên Lua. Không còn cách nối tiếp nhiều lớp thay thế hàm `update()` cũ.

| Module | Nhiệm vụ |
| --- | --- |
| `game.profile.lua` | Đặt tên các địa chỉ và cấu trúc của game |
| `game.units.lua` | Chọn đúng unit đang trỏ/khóa và điều phối đọc dữ liệu |
| `game.items.lua` | Trang bị đang dùng, rescue và chỉ số giao chiến |
| `game.battle.lua` | Dữ liệu Battle Forecast |
| `game.map.lua` | Bản đồ, danh sách unit và vùng di chuyển/nguy hiểm |
| `game.bindings.lua` | Các công thức chuyển dữ liệu game sang trường hiển thị |
| `features.growth.lua` | Growth và trần chỉ số, tùy profile |
| `features.analysis.lua`, `features.exp.lua`, `features.level_prediction.lua` | EXP theo điều kiện và phân tích lên cấp |
| `presentation.*.lua` | Giá trị mặc định và trình bày Inventory/Growth/Phân tích |
| `data.rom_tables.lua` | Bảng dữ liệu tự sinh từ ROM, không phải logic viết tay |

Danh sách file có thể khác giữa các profile. FE6 Remastered vẫn giữ Mag và skill riêng. Chỉ chia sẻ thuật toán khi hành vi đã tương đương; không đem công thức FE7 áp thay cho công thức của mod.

## File tự sinh và cách giả lập nạp module

Sau khi sửa Lua nguồn, chạy `node scripts/build-runtime-modules.mjs`. Lệnh này tạo lại `site/runtime-modules.js` và các file entry point nhỏ trong thư mục profile. File JavaScript là bản đóng gói để phân phối; hãy sửa Lua nguồn, không sửa chuỗi Lua escape trong registry hay `template.js`.

Khi chuẩn bị ROM trên máy người chơi, `CompanionRuntime.install()` đóng gói module và ghi `data.rom_tables.lua` bằng bảng dữ liệu đã được trích xuất. Nội dung chuỗi và kiểu key số/chuỗi được giữ nguyên. Dữ liệu tự sinh được xuống dòng riêng để không làm rối entry point. Manifest trỏ tới `main.lua`.

Loader gốc của GBA Duo dùng tên file phẳng có dấu chấm:

```lua
local profile = pack.require("game.profile")
local read = pack.require("game.units")(D, map, values, abilities)
```

Hai lệnh này nạp **`game.profile.lua` và `game.units.lua` ở gốc ZIP**, không phải các file bên trong thư mục `game/`. `pack.require` cache module trong một phiên Lua; lời gọi factory tạo bộ đọc có trạng thái riêng. Pack vẫn là companion format 2 thông thường, không cần API giả lập mới.

## Kiểm tra

```sh
npm ci
node scripts/build-runtime-modules.mjs
npm run build
npm test
```

Wasmoon là dependency phát triển được ghim phiên bản, chỉ dùng trong kiểm tra Node. WASM của nó không được đưa vào website hoặc ZIP builder tải xuống. Các bài kiểm tra xác nhận trạng thái module không bị dùng lẫn, cách nạp tương thích native, đọc đúng byte nhị phân và chạy nhiều tick mà không làm đầy stack của công cụ kiểm tra.

Kiểm tra đối chiếu ROM thật dùng **fixture riêng trên máy**, không đưa dữ liệu đó lên repository:

```sh
node scripts/runtime-validation.mjs reports/local-runtime-config.json --baseline
node scripts/runtime-validation.mjs reports/local-runtime-config.json
```

Xem [mẫu config trong tài liệu tiếng Anh](runtime-modules.md#checks). Đường dẫn tính từ thư mục chứa config. Khai báo `project` cũ, ROM, bản chụp RAM và các thao tác `cases/steps` cho từng profile. Có thể thêm `candidate` là dự án mới được tạo thật để kiểm cả luồng chuẩn bị ROM; nếu bỏ trống, công cụ dùng packager hiện tại với nguyên bảng dữ liệu cũ. Thêm `zip` để đối chiếu manifest và từng file Lua trong ZIP đã xuất với project, rồi thực thi Lua được đọc trực tiếp từ ZIP đó.

Bản chụp RAM có dạng `{ "ranges": [{ "address": 33554432, "base64": "..." }] }`, hoặc nằm trong thuộc tính `result`. Có thể dùng các file nhị phân qua `ranges: [{address, file}]`. Mỗi bước hỗ trợ `patches: [{address, bytes}]` để sửa bản sao RAM, `focusUnit` để gọi thao tác chọn unit trên Map, và `expect: {field: value}` để kiểm tra đã thực sự đến trạng thái cần thử. `requiredCalls: ["focusUnit:1"]` của một case xác nhận có phát lệnh điều khiển tương ứng.

Giữ riêng ROM, bản chụp RAM, project đã chuẩn bị, asset game và báo cáo đầy đủ. Thư mục `reports/` đã bị loại khỏi Git, phù hợp để lưu config/bằng chứng cục bộ. Công cụ chỉ dùng bản sao buffer, không cung cấp API ghi RAM game.

## Bằng chứng và giới hạn

Đối chiếu cục bộ đã thực hiện trên cả ba profile. Mỗi profile so sánh toàn bộ trường trả về và các lệnh input/log trong chuỗi 106 tick: EXP gần lên cấp, phân tích hoàn tất, chọn unit trên Map và chuyển Units/Map/Growth. Chuỗi khác gồm chín tick thoát rồi vào lại Forecast. Có kiểm tra rõ phân tích khả dụng/hoàn tất, phát lệnh chọn unit, trạng thái Forecast và RAM fixture không bị sửa: **tổng cộng 345 tick được đối chiếu**.

Kết quả xác nhận hành vi tương đương trong các trạng thái đã chụp, không bảo đảm mọi chapter, skill hoặc trang bị. Engine Lua cục bộ không đo được instruction budget của Android, thời gian khung hình, áp lực cache hay bố cục hiển thị cuối cùng; các phần đó cần kiểm tra native/thiết bị riêng. Đợt này cải thiện tổ chức code, chưa tuyên bố tăng tốc chạy.

### Kiểm tra native độc lập trên Thor (24/10/2026)

Chương trình kiểm thử Lua ARM trên Thor đã chạy cả bản cũ và bản chia module với cùng ROM/RAM sao chép. Nó dùng bộ nạp `pack.require` và ngân sách script native, chạy thành tiến trình riêng với giả lập đang chơi. Không cập nhật APK, thay trạng thái game hay sửa save.

Cả ba profile đều qua bốn tình huống (phân tích gần lên cấp hoàn tất, Units, Map và Growth), chạy cho cả code cũ/mới: **24 lượt thành công / 708 lần cập nhật**. Giá trị cuối mỗi cặp cũ/mới khớp nhau; phân tích khả dụng/hoàn tất được xác nhận và RAM kiểm thử giữ nguyên trong mọi lượt.

| Profile chia module | Lần cập nhật lâu nhất ghi nhận | Ngân sách cập nhật cao nhất |
| --- | ---: | ---: |
| FE7 Việt hóa | 2,803 ms | 189.600 |
| FE6 Remastered | 5,845 ms | 397.786 |
| FE8 Việt hóa | 3,089 ms | 377.186 |

Không có lỗi vượt ngân sách nạp hay cập nhật. Đây là số đo trên trạng thái chụp trong chương trình kiểm thử độc lập, chưa phải phép đo FPS hoặc xác nhận giao diện Android đã hiển thị đúng. Phát input native, chơi trực tiếp và hiển thị vẫn cần kiểm tra riêng.
