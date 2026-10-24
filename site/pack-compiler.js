var CompanionCompiler = (function(exports) {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	//#region projects/FE-Companion-Public-Kit/compiler-source/tree.js
	var DEVICE_DENSITY = 2.30625;
	var clone = (v) => JSON.parse(JSON.stringify(v));
	function walk(root) {
		const out = [];
		function visit(node, parent, key, index, depth, title) {
			if (!node || typeof node !== "object") return;
			out.push({
				node,
				parent,
				key,
				index,
				depth,
				title
			});
			(node.children ?? []).forEach((c, i) => visit(c, node, "children", i, depth + 1));
			if (node.child) visit(node.child, node, "child", null, depth + 1);
			if (node.template) visit(node.template, node, "template", null, depth + 1, "Mẫu lặp");
			for (const key of ["pages", "tabs"]) (node[key] ?? []).forEach((entry) => visit(entry.child, entry, "child", null, depth + 1, entry.name ?? entry.title));
		}
		visit(root, null, null, null, 0);
		return out;
	}
	//#endregion
	//#region projects/FE-Companion-Public-Kit/compiler-source/skins.js
	var hasSkin = (skin) => Boolean(skin && (skin.normal || skin.pressed || skin.selected));
	function compileSkins(project) {
		const layout = clone(project.layout), files = { ...project.files };
		const rules = [];
		let sequence = 0;
		function build(skin, selector, button = null) {
			if (!hasSkin(skin)) return;
			const token = `studio-image-${++sequence}`;
			if (button) {
				button.class = [button.class, token].filter(Boolean).join(" ");
				selector = "." + token;
				if (button.style && typeof button.style === "object") {
					for (const key of [
						"background",
						"background-image",
						"background-size",
						"background-position",
						"background-repeat"
					]) if (button.style[key] != null) {
						rules.push(`${selector} { ${key}: ${button.style[key]}; }`);
						delete button.style[key];
					}
				}
				if (skin.showLabel === false || skin.showLabel == null) button.text = "";
			}
			const size = (n) => `${Number((n / DEVICE_DENSITY).toFixed(6))}px`;
			const props = [
				"background-repeat: no-repeat",
				"background-position: center",
				`background-size: ${skin.fit === "stretch" ? "100% 100%" : skin.fit === "cover" ? "cover" : "contain"}`
			];
			if (skin.transparentBackground !== false) props.push("background-color: transparent");
			if (Number(skin.width) > 0) props.push(`width: ${size(Number(skin.width))}`, "flex-shrink: 0");
			if (Number(skin.height) > 0) props.push(`height: ${size(Number(skin.height))}`);
			if (!button && (skin.showLabel === false || skin.showLabel == null)) props.push("color: transparent");
			rules.push(`${selector} { ${props.join("; ")}; }`);
			if (button) rules.push(`${selector}:pressed { opacity: 1; }`);
			for (const state of [
				"normal",
				"selected",
				"pressed"
			]) {
				const source = skin[state];
				if (!source) continue;
				if (!Object.hasOwn(files, source)) throw new Error(`Thiếu ảnh cho trạng thái ${state}: ${source}`);
				const ext = source.split(".").pop().toLowerCase();
				if (![
					"png",
					"jpg",
					"jpeg",
					"webp",
					"gif",
					"svg"
				].includes(ext)) throw new Error("Nút hình ảnh cần asset PNG, JPG, WebP, GIF hoặc SVG.");
				const alias = `assets/__studio_skins/${token}-${state}.${ext}`;
				files[alias] = files[source];
				const pseudo = state === "normal" ? "" : state === "selected" ? ":active" : ":pressed";
				rules.push(`${selector}${pseudo} { background-image: url("${alias}"); }`);
			}
			if (!button && (skin.showLabel === false || skin.showLabel == null)) rules.push(`${selector}:active, ${selector}:pressed { color: transparent; }`);
		}
		for (const { node } of walk(layout)) {
			if (node.type === "button") {
				build(node.buttonSkin, "", node);
				delete node.buttonSkin;
			}
			if (node.type === "tabs" && node.tabs.some((t) => hasSkin(t.skin))) {
				const className = `studio-tabgroup-${++sequence}`;
				node.class = [node.class, className].filter(Boolean).join(" ");
				node.tabs.forEach((tab, i) => {
					build(tab.skin, `.${className} > tab-bar > tab:nth-child(${i + 1})`);
					delete tab.skin;
				});
			}
		}
		return {
			layout,
			files,
			css: project.css + (rules.length ? "\n/* Studio: image button states */\n" + rules.join("\n") + "\n" : ""),
			hasSkins: rules.length > 0
		};
	}
	//#endregion
	//#region projects/FE-Companion-Public-Kit/compiler-source/style-schema.js
	var length = (key, label, extra = {}) => ({
		key,
		label,
		kind: "length",
		...extra
	});
	var select = (key, label, options) => ({
		key,
		label,
		kind: "select",
		options
	});
	var text = (key, label, kind = "text") => ({
		key,
		label,
		kind
	});
	var styleFields = [
		{
			name: "Kích thước & vị trí",
			fields: [
				...[
					"width",
					"height",
					"min-width",
					"min-height",
					"max-width",
					"max-height"
				].map((k, i) => length(k, [
					"Chiều rộng",
					"Chiều cao",
					"Rộng tối thiểu",
					"Cao tối thiểu",
					"Rộng tối đa",
					"Cao tối đa"
				][i], {
					percent: true,
					auto: true
				})),
				select("position", "Định vị", [
					"static",
					"relative",
					"absolute"
				]),
				...[
					"left",
					"top",
					"right",
					"bottom"
				].map((k, i) => length(k, [
					"Trái (X)",
					"Trên (Y)",
					"Phải",
					"Dưới"
				][i], {
					percent: true,
					auto: true,
					negative: true
				})),
				select("scroll-follow", "Auto scroll", ["none", "end"]),
				select("overflow", "Nội dung tràn", [
					"visible",
					"auto",
					"scroll",
					"hidden"
				])
			]
		},
		{
			name: "Sắp xếp & khoảng cách",
			fields: [
				select("display", "Kiểu bố cục", [
					"flex",
					"grid",
					"stack",
					"none"
				]),
				select("flex-direction", "Hướng", [
					"row",
					"column",
					"row-reverse",
					"column-reverse"
				]),
				select("flex-wrap", "Xuống dòng", [
					"nowrap",
					"wrap",
					"wrap-reverse"
				]),
				select("align-items", "Căn theo trục phụ", [
					"stretch",
					"start",
					"center",
					"end",
					"flex-start",
					"flex-end",
					"baseline"
				]),
				select("justify-content", "Căn theo trục chính", [
					"start",
					"center",
					"end",
					"flex-start",
					"flex-end",
					"space-between",
					"space-around",
					"space-evenly"
				]),
				text("place-items", "Căn trong ô", "pair"),
				text("flex", "Co giãn", "flex"),
				text("grid-template-columns", "Các cột lưới", "columns"),
				length("gap", "Khoảng cách"),
				text("padding", "Lề trong", "sides"),
				text("margin", "Lề ngoài", "sides")
			]
		},
		{
			name: "Viền & bo góc",
			fields: [
				text("border-radius", "Bo bốn góc", "corners"),
				text("border", "Đường viền", "border"),
				text("border-top", "Viền trên", "border"),
				text("border-right", "Viền phải", "border"),
				text("border-bottom", "Viền dưới", "border"),
				text("border-left", "Viền trái", "border"),
				text("border-color", "Màu viền", "color")
			]
		},
		{
			name: "Nền & hình ảnh",
			fields: [
				text("background", "Nền", "background"),
				text("background-color", "Màu nền", "color"),
				text("background-image", "Ảnh / chuyển màu", "image"),
				text("background-size", "Kích thước nền", "background-size"),
				text("background-position", "Vị trí nền"),
				select("background-repeat", "Lặp nền", [
					"no-repeat",
					"repeat",
					"repeat-x",
					"repeat-y"
				]),
				select("image-rendering", "Nội suy ảnh", [
					"auto",
					"pixelated",
					"crisp-edges"
				]),
				select("object-fit", "Khớp ảnh", [
					"contain",
					"cover",
					"fill",
					"none",
					"scale-down"
				]),
				text("accent-color", "Màu thanh chỉ số", "color")
			]
		},
		{
			name: "Chữ",
			fields: [
				text("font-family", "Font chữ", "font"),
				length("font-size", "Cỡ chữ"),
				select("font-weight", "Độ đậm", [
					"normal",
					"bold",
					"100",
					"200",
					"300",
					"400",
					"500",
					"600",
					"700",
					"800",
					"900"
				]),
				text("color", "Màu chữ", "color"),
				length("line-height", "Chiều cao dòng", { auto: true }),
				length("letter-spacing", "Giãn chữ", { negative: true }),
				select("text-align", "Căn chữ", [
					"left",
					"center",
					"right",
					"start",
					"end"
				]),
				select("text-transform", "Chuyển kiểu chữ", [
					"none",
					"uppercase",
					"lowercase",
					"capitalize"
				]),
				text("text-shadow", "Bóng chữ", "text-shadow")
			]
		},
		{
			name: "Hiệu ứng & chuyển động",
			fields: [
				text("box-shadow", "Bóng khung", "shadow"),
				text("opacity", "Độ hiện", "opacity"),
				text("transform", "Biến đổi", "transform"),
				text("transition", "Chuyển tiếp", "transition")
			]
		}
	].flatMap((g) => g.fields);
	[.../* @__PURE__ */ new Set([
		...styleFields.map((f) => f.key),
		"border-width",
		"border-style",
		...[
			"top",
			"right",
			"bottom",
			"left"
		].flatMap((s) => [
			"width",
			"style",
			"color"
		].map((p) => `border-${s}-${p}`)),
		...["padding", "margin"].flatMap((k) => [
			"top",
			"right",
			"bottom",
			"left"
		].map((s) => `${k}-${s}`)),
		...[
			"top-left",
			"top-right",
			"bottom-right",
			"bottom-left"
		].map((s) => `border-${s}-radius`)
	])];
	function styleTargets(node) {
		const targets = [{
			key: "self",
			label: "Thành phần đang chọn",
			selector: ""
		}];
		if (node.type === "tabs") targets.push({
			key: "tab-bar",
			label: "Thanh chứa tab",
			selector: " > tab-bar"
		}, ...node.tabs.map((t, i) => ({
			key: `tab:${t.child.id}`,
			label: `Nút tab ${i + 1} · ${t.title}`,
			selector: ` > tab-bar > tab:nth-child(${i + 1})`
		})), {
			key: "tab-content",
			label: "Khung chứa nội dung tab",
			selector: " > tab-content"
		});
		if (node.type === "bar") targets.push({
			key: "fill",
			label: "Phần tô thanh chỉ số",
			selector: " > fill"
		}, {
			key: "label",
			label: "Chữ trên thanh chỉ số",
			selector: " > label"
		});
		if (node.type === "button") targets.push({
			key: "label",
			label: "Chữ trên nút",
			selector: " > .label"
		});
		if (node.type === "list") targets.push({
			key: "empty",
			label: "Thông báo danh sách trống",
			selector: " > empty"
		});
		return targets;
	}
	//#endregion
	//#region projects/FE-Companion-Public-Kit/compiler-source/style-model.js
	var styleStates = [
		"normal",
		"active",
		"pressed",
		"disabled"
	];
	function compileStyles(project) {
		const layout = clone(project.layout);
		let css = project.css, hasStyles = false;
		let sequence = 0;
		for (const { node } of walk(layout)) {
			if (!node.studioStyles) continue;
			let selector = `#${node.id}`;
			if (node.studioStyles.self && Object.values(node.studioStyles.self).some((s) => Object.keys(s).length)) {
				const token = `studio-state-${++sequence}`;
				node.class = [node.class, token].filter(Boolean).join(" ");
				selector += `.${token}`;
				if (node.style) {
					css += `\n${selector} { ${Object.entries(node.style).map(([k, v]) => `${k}: ${v};`).join(" ")} }\n`;
					delete node.style;
				}
			}
			for (const target of styleTargets(node)) for (const state of styleStates) {
				const values = node.studioStyles[target.key]?.[state];
				if (!values || !Object.keys(values).length) continue;
				const pseudo = state === "normal" ? "" : `:${state}`;
				css += `\n${selector}${target.selector}${pseudo} { ${Object.entries(values).map(([k, v]) => `${k}: ${v};`).join(" ")} }\n`;
				hasStyles = true;
			}
			delete node.studioStyles;
		}
		return {
			...project,
			layout,
			css,
			hasStyles
		};
	}
	//#endregion
	//#region projects/FE-Companion-Public-Kit/compiler-source/assets.js
	var isFontAsset = (path) => /\.(ttf|otf|woff2?)$/i.test(path);
	//#endregion
	//#region projects/FE-Companion-Public-Kit/compiler-source/fonts.js
	var unquote = (value) => value.trim().replace(/^(['"])(.*)\1$/, "$2");
	var fontValue = (family) => /^(sans-serif|serif|monospace)$/.test(family) ? family : JSON.stringify(family);
	function fontCatalog(project) {
		const result = [];
		for (const match of project.css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/@font-face\s*\{([^}]+)\}/gi)) {
			const family = match[1].match(/font-family\s*:\s*([^;]+)/i)?.[1];
			const source = match[1].match(/url\(\s*(['"]?)(.*?)\1\s*\)/i)?.[2];
			if (family) result.push({
				family: unquote(family),
				path: source ? "assets/" + source.replace(/^asset:/, "").replace(/^assets\//, "") : "",
				declared: true
			});
		}
		for (const path of Object.keys(project.files).filter((p) => isFontAsset(p) && !p.startsWith("assets/__studio_fonts/"))) {
			if (result.some((f) => f.path === path)) continue;
			let hash = 2166136261;
			for (const c of path) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
			result.push({
				family: "StudioFont_" + (hash >>> 0).toString(16),
				path,
				declared: false
			});
		}
		return result.filter((f, i, all) => all.findIndex((x) => x.family === f.family) === i);
	}
	function compileFonts(project) {
		const files = { ...project.files };
		let css = project.css, hasFonts = false;
		let sequence = 0;
		for (const { node } of walk(project.layout)) {
			if (node.type !== "tabs" || !node.tabs.some((t) => t.labelFont)) continue;
			const token = `studio-tabfont-${++sequence}`;
			node.class = [node.class, token].filter(Boolean).join(" ");
			node.tabs.forEach((tab, i) => {
				if (tab.labelFont) {
					css += `\n.${token} > tab-bar > tab:nth-child(${i + 1}) { font-family: ${fontValue(tab.labelFont)}; }\n`;
					delete tab.labelFont;
					hasFonts = true;
				}
			});
		}
		const used = css + walk(project.layout).map((r) => r.node.style?.["font-family"] ?? "").join("\n");
		for (const font of fontCatalog(project)) {
			if (font.declared || !used.includes(JSON.stringify(font.family))) continue;
			const path = `__studio_fonts/${font.family}.${font.path.split(".").pop()}`;
			files["assets/" + path] = files[font.path];
			css += `\n@font-face { font-family: ${JSON.stringify(font.family)}; src: url("${path}"); }\n`;
			hasFonts = true;
		}
		return {
			...project,
			files,
			css,
			hasFonts
		};
	}
	//#endregion
	//#region projects/FE-Companion-Public-Kit/compiler-source/compiler.js
	function compileDesign(project) {
		const compiled = compileFonts(compileStyles(compileSkins(project)));
		return {
			...compiled,
			hasEditorMetadata: compiled.hasSkins || compiled.hasFonts || compiled.hasStyles
		};
	}
	//#endregion
	exports.compileDesign = compileDesign;
	return exports;
})({});
