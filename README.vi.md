# Fire Emblem Companion Builder 1.2.0

**Đính chính về 15 bản mới:** 10 bản chưa có Battle Analysis hoạt động; 5 bản chỉ kiểm chứng Analysis trong một số ca có điều kiện. Chưa nghiệm thu đầy đủ thao tác trong app companion trên thiết bị thật. CI đạt và số phiên bản 1.0.0 không chứng minh đã hoàn thiện tính năng. Xem [phần còn thiếu và công việc cần làm](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/ANALYSIS-GAPS-1.2.0.vi.md).

Builder 1.2.0 phát hành thêm 15 companion; cả 30 profile đều ở companion 1.0.0.
Bộ đọc cũ giữ nguyên. Các bản mới sửa chọn unit trong màn chỉ số, RNG và Map,
nhận đúng game code/CRC32. Mười Analysis còn khóa; Pokemblem chọn trong companion.
Xem [phạm vi và kiểm chứng](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/RELEASE-1.2.0.md).

## Builder 1.1.0 — mười profile ROM chính xác

Bảy companion tiếng Anh được chốt **1.0.0**, cùng ba companion Việt hóa **1.0.0**. Builder **1.1.0** bổ sung bảy profile cho website và chức năng tạo tự động trong Plus. Sau này chỉ tăng Builder khi thêm profile; sửa companion dùng phiên bản riêng.

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

FE6 T-EN là FE6 gốc; FE6 Việt hóa Remastered là ROM hack trên nền FE8. ROM khác hoặc bản vá khác cần profile riêng. Các profile tiếng Anh dùng UI, Growth và Analysis tiếng Anh. Void hỗ trợ sáu ô skill và Talk; lớp phủ phạm vi trên Map hiện chưa tính skill thay đổi tầm/di chuyển. Xem [phạm vi và kiểm chứng](https://github.com/levi-soft/gba-duo-companion-builder/blob/main/docs/RELEASE-1.1.0.md).

## Cách sử dụng

1. Giải nén toàn bộ kit, mở `index.html` bằng Chrome hoặc Edge.
2. Chọn `.gba`, hoặc ZIP chứa đúng một ROM `.gba`.
3. Bấm **Tạo companion**, chờ chuẩn bị dữ liệu trên máy.
4. Tải **Local ZIP**. Lưu game/state, nhập ZIP vào GBA Duo Plus, gán cho đúng ROM rồi mở lại game.
5. Có thể tải dự án JSON để chỉnh trong [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio).

Không cần tài khoản, mạng, dịch vụ trả phí hay model AI. ROM tối đa 32 MiB, ZIP đầu vào tối đa 64 MiB. Giữ nguyên cấu trúc thư mục khi giải nén.

## Thiết kế và tính năng

Units, Map, Battle Forecast, Growth, đèn RNG và Phân tích dùng chung thiết kế. Bấm portrait để mở Growth; mở Phân tích từ Battle Forecast. Trạng thái thay đổi theo từng lần tính: chờ dữ liệu, đang tính, có kết quả, đã tính EXP nhưng chưa lên cấp, hoặc chưa hỗ trợ.

Tiến độ 100% chỉ báo đã tính xong, không phải độ chính xác 100%. Chỉ số tăng dùng +N thực tế, bao gồm +2 hoặc cao hơn. Phạm vi kiểm chứng ở [FEATURE-CONTRACT.md](FEATURE-CONTRACT.md); chưa cam kết chính xác toàn game.

FE6 bổ sung Mag riêng, skill, Lead và Nói chuyện. FE8 có đặc tính class gốc và bonus Metis’s Tome. Trận hướng dẫn có kịch bản của FE8 được xử lý bằng luồng riêng trong ROM. Phân tích không công bố kết quả trúng/hụt hay EXP thực nhận của trận đang chọn, chỉ hiện EXP có điều kiện và chỉ số giả định nếu lên cấp.

FE6/FE8 chạy hàm ROM trên bản chụp RAM riêng, không sửa RAM, RNG hay save thật. FE7 dùng bộ mô phỏng đã đối chiếu riêng. Các tình huống chưa hỗ trợ sẽ không tạo kết quả giả.

## Kit và đầu ra Local

Kit chứa UI tự thiết kế, font có giấy phép và mã đọc dữ liệu; không chứa ROM, portrait/sprite đã xuất, bảng text game hay save. Ảnh và text chỉ được trích sau khi chọn ROM. Local ZIP/dự án được tạo có chứa tài nguyên từ ROM của bạn, dành cho sử dụng cá nhân; không xem đó là gói công khai không có asset game.

Ảnh được chuẩn bị một lần và lưu trong ZIP, không giải nén portrait/sprite lặp lại khi chơi. Layout/CSS chung nằm trong `theme.js`; profile chỉ bổ sung phần riêng. Có kèm mã nguồn trình biên dịch và nguồn UI. Kit không tự dò cấu trúc của game bất kỳ.

Plus là bản được thử trên thiết bị. ZIP sử dụng API companion hiện có; việc chạy đầy đủ trên bản chính thức và mọi kích thước màn hình chưa được xác nhận. Di chuyển con trỏ cần giả lập hỗ trợ. Cập nhật kit không cần APK mới.

[GBA Duo Plus](https://github.com/levi-soft/gba-duo-plus) · [GBA Duo Studio](https://github.com/levi-soft/gba-duo-studio)

Xem `LICENSE`, `THIRD-PARTY` và `JSZIP-LICENSE.md` cho mã công cụ, font và thư viện. Kit không cấp quyền phân phối lại tài nguyên game hay bản dịch.
