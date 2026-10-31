# Rà soát lại 15 companion sau khi gỡ Builder 1.2.0

> Hồ sơ lịch sử của host Plus đã sửa, không phải nghiệm thu GBA Duo chính thức.
> Bản phát hành lại 31/10/2026 và giới hạn hiện tại được ghi trong [release 1.2.0](RELEASE-1.2.0.md).
> Phần sửa hiện tại áp dụng cho cả 30 pack, bỏ yêu cầu API riêng và radar động.
> Xem [báo cáo thay thế](OFFICIAL-30-COMPANION-FIX-2026-10-30.vi.md).

**Trạng thái: 15/15 pack đã qua chuỗi thao tác ghi dưới đây trên Thor. Chưa phát hành lại.**

Release và tag `v1.2.0` đã được gỡ. GitHub Pages đã trở về Builder 1.1.5 với 15 profile cũ. Các báo cáo thiếu Analysis trong [hồ sơ đính chính](ANALYSIS-GAPS-1.2.0.vi.md) mô tả bản đã gỡ; tài liệu này theo dõi phần triển khai thay thế và bằng chứng mới.

## Phần đã triển khai

- Mười đường Analysis từng bị khóa đã được thay bằng thực thi hàm của đúng ROM trên bản sao RAM. Bộ thực thi giữ trạng thái bus BIOS, xử lý SWI, các pha EXP/lên cấp, gain có dấu và giới hạn chỉ số của ROM. Đối chiếu gồm tám gain và sáu byte RNG cuối.
- Bells, Cerulean, Morrow, Pokemblem và Sun dùng getter tăng trưởng thực tế, có modifier và chế độ tăng trưởng. Biểu đồ tám trục lấy cùng bộ số đã tính xong. Pokemblem tính cả trần ngẫu nhiên; Sun áp dụng giới hạn Mag khi ghi trả kết quả.
- RNG ghi nhận seed khi mở popup. Đổi unit, chuyển Units/Map và giữ popup mở vẫn theo dõi được seed thay đổi. Khi nghiệm thu, game được tạm dừng để so sánh trực tiếp sáu byte RNG trước/sau Analysis; khung hình game phải giữ nguyên.
- Chọn unit được kiểm tra với màn R, enemy inspection, Preparations, Forecast và Map pick. Vùng di chuyển/tấn công đã đối chiếu từng ô với bản đồ game; các getter riêng được chia nhỏ công việc qua nhiều tick.
- Cache theo dõi các byte RAM thực sự được hàm native đọc và context bus đã chụp. Growth giữ kết quả hợp lệ gần nhất khi đang làm mới, đánh dấu cũ, và xóa khi đổi danh tính unit. Lỗi đọc có thể phục hồi khi đầu vào đổi hoặc mở lại popup.
- Pokemblem chạy hàm di chuyển/tấn công của đúng ROM trên RAM riêng khi chọn unit trong companion, kể cả lúc game chưa dựng lưới hoặc chưa bật Danger. Đường dùng lưới game đang sở hữu vẫn được giữ. Điều khiển con trỏ kiểm tra player-phase và bit FreeMU đã xác minh; không tự xác nhận giao chiến.
- Dãy sáu skill giữ cùng hàng với sprite, tên/class và RNG. Đã bỏ bố cục chia thành hai hàng, kiểm tra lại tên dài như Charmander và Bolgo’s Boys. Bảy profile dùng dạng kỹ năng riêng và mười lăm template cũ giữ bố cục của chúng.
- Restrainer của Four Kings dùng giá trị đặc biệt `255`: màn Items và R-help thật hiển thị Atk/Mt `--`. Companion đã sửa riêng cách hiển thị; dữ liệu gốc và tính chiến đấu vẫn dùng byte ROM.
- Map chỉ dựng hình khi tab Map đang hiển thị ở mười bốn profile FE8 mới; hàng đợi Move trên Units vẫn chạy. Cache chỉ giữ đường dẫn tile theo toàn bộ terrain và kích thước, còn unit, con trỏ và phạm vi luôn cập nhật. Đối chiếu 240 tick cho đầu ra trùng khớp; số lệnh Lua trên fixture Cerulean giảm 27,9% khi tắt Danger, 18,8% khi bật. Đây là phép đo offline, không phải tỷ lệ FPS Android.
- Hàng đợi Pokemblem chỉ chụp RAM khi task bắt đầu; dữ liệu phụ thuộc đã xong được nén và cache có giới hạn. Mô phỏng 50 task chờ trong pack đầy đủ giảm heap sau GC từ khoảng 21,6 MiB xuống 7,8 MiB. Tác vụ bị ngắt bỏ toàn bộ trạng thái riêng trước khi tính lại, gồm cả trường hợp cleanup cũng bị ngắt.
- Host tiếp tục công việc companion theo `tickHz` khi paused, kể cả khi giữ phím hướng; game, khung hình và RNG vẫn đứng yên. Giới hạn 1 triệu lệnh/25 ms mỗi tick và 16 MiB Lua không tăng.
- Mỗi pha EXP có tối đa hai lần thử lại khi vượt thời gian/số lệnh, giảm lát công việc 512 → 256 → 128. Tác vụ bị ngắt bị bỏ; lần thử sau dùng cùng RAM/RNG đã chụp, không tiếp tục CPU dở dang. Lỗi ngoài ngân sách và hết số lần thử vẫn báo lỗi. Mười một test mới tái hiện lỗi cũ và kiểm tra giới hạn, đổi đầu vào, constructor và tính độc lập với dự đoán lên cấp.
- Nút Danger OFF của Pokemblem đã được khôi phục: cờ `mapDangerDisabled` là điều kiện hiển thị nút OFF trong UI chung. Trước đó cờ luôn `false` khiến người dùng không bật được tính năng dù bộ tính phạm vi đã hoạt động.
- Pokemblem chỉ chuyển từ avatar sang Pokémon trong đội khi FreeMU thực sự hoạt động, dựa trên bit và ba process của đúng ROM. Chọn Trainer trong chế độ chiến thuật giữ đúng unit sau khi con trỏ game di chuyển và one-shot pick được xóa. Năm test integration mới kiểm tra chuyển context, các process/biên PC, enemy ẩn, màn R và Forecast; lượt kiểm tra trên máy có ca Trainer riêng trước khi chọn Pokémon đối phương.
- Growth của năm profile tùy biến cũng thử lại tối đa hai lần khi native getter/cap vượt ngân sách. Mỗi lần bỏ toàn bộ CPU/shadow dở, chạy lại chuỗi từ cùng RAM và bus context gốc với lát nhỏ hơn. Kết quả hợp lệ được công bố bằng một tham chiếu chung cho rates/caps/dependencies; lỗi khi đang công bố trả về trọn bộ cũ. Mười chín test mới kiểm tra lỗi getter/constructor/cap, dependency đổi, hết ngân sách và công bố bị ngắt. Nếu việc chụp snapshot bị ngắt trước khi có bộ đọc đầy đủ, module báo lỗi an toàn và cần mở lại popup hoặc đổi đầu vào; không chạy CPU với dữ liệu thiếu.
- Dòng chờ Map dùng “Calculating ranges…” để vừa một hàng. Ảnh nghiệm thu được chụp sau khi chỉ số Mov sẵn sàng; Analysis phải giữ trạng thái hoàn tất ít nhất 600 ms, rồi chờ khung hình Compose cập nhật trước khi chụp.
- Hàng đợi Map giữ các kết quả đã hoàn tất khi một tác vụ riêng bị ngắt bởi giới hạn thời gian/số lệnh; mọi CPU/shadow chưa xong bị bỏ. Chỉ các adapter mới bật cách phục hồi này, và kết quả giữ lại vẫn phải qua kiểm tra RAM/bus khi dùng. Lỗi kiểm chứng, ghi dependency, metadata hoặc lỗi khác vẫn xóa toàn bộ cache. Test mô phỏng 13 job với lỗi mỗi lần khởi tạo thứ tư đạt 13/13 ở lượt cập nhật thứ sáu; trước sửa vẫn 0/13 sau 12 lượt. Kiểm tra có cả cleanup bị ngắt và giới hạn cache/snapshot. Đây là test hàng đợi, không phải số tick đo trên Android.

## Host tương thích

Mười bốn profile FE8 trong đợt này yêu cầu host có `gba-bus-context-v1`; năm profile có biểu đồ động yêu cầu thêm `growth-radar-v1`. Pokemblem yêu cầu `fe-map-mode-guard-v1`. Danh sách nguồn nằm trong [runtime/host/profiles.json](../runtime/host/profiles.json).

Mười bốn pack FE8 này dùng manifest format 4. Plus cũ từ chối chúng ngay khi nhập; phiên bản Plus kiểm thử mới cung cấp các API tương ứng. Dark Lord and the Maiden of Light dùng format 2. Format và yêu cầu host được giữ qua xuất/nhập Studio và Builder. APK kiểm thử được cài bằng package audit riêng; các ứng dụng Plus đang có trên máy được giữ nguyên.

## Bằng chứng hiện có

| Lớp kiểm tra | Kết quả tại mốc ghép hiện tại |
|---|---|
| Builder: build và toàn bộ test | 343/343 đạt |
| Plus: toàn bộ unit test Android | 544/544 đạt, không bỏ qua |
| Plus và Plus SS: build Release, R8 và thu gọn tài nguyên | Cả hai đạt; APK unsigned chỉ để kiểm tra build, chưa cài hay phát hành |
| Studio: test, kiểm tra nguồn, Svelte và build | 247/247 đạt; Svelte không lỗi/cảnh báo |
| CPU/SWI trên core thật của app ở Thor | 21/21 ca native đạt |
| Lua sandbox và API ảnh trên Thor | 190 kiểm tra đạt |
| Vùng di chuyển/tấn công của 14 ROM | 150/150 trạng thái native khớp |
| Lưới riêng của Pokemblem | 6/6 context native và 12/12 ca ghép khớp từng ô, RNG không đổi |
| Biểu đồ 7/8 trục trong app thật | Đã chụp và xem ảnh trên Thor |
| Boot tự nhiên bằng app thật | Andaron, Justice, Dark Amulet, Four Kings, Shadow đã có map turn 1 |
| Forecast tự nhiên từ cùng core native v7 | 15/15 ROM, có ảnh game, actor/target, RAM, RNG và chuỗi input |
| Ghép đủ pack và metadata từ bundle Builder | 15/15 tạo được; SHA256 ROM gốc giữ nguyên |
| Rà soát ảnh độc lập của bundle cuối | 51/51 ảnh được mở và xem; 8 header sáu skill giữ một hàng, không tìm thấy lỗi bố cục chặn sử dụng trong phạm vi ảnh |

Các số test được cập nhật khi sửa tiếp lỗi tìm thấy trong nghiệm thu. Bằng chứng native, fixture có thay EXP trong bản sao, ảnh app và kiểm tra UI được ghi riêng. Các ca ở đầu game và fixture biên không xác lập việc đã chơi hết mọi chương hoặc mọi tổ hợp kỹ năng.

## Kết quả trên Thor của bundle cuối

| ROM | Units/Growth | Map/Danger | Pick/R/Down/B | EXP gây sát thương / hạ đối thủ | RNG game |
|---|---|---|---|---|---|
| Fire Emblem: The Shadow of Dawn | Đạt | Đạt | Đạt | 11 / 37 | Không đổi khi tính |
| Pokemblem | Đạt | Đạt | Đạt | 20 / 66 | Không đổi khi tính |
| Cerulean Crescent | Đạt | Đạt | Đạt | 8 / 24 | Không đổi khi tính |
| Fire Emblem: Andaron Saga | Đạt | Đạt | Đạt | 6 / 6 | Không đổi khi tính |
| Bells of Byelen | Đạt | Đạt | Đạt | 8 / 24 | Không đổi khi tính |
| Fire Emblem: Dark Lord and the Maiden of Light | Đạt | Đạt | Đạt | 10 / 32 | Không đổi khi tính |
| Fire Emblem: Dream of Five - Definitive Edition | Đạt | Đạt | Đạt | 10 / 33 | Không đổi khi tính |
| Fire Emblem: Eligor's Spear | Đạt | Đạt | Đạt | 12 / 21 | Không đổi khi tính |
| Fire Emblem: Iron Emblem | Đạt | Đạt | Đạt | 8 / 24 | Không đổi khi tính |
| Fire Emblem: Justice & Pride | Đạt | Đạt | Đạt | 3 / 3 | Không đổi khi tính |
| Fire Emblem: The Dark Amulet | Đạt | Đạt | Đạt | 10 / 30 | Không đổi khi tính |
| Fire Emblem: The Four Kings | Đạt | Đạt | Đạt | 10 / 30 | Không đổi khi tính |
| Fire Emblem: The Lonely Mirror | Đạt | Đạt | Đạt | 10 / 30 | Không đổi khi tính |
| The Morrow's Golden Country | Đạt | Đạt | Đạt | 5 / 11 | Không đổi khi tính |
| The Sun God’s Wrath | Đạt | Đạt | Đạt | 10 / 30 | Không đổi khi tính |

Mỗi pack được nạp hoàn chỉnh từ ZIP thực tế do cùng bundle Builder tạo. Lượt chạy dùng thao tác chạm Units/Map, mở Growth qua portrait, bật/tắt/bật Danger, chọn unit trên roster, phím R → Down → B và đối chiếu Unit pointer của màn R với trạng thái core native. Chỉ số Mov phải sẵn sàng ở từng bước đổi unit. Pokemblem có thêm ca Trainer trong tactical mode và chọn Pokémon đối phương.

Analysis dùng Forecast tự nhiên đã kiểm chứng của đúng ROM, sau đó tạm dừng game. Năm profile Growth native phải hoàn tất cả Growth của actor; kết quả giữ ổn định ít nhất 600 ms. Sáu byte RNG và frame core trước/sau phải giống nhau. Khi nạp seed khác, đèn RNG phải phản ánh đúng seed thực tế, gồm cả ca seed không đổi. Đây là Analysis EXP/lên cấp có điều kiện nếu nhân vật sống sót, không dự đoán hit/miss/crit.

Lượt cuối ghi nhận **16 tick vượt thời gian tạm thời**, đều phục hồi trong giới hạn theo dõi hai giây; không coi dữ liệu cũ là kết quả mới. Không báo rằng host không bao giờ vượt ngân sách. Các đường native có giới hạn số lần thử; lỗi thật hoặc hết số lần thử vẫn báo lỗi an toàn.

Bằng chứng cục bộ giữ riêng trong `reports/full-recheck-20261029`: `FINAL-DEVICE-EVIDENCE.json`, `FINAL-DEVICE-REVIEW.vi.html`, thư mục ảnh `android-audit/flows-cc53ba4f6d8c`, cùng manifest từng ZIP/ROM/state và báo cáo rà soát nguồn/ảnh độc lập. HTML có ảnh trực tiếp, đường dẫn pack và APK kiểm thử tương thích. ROM, state và asset trích xuất không được đưa lên GitHub.

| Artifact | SHA256 |
|---|---|
| Bundle Builder | `cc53ba4f6d8c1c5f462d8a2a7015886f466c67d9d3d0e363764ce08501daa92c` |
| APK audit đã dùng trên Thor | `8da091cc106f10c172ae5ec4617d9bb5e7ddc90779ab553617ae0c4c9e144c04` |
| com.khumam.gbaduo.plus.debug — APK kiểm thử | `d13f1128c1b2be25b0e8e265ade672104900074c4ea4e1f0489be7eb4ce14521` |
| com.khumam.gbaduo.plus.ss.debug — APK kiểm thử | `eb484cf37b07e7e4bbcb4d658bdaba30918b554b5628eac6fb8677ad6d87b585` |

Các APK Plus/Plus SS kiểm thử dùng package `.debug` riêng, không chứa mã trợ giúp audit; chưa được cài bởi lượt này. Các bản Plus/SS đang dùng trên thiết bị được giữ nguyên. Pack FE8 format 4 cần host mới có API tương ứng; Plus cũ từ chối nhập. Các APK Release của Plus và Plus SS đã qua build/R8, vẫn là unsigned để kiểm tra build.

Bản công khai vẫn là Builder **1.1.5**. Chưa tạo lại release/tag, chưa đẩy bản sửa hoặc các artifact này lên GitHub. Các phép thử trên không xác lập rằng đã chơi hết mọi chương, mọi tổ hợp skill, hay mọi hệ thống đặc thù của từng ROM hack.
