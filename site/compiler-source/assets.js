export const isImageAsset = (path) => /\.(png|jpe?g|svg|webp|gif)$/i.test(path);
export const isFontAsset = (path) => /\.(ttf|otf|woff2?)$/i.test(path);

/** Only routes new uploads; existing pack paths are never moved. */
export function assetImportPath(filename) {
  const name = filename.split(/[\\/]/).pop();
  if (!name || name === '.' || name === '..') throw new Error('Tên tệp tài nguyên không hợp lệ.');
  const folder = isImageAsset(name) ? 'images/' : isFontAsset(name) ? 'fonts/' : '';
  return 'assets/' + folder + name;
}
