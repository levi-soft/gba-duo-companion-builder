# Fire Emblem Companion Builder 0.9.8

[English — mặc định](README.md)

Một kit ngoại tuyến cho ba ROM Việt hóa chính xác. Mặc định tiếng Anh, có thể đổi sang tiếng Việt. Kit tự chọn profile theo CRC32, không tải ROM lên mạng và không sửa ROM.

| Profile | Mã game / CRC32 | Companion |
| --- | --- | --- |
| FE6 Việt hóa Remastered trên nền FE8 | BE8E / BD53D5F3 | 0.4.17 |
| FE7 Việt hóa | AE7E / 32CD990D | 0.7.16 |
| FE8 Việt hóa | BE8E / 3CD932D7 | 0.6.8 |

Kit từ chối ROM khác. FE6 ở đây là mod Remastered, không phải FE6 gốc.

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