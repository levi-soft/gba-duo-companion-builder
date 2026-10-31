# 15 companion Fire Emblem mới — phát hành 1.0.0

> Hồ sơ của bản 1.2.0 đã gỡ. Xem [triển khai và nghiệm thu hiện tại](FULL-FE-RECHECK-2026-10-30.vi.md).

**Đính chính:** kết luận hoàn tất trước đây quá rộng. Mười bản chưa có Analysis
hoạt động; năm bản chỉ có ca kiểm chứng Analysis có điều kiện. Chưa nghiệm thu
đầy đủ thao tác companion trong app trên thiết bị thật cho cả 15 game. Xem
[phần còn thiếu và công việc cần làm](ANALYSIS-GAPS-1.2.0.vi.md).

Đợt ngày 29/10/2026 thêm 15 profile ROM chính xác, nâng danh sách trong mã nguồn
lên 30. Đã phát hành **15 bản mới ở 1.0.0**, đi cùng **Builder 1.2.0**;
yêu cầu phát hành không phải nghiệm thu đầy đủ tính năng hoặc thiết bị.
Đã kiểm lại lỗi theo dõi unit trong màn chỉ số R/Down/B ở 14 game; Pokemblem
giữ cơ chế chọn riêng. Mười lăm companion đã phát hành giữ phiên bản và mã Lua cũ.
Xem [ghi chú phát hành 1.2.0](RELEASE-1.2.0.md). Phiên bản 1.0.0 giữ nguyên các
giới hạn Analysis và phạm vi kiểm chứng ghi bên dưới.
Đợt này không thay APK Plus hoặc PC Studio, không khôi phục Studio Editor đã hủy.

## Danh sách và phạm vi

Tất cả có bộ đọc nhân vật, hình lấy cục bộ từ ROM, Map, Growth và luồng Talk
theo dữ liệu game. Số chỉ số ghi dưới đây là số trục chính của Growth; một số
game có thêm Con/Mov/PCC được giải thích riêng. UI dùng tiếng Anh như nhóm
companion tiếng Anh đã có.

| Companion | Game code / CRC32 | Trục chính | Conditional Analysis |
|---|---|---|---|
| Andaron Saga | `BE8E / A3B9CD19` | 8, Str/Mag riêng | Chưa bật |
| Bells of Byelen | `BE8E / 48B996CD` | 7, thêm Con/Mov | Chưa bật |
| Cerulean Crescent | `BE8E / DC071CC2` | 7 | Chưa bật |
| Dark Lord and the Maiden of Light | `AE7E / C99A6D26` | 7 | Đã kiểm tra có điều kiện |
| Dream of Five Definitive Edition | `BE8E / B313A6F5` | 7 | Đã kiểm tra có điều kiện |
| Eligor's Spear | `BE8E / 6E5FE3B0` | 7 | Đã kiểm tra có điều kiện |
| Iron Emblem | `BE8E / 141FF3AA` | 7 | Đã kiểm tra có điều kiện |
| Justice & Pride | `BE8E / AC23B461` | 7, Pow dùng chung | Chưa bật |
| Pokemblem | `BE8E / 10BDF112` | 8, nhân vật + loài | Chưa bật |
| The Dark Amulet | `BE8E / 8537CE2A` | 8, Str/Mag riêng | Chưa bật |
| The Four Kings | `BE8E / 0DDE5BEB` | 7 | Chưa bật |
| The Lonely Mirror | `BE8E / A74E93C7` | 7 | Đã kiểm tra có điều kiện |
| The Morrow's Golden Country | `BE8E / 20287E1B` | 8, Str/Mag riêng | Chưa bật |
| The Shadow of Dawn | `BE8E / EB38F5F7` | 8, Str/Mag riêng | Chưa bật |
| The Sun God's Wrath | `BE8E / 566D7A9E` | 7, thêm Con/Mov | Chưa bật |

Chỉ ROM khớp cả game code và CRC32 được nhận. Cùng tên game, bản cập nhật,
reverse recruitment, 0%/100% growth hoặc bản vá khác cần profile riêng.

## Những phần đã xử lý theo từng ROM

- Andaron: bảng 254 class, Str/Mag, skill và Leadership từ bảng thực của ROM.
  Leadership của Jakka/Baudimon đã đối chiếu 2/3 sao trên màn chỉ số gốc.
- Dark Amulet và Shadow: 254 class, tám chỉ số, skill và giới hạn cấp riêng.
  Các chỉ số xanh do trang bị không được đánh đồng với giá trị RAM nền.
- Justice: giữ Pow chung; không áp cấu trúc Str/Mag của Dark Amulet.
- Dark Lord: dùng FE7, 69 bản ghi chương hợp lệ và tên avatar có thể nằm trong RAM.
- Four Kings: dùng bộ lấy skill đang được màn chỉ số gọi, không dùng bản cũ còn
  nhúng trong ROM. Các bảng affinity/support của những game có sửa được đọc riêng.
- Bells và Sun: có Con/Mov growth riêng, không gán cơ chế fixed growth của một
  SkillSystem khác chỉ vì cùng nền FE8. Radar chính vẫn có bảy trục.
- Morrow: Str/Mag và các bảng riêng được đối chiếu binary; địa chỉ trong source
  công khai không được coi là trùng với ROM người dùng.
- Pokemblem: chọn thông tin Pokémon theo party/chế độ thực của game, hỗ trợ
  chọn chi tiết trong companion bằng dữ liệu đọc, không gửi lệnh di chuyển game.
  Đã bỏ `cursorNavigation` và thao tác chạm điều khiển con trỏ FE8 thông thường.
  1.634 radar biểu diễn đúng tổ hợp growth nhân vật + loài, ở 240×247 pixel.
  Bản dựng đo được khoảng 39,1 MB ZIP và 57,0 MB project JSON; giới hạn nhập
  JSON của Builder là 64 MiB. Tỷ lệ của 15 bản cũ giữ nguyên.

Growth ghi rõ khi chỉ hiển thị tỷ lệ nền từ ROM, chưa cộng skill/vật phẩm.
Phạm vi Map dùng nền di chuyển/tầm vũ khí; skill hoặc hệ thống đi tự do có thể
cần logic riêng. Không tự khẳng định hỗ trợ toàn bộ cơ chế của mọi bản hack.

## Các lỗi đã sửa trong đợt rà soát sâu

- Đọc tên avatar từ RAM và làm mới tên trong các nơi giữ tham chiếu/cache;
  không giải mã địa chỉ RAM thành game text trong ROM. Riêng lỗi Talk của
  Dark Lord là phòng ngừa: tập event hiện tại không có đích avatar đó.
- Đọc đúng bảng affinity của Cerulean/Sun và EXP level sau promotion của
  Bells/Cerulean/Morrow. Giới hạn HP căn cứ đường lên cấp đang chạy, không
  suy từ byte class hay một hàm clamp không đúng ABI.
- Sửa ID class, điều kiện và tỷ lệ skill riêng của Iron/Dream/Lonely.
  Vũ khí cấm đánh bồi trong Eligor/Lonely được áp dụng cho cả hai bên,
  nhãn sát thương, hệ số và HP dự kiến; Brave vẫn giữ cặp đánh ban đầu.
  Hút HP được đọc từ effect của vũ khí, không gán nhầm theo ID retail.
- Pokemblem hiển thị năm chiêu đang lưu thay cho rank vũ khí FE. Cờ Held
  được tách khỏi số lần dùng: Berry đang giữ hiện `10/10`, không còn `138/10`.
  Chọn unit trên Map vẫn hoạt động khi con trỏ game ở ô trống.
  Icon loại chiêu trong font gốc được đổi thành nhãn `Physical:`/`Special:`;
  không còn hiện thành ký tự lạ trong mô tả.
  Overlay tầm di chuyển/tấn công/nguy hiểm chưa tính hệ thống chiêu được
  tắt rõ ràng; bản đồ vẫn hiển thị vị trí và cho chọn xem thông tin.
- Sửa tên bị các ô skill che, bổ sung icon Leadership lấy từ đúng ROM
  Andaron, giữ lại nút đóng/Analysis và các radar còn được tham chiếu.
- Mười profile chưa bật Analysis báo lý do ngay khi mở popup. Đóng popup,
  đổi lựa chọn hoặc ô trống không được giữ kết quả EXP/tăng chỉ số cũ.
- Rà soát lần hai sửa đèn RNG luôn tắt ở năm profile custom và chưa theo dõi
  trước forecast đầu tiên ở Dark Lord. Mốc RNG độc lập với chọn unit, Map,
  Growth và khả năng dự đoán; mở Analysis trong Forecast ghi nhận mốc mới.
  Đèn là chỉ báo trạng thái; chạm portrait mở Growth.
  Bộ đọc này chỉ quan sát ba giá trị RN, không thay đổi seed hay bật Analysis.
- Dark Lord giữ lệnh xóa lựa chọn Map cũ khi làm mới túi đồ sau khi đổi unit;
  bước reset kế thừa trước đó làm mất lệnh này trong một nhịp cập nhật.
- Pokemblem dùng tên loài hiện tại trên danh sách Map thay cho mã slot `P-01`;
  tên avatar và ID chọn unit giữ nguyên. Tên thay theo loài khi tiến hóa/đổi class.
- Màn chỉ số native có con trỏ unit riêng: đổi người bằng Down không đổi con trỏ
  Map. Mười bốn bản mới đọc đúng con trỏ này, không giữ người cũ. Con trỏ không
  hợp lệ hoặc unit chết được xóa; luật chọn quân trong Preparations giữ nguyên.

Template hoàn chỉnh và mã Lua của 15 companion cũ được đối chiếu với
commit gốc và giữ nguyên. Thay đổi bố trí tiêu đề chỉ áp dụng cho 15 bản mới.
Thanh HP trong Forecast cộng các đòn thông thường; trượt, crit, proc, thứ tự
lượt và hiệu ứng đặc biệt có thể làm kết quả trận thật khác đi.

## Vì sao một số Analysis chưa bật

Năm profile được kiểm tra chạy hàm native của đúng ROM trên bản sao RAM, với
battle buffers được hàm forecast native dựng, ở ca thường và gần lên cấp.
Các ca này cũng đã chạy qua Lua native riêng trên Android, không ghi RAM game.
Đây là dự đoán có điều kiện, không phải bảo đảm kết quả mọi trận đấu.

Andaron, Justice, Dark Amulet, Shadow và Four Kings có đường native đọc vùng
BIOS được bảo vệ mà bộ thực thi frozen RAM/ROM hiện chưa mô hình hóa được.
Điều này **không kết luận ROM bị hỏng**. Bản thử không đoán giá trị BIOS hoặc
bỏ qua hook để tạo EXP/tăng chỉ số giả; popup trả lý do chưa hỗ trợ.

Năm game custom còn lại có thay đổi sâu về combat/growth/move/capture nên
Analysis cũng được khóa rõ cho đến khi có bằng chứng riêng. Các trang đọc
nhân vật, skill và Growth không phụ thuộc vào việc bật Analysis.

## Kiểm chứng và sử dụng

- Bộ mã cuối qua 193/193 ca Builder và 7/7 ca trao đổi Builder/Studio.
  Cả 15 ZIP qua nhập → xuất → mở lại bằng API thật của Studio, giữ nguyên
  Lua và tài nguyên. CRC của 20.796 PNG và 18.913 tham chiếu asset đều hợp lệ.
- Android trên host qua 62 phương thức kiểm tra: 60 ảnh của bốn màn cho
  đủ 15 game, một ca dùng bộ cài thật cho 15 ZIP và một ca chạm chiêu Tackle.
  Ảnh đã được xem lại ở tỷ lệ màn dưới Thor; đây chưa phải nghiệm thu thao
  tác companion trong app trên thiết bị thật.
- Năm profile có Analysis chạy lại tổng cộng 2.000 cập nhật Lua native trên
  Thor bằng fixture gần lên cấp, chỉ đọc RAM. ZIP nguồn của từng ca được
  ghi SHA-256 trong manifest của bộ bàn giao.
- Đã dựng ZIP thật từ đúng 15 ROM; gói chứa PNG/font và Lua theo định dạng
  companion hiện có. Không cần API hay widget chỉ Plus mới đọc được.
- Các game đã được khởi động riêng bằng mGBA của romdev; Lua xuất từ bộ tạo
  được đối chiếu dữ liệu unit với các bản chụp EWRAM/IWRAM thật. Có thêm kiểm
  tra đổi lựa chọn/ô trống; phân biệt trường hợp input thật và fixture cô lập.
- Rà soát chọn unit/RNG dùng bộ điều hướng Kotlin thật của Plus nối với ROM
  đang chạy: 29 lượt tới đúng unit người chơi/địch/đồng minh; cả 14 ROM hỗ trợ
  điều hướng khóa đúng unit sau nút A, giữ nguyên khi preview và từ chối đổi
  mục tiêu lúc game bận. Pokemblem không bật điều hướng game.
  Thêm 31 ca Android trên host: 15 thao tác chạm Map, 15 đèn RNG và một ca
  cài đủ 15 ZIP. Thay RN trong bản sao RAM được ghi rõ là fixture cô lập;
  kiểm tra này chưa thay cho thao tác trên app thật ở Thor.
- Ca Analysis đã nêu là fixture native có điều kiện; kiểm tra Lua Android
  riêng không thay cho chụp giao diện companion trên thiết bị.
- Chưa kiểm chứng toàn chiến dịch, mọi skill/trang bị/mode, hoặc thao tác
  companion thực tế trên cả GBA Duo chính thức và Plus cho đủ 15 game.
- ROM, save, bản chụp RAM, ảnh/game text đã trích, project JSON và Local ZIP
  được giữ trong workspace riêng. Kho công khai chỉ có mã adapter, UI và metadata.

Nhập Local ZIP qua menu Companion, gán cho ROM khớp, rồi mở game để thử.
Các pack cũ không tự được thay thế. Việc xuất file hoặc build cục bộ chưa công
bố profile mới vào catalogue trực tuyến mà Plus đang tra cứu.

Xem các tệp `*-DEVELOPMENT.md` tương ứng trong thư mục này để biết bảng địa chỉ,
nguồn tác giả, bằng chứng và giới hạn riêng của từng profile.
