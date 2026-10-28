# Đóng gói dự án Studio bằng Builder

Luồng này dùng cho companion đã chỉnh sửa hoặc game chưa có trong danh mục
tự động. Dự án cần có bộ đọc dữ liệu do tác giả chuẩn bị; Builder không tự tìm
địa chỉ RAM hoặc tạo bộ đọc cho một game mới.

1. Trong Studio, mở/chỉnh companion rồi vào **Dự án** để khai báo mã game và
   CRC32 của đúng bản ROM đang dùng. Không thay thông tin này để ép một dự án
   dành cho game khác vượt qua bước kiểm tra.
2. Dùng **Lưu dự án** để lấy tệp `.gbastudio.json`.
3. Trong Builder, chọn ROM `.gba` hoặc ZIP chứa đúng một ROM `.gba`.
4. Mở **Dành cho companion tùy chỉnh**, bật **Dùng dự án Studio của tôi**, rồi
   chọn tệp dự án vừa lưu.
5. Chờ **Kiểm tra đầu vào dự án**. Builder hiển thị tên/phiên bản gói, ROM,
   kích thước thiết kế, nguồn dữ liệu và số trường/tài nguyên/tệp Lua. Nếu chưa
   khớp, phần báo lỗi hướng dẫn quay lại thiết lập hoặc nguồn dự án trong Studio.
6. Trong **Chọn giao diện**, mặc định là **Giữ giao diện Studio của tôi**. Có
   thể chọn mẫu thẻ nhân vật, bảng chỉ số hoặc thẻ kèm bảng như hướng dẫn dưới.
7. Khi đầu vào và cấu hình đã qua kiểm tra, bấm **Tạo companion**. Tải ZIP, nhập vào GBA Duo
   Plus/Plus SS, gán cho đúng ROM rồi kiểm tra trên thiết bị.

**Chỉ có dữ liệu mẫu** nghĩa là dự án chưa khai báo bộ đọc Lua hoặc trường RAM
native. Builder vẫn cho đóng gói để xem giao diện; ZIP đó không tự có dữ liệu
game trực tiếp. Việc kiểm tra tệp thành công cũng chưa chứng minh Lua chạy đúng,
ảnh/bố cục hiển thị đúng hay dự đoán chỉ số chính xác.

JSON xuất bằng **Xuất cấu hình JSON** trong thư viện khối là tệp cấu hình để
nhập vào Studio. Hãy nạp/chèn khối và dùng **Lưu dự án** trước khi chọn trong
Builder. Nó không thay thế tệp `.gbastudio.json`.

Dự án dùng tính năng sinh Lua computed/graphics/pulse cần dùng **Xuất pack ZIP**
ngay trong Studio. Builder sẽ báo hướng xử lý cho trường hợp này.

Đổi ROM hoặc dự án sẽ bỏ kết quả kiểm tra và liên kết tải cũ để tránh dùng nhầm
cặp tệp. Đổi ngôn ngữ giữ nguyên kết quả kiểm tra hiện tại. Các tệp được đọc và
đóng gói trên máy; luồng này không tải ROM hay dự án lên máy chủ.

## Xem tham chiếu trước khi đóng gói

Mục **Tham chiếu cần kiểm tra** chỉ rõ tên thành phần, thuộc tính và đường dẫn
tệp hoặc trường dữ liệu cần xem lại:

- **Cần sửa:** thiếu ảnh/font cục bộ được ghi trực tiếp hoặc thiếu ảnh skin
  mà trình biên dịch bắt buộc phải có. Builder khóa nút tạo companion.
- **Lưu ý:** trường chưa có trong mẫu/khai báo, nguồn ảnh mẫu trỏ tới tệp chưa
  có hoặc tài nguyên nằm trong thành phần có điều kiện. Vẫn có thể đóng gói.
- **Kiểm tra khi chạy:** trường có thể do Lua tạo hoặc danh sách chưa có dòng
  mẫu đại diện. Cần đối chiếu khi chạy game, chưa thể kết luận bộ đọc bị hỏng.

Builder kiểm tra cả trang chưa mở, dòng mẫu danh sách, nút và URL tài nguyên
trong CSS. Ảnh skin phải có đúng đường dẫn tệp vì cần dùng ngay khi biên dịch,
kể cả nút đang ẩn. Công cụ không tải URL bên ngoài hay chạy Lua trong bước này.
Danh sách hiện tối đa 100 mục, ưu tiên lỗi chặn xuất; tổng số vẫn được giữ.

Sửa tệp hoặc tham chiếu trong Studio rồi lưu/chọn lại dự án. Nếu lỗi chỉ thuộc
giao diện cũ, có thể chọn mẫu giao diện khác trong Builder; báo cáo sẽ kiểm tra
lại bản xuất. Tệp nguồn và ROM của bạn được giữ nguyên.

## Tạo giao diện bằng bộ đọc có sẵn

Sau khi chọn đúng ROM và dự án, mục **Chọn giao diện** có bốn lựa chọn:

- **Giữ giao diện Studio của tôi:** đóng gói bố cục đã chuẩn bị, không dựng lại.
- **Thẻ nhân vật:** chọn trường tên; tùy chọn cấp độ/hạng, nguồn ảnh và thanh
  hiện tại/tối đa. Nhãn có thể nhập bằng tiếng Việt, ví dụ “Đạn” hoặc “Hạng”.
- **Bảng chỉ số:** chọn từ 1 đến 24 dòng theo thứ tự cần hiển thị. Mỗi dòng có
  trường dữ liệu và nhãn riêng. Nhãn tự lấy tên hiển thị của trường nếu còn trống;
  có thể sửa lại. Thiếu trường ở dòng nào, Builder báo rõ dòng đó.
- **Thẻ và bảng chỉ số:** ghép hai phần trên trong cùng bản xuất.

Các lựa chọn lấy từ trường chữ, số và trạng thái ở phạm vi toàn cục của dự án.
Thanh cần hai trường số khác nhau; nguồn ảnh cần một trường chữ. Không cần gõ
tên trường hay cú pháp binding. Chỉ trường đã được bộ đọc cung cấp mới có thể
trở thành dữ liệu game trực tiếp; khai báo tên/kiểu chưa phải một lần đọc thành
công. Chỉ số `0`, trạng thái `false` và mẫu cũ `---` được giữ nguyên.

Mẫu mới thay **giao diện trong bản xuất**, không sửa tệp nguồn. Builder giữ Lua,
trường RAM, tài nguyên, CSS, dữ liệu mẫu, kích thước và danh tính ROM của dự án.
CSS có selector riêng cho giao diện cũ có thể cần chỉnh trong Studio. Nếu bộ
đọc phụ thuộc vào trạng thái của các trang/nút cũ, cần kiểm tra lại trên game.
Nguồn ảnh do Lua tạo động cũng cần được kiểm chứng trên thiết bị.

Phần này chưa chỉnh mẫu dòng của danh sách lặp hoặc sinh bộ đọc mới; dùng Studio
cho các trường hợp đó. Dự án computed/graphics/pulse vẫn cần xuất ZIP từ Studio.
Khi đang đóng gói, các ô cấu hình bị khóa. Đổi cấu hình sẽ xóa liên kết tải cũ;
đổi ROM/dự án sẽ đặt lại lựa chọn giao diện. Đổi ngôn ngữ không dịch lại những
nhãn bạn đã nhập hoặc làm mất các trường đang chọn.

ZIP mới lưu cả kích thước thiết kế và cấu hình lưới trong metadata của Studio.
Khi mở lại ZIP, Studio khôi phục chúng nếu metadata vẫn khớp với layout/CSS thực
tế. Gói cũ thiếu metadata này giữ kích thước mặc định; không thể tự suy ra khổ
thiết kế ban đầu. Thiết lập này chỉ phục vụ trình soạn thảo, không đổi vùng RAM
hay bắt màn hình giả lập phải dùng một độ phân giải cố định.
