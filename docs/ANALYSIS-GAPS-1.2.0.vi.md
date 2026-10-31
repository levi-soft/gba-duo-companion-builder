# Đính chính kiểm chứng 15 companion mới trong Builder 1.2.0

> Hồ sơ của bản 1.2.0 đã gỡ. Xem [triển khai và nghiệm thu hiện tại](FULL-FE-RECHECK-2026-10-30.vi.md).

Kết luận đã hoàn tất rà soát toàn bộ 15 companion là quá mức. Có kiểm tra thực
tế cho các bộ đọc và một số luồng chọn unit/Map/RNG, nhưng **10 bản chưa có
Battle Analysis hoạt động**, còn **5 bản chỉ mới kiểm chứng Analysis trong một
số ca có điều kiện**. Chưa nghiệm thu đầy đủ luồng companion trong app trên thiết
bị thật cho cả 15 game. Các số phiên bản đã phát hành không thay thế tiêu chí đó.

## Mười Analysis đang thiếu

Bảng này đối chiếu mã `features.analysis.lua`, metadata và hồ sơ kiểm chứng
hiện có. Đây không phải một lượt chạy native mới hoặc bằng chứng tính năng đã
được sửa.

| Companion | Phần chưa giải quyết | Hồ sơ hiện có |
|---|---|---|
| Andaron Saga | Đường native đọc vùng BIOS ngoài mô hình frozen RAM/ROM đã kiểm chứng | [Chi tiết](ANDARON-SAGA-DEVELOPMENT.md) |
| Justice & Pride | Đường native đọc vùng BIOS ngoài mô hình frozen RAM/ROM đã kiểm chứng | [Chi tiết](JUSTICE-AND-PRIDE-DEVELOPMENT.md) |
| The Dark Amulet | Đường native đọc vùng BIOS ngoài mô hình frozen RAM/ROM đã kiểm chứng | [Chi tiết](THE-DARK-AMULET-DEVELOPMENT.md) |
| The Four Kings | Đường native đọc vùng BIOS ngoài mô hình frozen RAM/ROM đã kiểm chứng | [Chi tiết](THE-FOUR-KINGS-DEVELOPMENT.md) |
| Shadow of Dawn | Đường native đọc vùng BIOS ngoài mô hình frozen RAM/ROM đã kiểm chứng | [Chi tiết](SHADOW-OF-DAWN-DEVELOPMENT.md) |
| Bells of Byelen | Chưa kiểm chứng đầy đủ đường tính EXP/lên cấp của đúng ROM | [Chi tiết](BELLS-OF-BYELEN-DEVELOPMENT.md) |
| Cerulean Crescent | Chưa kiểm chứng đầy đủ đường tính EXP/lên cấp của đúng ROM | [Chi tiết](CERULEAN-CRESCENT-DEVELOPMENT.md) |
| Morrow's Golden Country | Chưa kiểm chứng đầy đủ đường tính EXP/lên cấp của đúng ROM | [Chi tiết](MORROWS-GOLDEN-COUNTRY-DEVELOPMENT.md) |
| Pokemblem | Chưa kiểm chứng đầy đủ đường tính EXP/lên cấp của đúng ROM; điều khiển con trỏ game và lớp phủ theo move cũng đang tắt | [Chi tiết](POKEMBLEM-DEVELOPMENT.md) |
| Sun God's Wrath | Chưa kiểm chứng đầy đủ đường tính EXP/lên cấp của đúng ROM | [Chi tiết](SUN-GODS-WRATH-DEVELOPMENT.md) |

Cả mười module hiện đặt `analysisSupported=false` và không trả kết quả dự đoán.
Kiểm tra cơ chế khóa, thông báo lỗi và xóa kết quả cũ chỉ chứng minh ứng dụng
không đưa ra kết quả chưa được kiểm chứng. Nó **không chứng minh Analysis đã
được triển khai**. Việc quan sát trạng thái RNG là chức năng riêng.

## Năm Analysis có phạm vi hạn chế

Iron Emblem, The Lonely Mirror, Dream of Five, Dark Lord and the Maiden of Light
và Eligor's Spear có fixture EXP/lên cấp thường và gần lên cấp, cùng kiểm tra Lua
native riêng. Chúng chưa chứng minh đúng mọi skill, trang bị, chế độ hoặc kết quả
hit/miss/crit của trận đấu. Chúng cũng chưa hoàn tất nghiệm thu thao tác Analysis
trong app companion trên thiết bị thật.

## Việc còn phải hoàn tất

1. Với từng ROM bị khóa, giải quyết đường thực thi native hoặc mô hình cơ chế
   riêng; đối chiếu EXP và tăng chỉ số với kết quả game thật từ cùng trạng thái.
2. Với cả 15 ROM, có ca thường, lên cấp, không đủ điều kiện nhận EXP và các cơ
   chế riêng có ảnh hưởng; ghi rõ các tổ hợp chưa kiểm chứng.
3. Chạy luồng trong app trên thiết bị thật: chọn unit, đổi unit ở màn chỉ số,
   chọn trên Map, mở/đóng Analysis, thay trạng thái RNG và trở lại game. Kết quả
   test host hoặc Lua độc lập chưa thay cho bước nghiệm thu này.
4. Chỉ báo một tính năng hoàn tất sau khi phần đó hoạt động và có bằng chứng
   tương ứng. Kết quả build, CI, đóng gói và kiểm tra trạng thái khóa được báo
   riêng, không cộng thành kết luận đầy đủ tính năng.

Đợt đính chính này sửa thông tin công khai. **Nó chưa bổ sung Analysis còn thiếu.**
