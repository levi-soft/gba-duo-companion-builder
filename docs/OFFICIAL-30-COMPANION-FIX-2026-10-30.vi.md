# Sửa chung 30 companion — phạm vi kiểm chứng

**Phát hành lại ngày 31/10/2026 theo yêu cầu chủ dự án:** Builder **1.2.0**,
cả 30 companion **1.0.0**. Xem [ghi chú phát hành hiện tại](RELEASE-1.2.0.md).
Yêu cầu phát hành không xác lập nghiệm thu đầy đủ 30/30 trên Android; gate bộ
test riêng vẫn giữ nguyên các cờ chưa nghiệm thu và những vấn đề mở.

Runtime dùng format 2 và API native D-pad có sẵn trên Plus 0.1.8-plus.4, với
Packs can change games tắt; không thay APK, không ghi RAM để ép chọn unit.
Growth giữ PNG, chỉ hiển thị bonus có dấu trong danh sách tỷ lệ bên trái.
Đã bỏ node thông báo phía trên tên chương ở cả 30 layout. Trên Thor, Maiden
đã được thử chạm unit ở danh sách và Map bằng pack thường, không phải probe:
con trỏ/camera/HUD tới đúng đích, không gửi A, unit/HP/vật phẩm giữ nguyên.
Hai trace mới và ảnh trước/trong/sau thao tác xác nhận tên chương và Map giữ
vị trí. Save hiện tại và native Slot8 của người dùng đã được khôi phục, kiểm hash.

Runtime đã qua **578/578 kiểm tra tự động**, kiểm ZIP/Lua/layout/ảnh/bảng của
30 pack và đối chiếu 17 trường native/profile với JVM cho đủ 30 ROM. Những
kiểm tra này không thay thế việc chạm thử mọi tính năng của 30 pack trên máy.

**Vẫn còn mở:** timeout update 25 ms; native focus không nhận ally Storge
85–99; GBA Duo gốc v0.1.8 không có API focus; lần dữ liệu trống trước đó trên
host gốc chưa xác định nguyên nhân. Vòng sửa dòng log mới chỉ kiểm hai thao
tác Maiden; các cửa sổ health 20 giây của bundle trước là lịch sử, không phải
phép đo mới. Chưa nghiệm thu đầy đủ mọi game, chương, skill và bố cục máy.

## Hồ sơ các vòng sửa trước

Các trạng thái chưa phát hành, số test và kết quả dưới đây thuộc từng vòng
lịch sử. Báo cáo nghiệm thu trên host Plus đã sửa nằm ở
[hồ sơ cũ](FULL-FE-RECHECK-2026-10-30.vi.md).

> **R2 bị bác bỏ theo kiểm tra của người dùng:** bấm unit trên Map phải di chuyển
> con trỏ thật trong game. R2 chỉ đổi unit trong companion, nên các pass dựa trên
> `mapPickedId`/deployment hoặc ảnh companion chưa đáp ứng yêu cầu. Ảnh game còn
> Orion khi companion đã đổi sang Bandit là bằng chứng lỗi, không phải pass.
> Tiêu chí đúng là tọa độ, con trỏ hiển thị, camera và HUD game cùng theo unit đích
> sau frame game. R4 dùng D-pad của Plus hiện có để đạt tiêu chí này.

Đợt sửa này thay kết luận nghiệm thu bằng host Plus đã sửa. Toàn bộ 30 pack giữ
version 1.0.0 và match game code/CRC32 của ROM gốc đã chuẩn bị. Chưa phát hành lại.

## R2: sửa đường chọn unit trên Map

Người dùng tái hiện lỗi ở Maiden sau bộ test 4b5. Dữ liệu chụp từ đúng phiên lỗi
ghi `game.companion-selection:27: attempt to index a nil value (field 'chars')`.
Reader chọn unit đã dùng nhầm `D.chars/classes`; Maiden, FE7 English, FE7
Vietnamese và The Last Promise thực tế lưu chúng trong `D.mapMeta`. Ngoài lỗi đó,
template ô bản đồ cũ chưa có đường nhận chạm. Các kiểm tra trước chưa phủ đầy đủ
hai trường hợp này; kết quả C162 cũ không chứng minh thao tác bấm Android đạt.

R2 dùng metadata đúng cấu trúc và lớp nhận chạm chỉ tại các ô có unit hợp lệ.
Terrain và lớp nhận chạm dùng chung khung. Action trả về `set` chính thức, reader
kiểm tra lại unit/context với RAM mới; không gửi input game hoặc ghi RAM. Nút
Continue cho công việc tự động chỉ hiện khi đã hết lượt tự tiếp tục; nút khôi phục
lỗi script vẫn được giữ. Không sửa APK Plus, APK GBA Duo chính thức hoặc mã nguồn Studio.

Builder R2: `5e9649a9d82e008220ee1eb6a005477bba20c44d49f3308cc12284e1c2a0718d`.
Full check **454/454**, tập kiểm tra chọn unit/Map **82/82**. Replay dữ liệu nguyên
bản của các profile tái hiện đúng bốn pack lỗi với runtime cũ. Trên RAM chụp từ
phiên lỗi của người dùng, bảy ca C mới của Maiden đạt; thêm **1.184 updates** trong
cùng Lua VM kiểm chuỗi đổi tab/unit và slot item trống đạt. Đây là kiểm sandbox C
trên PC, không phải 30 pack R2 đã chạy lại C hoặc đã được bấm thử trên Android.

Maiden pack thường đã được bấm trên APK official v0.1.8 nguyên bản, Thor
1240×1080: roster Francine → Units 32/32; marker Dolom → 25/25; marker đồng minh
Ernterre → 22/22; Bandit ở mép trái → 20/20. Bấm ô trống giữ Bandit đang xem.
Danger ON tự tính xong. Các lượt này không hiện Continue. Pack chẩn đoán được kiểm
riêng, không nằm trong bộ test giao cho người dùng.

**Chưa đạt nghiệm thu cuối:** một lượt đổi tab/bấm liên tiếp trước đó mất toàn bộ
dữ liệu và hiện Continue; chưa lấy được `_scriptError` của lượt đó. Chuỗi chẩn đoán
không tái hiện lại không chứng minh đã sửa nguyên nhân. Không kết luận 30/30 pack
đã được kiểm giao diện Android, không phát hành lại từ kết quả này.

Artifact R2 và ảnh/trace giữ riêng tại `reports/maiden-map-fix-20261030/`.
Đã giao bộ test cục bộ mới `Downloads/GBA-Duo-30-Packs-Official-Test-2026-10-30-R2`
và ZIP cùng tên, SHA256
`2d8978c699a006dd6c192ac7bf3fd3309111b5fe9eb44e5a7736ad6cde54f7ef`.
Manifest ghi rõ `localTestOnly=true`, `releaseReady=false`, vấn đề Android còn mở.
Maiden ZIP giữ đúng nội dung pilot đã bấm thử, SHA256
`bd4b51d301a08f29ee940b89dd7bd074a9858f2c2def88a92c729ce0e6c5426e`.
Khi thay pack đang chạy, import ZIP riêng rồi thoát và mở lại ROM để nạp runtime mới.

## Cách hoạt động chung

- Growth giữ radar PNG của tỷ lệ gốc. Bảng ghi tỷ lệ gốc và chênh lệch đã tính,
  chẳng hạn `60% (+1%)`, `60% (-5%)`; không ghi `(+0%)`. Số hiệu lực dùng trong
  tính toán và trần chỉ số vẫn theo từng ROM. Khi chưa có kết quả, không giả bonus 0.
- Một formatter chạy sau reader/tính toán của cả 30 profile, bao gồm FE7 Afa,
  engine 7 chỉ số, split Str/Mag 8 chỉ số và class growth của Pokemblem.
- Chọn unit trên Map phải đưa con trỏ game tới unit đó và đồng bộ companion.
  R2 chỉ đổi unit trong companion và đã bị bác bỏ. Bản sửa mới phải kiểm tra lại
  trạng thái map ngay khi bấm, tôn trọng R/Preparations/Forecast/menu/event,
  và dùng native D-pad của Plus hiện có; không ghi tọa độ/bookkeeping bằng Lua.
  Không tự bấm A hoặc di chuyển unit trên bản đồ.
- Các job chia nhỏ tiếp tục khi pause qua `ui.set` chính thức, có giới hạn và nút
  tiếp tục. Các reader dùng snapshot bất biến chung trong một update khi hỗ trợ
  API đó; snapshot riêng của FE6 Remastered giữ nguyên giao diện hàm cũ.
- Không yêu cầu `gfx.radar`, `mem.busContext` hoặc `input.focusUnit`. Format của
  bộ pack hiện tại là 2, không có private host requirements. Các nhánh native từng
  phụ thuộc BIOS có điều kiện tương đương đã được kiểm chứng theo đúng ROM/caller;
  không thay BIOS latch bằng hằng số đoán và không bỏ cap hợp lệ.

## Bằng chứng bộ 4b5 trước R2 và giới hạn

Builder đóng băng: `4b5e4e0026ebe53f511c05ef400908a99860ee210e75a5a07adbc1652d273fe5`.
Build và toàn bộ **444 test** đạt ở mốc c135; thay đổi sau đó chỉ là lớp hiển thị
và vị trí nút Tiếp tục: **9 test UI** đạt ở mốc 9e7, **5 test liên quan** đạt ở
mốc 4b5. Tập Lua/bảng dữ liệu của cả 30 pack giữ nguyên. Đối chiếu 4b5 với 9e7
xác nhận 36.357 file giữ nguyên byte, gồm đủ 35.188 asset. Chỉ CSS vị trí nút và
hai bản sao CSS trong metadata Studio đổi; palette giữ nguyên.

Sandbox C nguyên bản của official v0.1.8 chạy **162 ca / 30 pack**: 87 ca cho 15
pack cũ, 70 ca cho 14 pack mới và 5 ca Pokemblem mới nhất. Không lỗi load/warm/tick,
không ghi RAM, không còn job chờ; đủ các tỷ lệ số khi mở Growth. Tick lớn nhất đo
được 8,125 ms; số này không gồm warm-up hoặc render Android. Các ca dùng ROM/RAM
đã chụp; ca gần lên cấp của nhóm mới dùng EXP 99 tổng hợp có ghi rõ trong báo cáo.
Đây không phải 30/30 lượt chơi hoặc nghiệm thu giao diện Android.

Gate C: `reports/official-compat-audit-20261030/FINAL-C-GATE30.json`, SHA256
`87cce24900409dfd66c56d2b07c4795a4320eae85c890b50c69d7fec632a3448`.

Official APK dùng để kiểm tra giao diện là `gbaduo-v0.1.8.apk`, SHA256
`21fe50fd318b115519e1c95727b5dd0be2883215a23c9810c44d2f94dbd51d9c`, nguyên bản.
Các ứng dụng Plus/SS của người dùng không được cập nhật trong đợt sửa này.

Trên Thor 1240×1080, đã nhìn trực tiếp mô tả Leer đủ câu cuối, Chlorophyll có
nhãn `[Lock] [Grass]` thay ký tự font ROM, và hàng sáu skill nằm trên một dòng.
Heading/thông số cố định, mô tả dài có vùng cuộn riêng trong card. Chưa thực hiện
thao tác cuộn một đoạn dài vượt vùng nhìn nên không gọi đó là ca cuộn đã đạt.
Ảnh Growth trước đó hiển thị đủ tám dòng tỷ lệ gốc/bonus/cap khi game pause.

Đã kiểm riêng nhánh khôi phục bằng pack chẩn đoán cố ý gây một lỗi trước update.
Nút Tiếp tục dùng nguyên callback và vị trí của 4b5, hiện trên modal, cách vùng
điều hướng Android; chạm tâm nút khôi phục đủ tám dòng/cap/PNG trong lúc pause.
Sau đó đã gỡ probe và nạp lại đúng pack thường, kiểm lại Leer, Chlorophyll và
Growth. Probe không nằm trong bộ giao. Ảnh đã được soát độc lập.

Một lần Growth trống tự phát trước đó chưa tái hiện và chưa rõ nguyên nhân.
Probe khôi phục đạt không chứng minh đã sửa nguyên nhân lần đó. Chưa kiểm cuộn
thủ công một mô tả vượt vùng nhìn hoặc thử toàn bộ 30 game trên APK Android.
Các bộ ZIP c47/c135/9e7 giữ làm lịch sử, không phải bộ giao cuối.

Bằng chứng riêng, giữ ngoài Git: `reports/official-compat-audit-20261030/` và
`reports/full-recheck-20261029/official-30-packaging/`. Báo cáo chứa SHA từng pack,
Lua, bảng ROM, ảnh và nguồn capture. Bộ ZIP cho người dùng chỉ chứa companion,
manifest và hướng dẫn; không kèm ROM hay APK. Không đưa tài nguyên từ ROM lên GitHub.
